from io import BytesIO
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse

from src.jobs.repository import JobRepository
from src.models.job_schema import OCRJob, OCRJobResponse, JobStatus
from src.storage.factory import get_storage

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _to_response(job: OCRJob) -> OCRJobResponse:
    return OCRJobResponse(
        job_id=job.job_id,
        status=job.status,
        error_code=job.error_code,
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


@router.post("", status_code=202, response_model=OCRJobResponse)
async def create_job(request: Request, file: UploadFile = File(...)) -> OCRJobResponse:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WEBP images are supported")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    redis = _require_redis(request)
    repo = _get_repo(request)
    storage = get_storage()

    file_key = await storage.save_bytes(
        content=image_bytes,
        filename=file.filename or "upload.bin",
        content_type=file.content_type,
    )

    job = OCRJob(
        job_id=uuid4().hex,
        status=JobStatus.pending,
        error_code=JobStatus.pending,
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
