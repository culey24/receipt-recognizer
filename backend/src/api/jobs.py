from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse

from src.cases.repository import CaseRepository
from src.core.config import get_settings
from src.jobs.repository import JobRepository
from src.models.invoice_schema import CalculationStatus, EmissionOverrideRequest, OCRExtractResponse
from src.models.job_schema import DocumentType, OCRJob, OCRJobResponse, JobStatus
from src.services.calculation import calculate_see
from src.services.document_enrichment import enrich_for_document_type
from src.storage.factory import get_storage

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _to_response(job: OCRJob) -> OCRJobResponse:
    return OCRJobResponse(
        job_id=job.job_id,
        status=job.status,
        error_code=job.error_code,
        document_type=job.document_type,
        case_id=job.case_id,
        file_name=job.file_name,
        content_type=job.content_type,
        created_at=job.created_at,
        updated_at=job.updated_at,
        model_used=job.model_used,
        result=job.result,
        error_message=job.error_message,
    )


def _require_redis(request: Request):
    redis = getattr(request.app.state, "redis", None)
    if redis is None:
        raise HTTPException(status_code=503, detail="Redis is not connected. Start Redis and retry.")
    return redis


def _get_repo(request: Request) -> JobRepository:
    collection = getattr(request.app.state, "jobs_collection", None)
    if collection is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected. Start Mongo and retry.")
    return JobRepository(collection=collection)


def _get_lookup(request: Request):
    lookup = getattr(request.app.state, "emission_lookup", None)
    if lookup is None:
        raise HTTPException(status_code=503, detail="Emission lookup service is not ready")
    return lookup


def _get_case_repo(request: Request) -> CaseRepository:
    collection = getattr(request.app.state, "cases_collection", None)
    if collection is None:
        raise HTTPException(status_code=503, detail="MongoDB cases collection is not connected")
    return CaseRepository(collection=collection)


@router.post("", status_code=202, response_model=OCRJobResponse)
async def create_job(
    request: Request,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(default=DocumentType.fuel_invoice),
    case_id: str | None = Form(default=None),
) -> OCRJobResponse:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WEBP images are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    redis = _require_redis(request)
    repo = _get_repo(request)
    case_repo = _get_case_repo(request)
    storage = get_storage()

    if case_id is not None and case_id.strip() == "":
        case_id = None
    if case_id is None:
        created_case = await case_repo.create()
        case_id = created_case.case_id
    else:
        existing_case = await case_repo.get(case_id)
        if existing_case is None:
            raise HTTPException(status_code=404, detail="Case not found")

    file_key = await storage.save_bytes(
        content=image_bytes,
        filename=file.filename or "upload.bin",
        content_type=file.content_type,
    )

    job = OCRJob(
        job_id=uuid4().hex,
        status=JobStatus.pending,
        error_code=JobStatus.pending,
        document_type=document_type,
        case_id=case_id,
        file_key=file_key,
        file_name=file.filename or "upload.bin",
        content_type=file.content_type,
    )

    await repo.save(job)

    enqueued = await redis.enqueue_job("process_ocr_job", job.job_id)
    if enqueued is None:
        raise HTTPException(status_code=500, detail="Failed to enqueue job")

    return _to_response(job)


@router.get("", response_model=list[OCRJobResponse])
async def list_jobs(request: Request, limit: int = Query(default=20, ge=1, le=100)) -> list[OCRJobResponse]:
    repo = _get_repo(request)
    jobs = await repo.list_jobs(limit=limit)
    return [_to_response(job) for job in jobs]


@router.get("/{job_id}", response_model=OCRJobResponse)
async def get_job(request: Request, job_id: str) -> OCRJobResponse:
    repo = _get_repo(request)
    job = await repo.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_response(job)


@router.post("/{job_id}/recalculate", response_model=OCRJobResponse)
async def recalculate_job(
    request: Request,
    job_id: str,
    override: EmissionOverrideRequest,
) -> OCRJobResponse:
    repo = _get_repo(request)
    case_repo = _get_case_repo(request)
    job = await repo.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.result is None:
        raise HTTPException(status_code=400, detail="Job result is not available yet")

    lookup = _get_lookup(request)
    settings = get_settings()
    enrichment = await enrich_for_document_type(
        data=job.result.data,
        document_type=job.document_type,
        emission_lookup=lookup,
        grid_emission_factor=settings.grid_emission_factor_vn,
    )
    enriched_data, calculation = calculate_see(
        data=enrichment.data,
        override=override,
        source=enrichment.source,
        fuel_type_mapped=enrichment.fuel_type_mapped,
        direct_emission_factor=enrichment.direct_emission_factor,
    )
    updated_result = OCRExtractResponse(
        success=True,
        model_used=job.result.model_used,
        data=enriched_data,
        calculation=calculation,
    )
    updated_status = JobStatus.failed if calculation.status == CalculationStatus.failed else JobStatus.completed
    updated = await repo.update(
        job_id,
        status=updated_status,
        result=updated_result,
        error_message=calculation.reason if updated_status == JobStatus.failed else None,
        model_used=job.model_used,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if updated.case_id is not None:
        await case_repo.touch(updated.case_id)
    return _to_response(updated)


@router.get("/{job_id}/image")
async def get_job_image(request: Request, job_id: str):
    repo = _get_repo(request)
    job = await repo.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    storage = get_storage()
    try:
        content = await storage.read_bytes(job.file_key)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return StreamingResponse(BytesIO(content), media_type=job.content_type)
