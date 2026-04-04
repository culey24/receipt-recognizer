from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import ValidationError

from src.core.config import get_settings
from src.models.invoice_schema import OCRExtractResponse, OCRInvoiceData
from src.models.job_schema import DocumentType
from src.ocr.ocr_engine import extract_invoice_data
from src.services.calculation import calculate_see
from src.services.document_enrichment import enrich_for_document_type

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/extract", response_model=OCRExtractResponse)
async def extract_invoice(
    request: Request,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(default=DocumentType.fuel_invoice),
) -> OCRExtractResponse:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WEBP images are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        raw_data, model_used = await extract_invoice_data(
            image_bytes=image_bytes,
            mime_type=file.content_type,
            document_type=document_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    try:
        data = OCRInvoiceData.model_validate(raw_data)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f"Model output did not match schema: {exc}") from exc

    lookup = getattr(request.app.state, "emission_lookup", None)
    if lookup is None:
        raise HTTPException(status_code=503, detail="Emission lookup service is not ready")

    settings = get_settings()
    enrichment = await enrich_for_document_type(
        data=data,
        document_type=document_type,
        emission_lookup=lookup,
        grid_emission_factor=settings.grid_emission_factor_vn,
    )
    enriched_data, calculation = calculate_see(
        data=enrichment.data,
        override=None,
        source=enrichment.source,
        fuel_type_mapped=enrichment.fuel_type_mapped,
        direct_emission_factor=enrichment.direct_emission_factor,
    )
    return OCRExtractResponse(success=True, model_used=model_used, data=enriched_data, calculation=calculation)
