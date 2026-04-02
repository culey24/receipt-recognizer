from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import ValidationError

from src.models.invoice_schema import OCRExtractResponse, OCRInvoiceData
from src.ocr.ocr_engine import extract_invoice_data

router = APIRouter(prefix="/api/v1/ocr", tags=["ocr"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/extract", response_model=OCRExtractResponse)
async def extract_invoice(file: UploadFile = File(...)) -> OCRExtractResponse:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WEBP images are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        raw_data, model_used = await extract_invoice_data(image_bytes=image_bytes, mime_type=file.content_type)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    try:
        data = OCRInvoiceData.model_validate(raw_data)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f"Model output did not match schema: {exc}") from exc

    return OCRExtractResponse(success=True, model_used=model_used, data=data)
