from arq.connections import RedisSettings
from motor.motor_asyncio import AsyncIOMotorClient

from src.core.config import get_redis_settings, get_settings
from src.jobs.repository import JobRepository
from src.models.invoice_schema import OCRExtractResponse, OCRInvoiceData
from src.models.job_schema import JobStatus
from src.ocr.ocr_engine import extract_invoice_data
from src.services.calculation import calculate_see
from src.storage.factory import get_storage
from src.utils.logger import setup_logger

LOGGER = setup_logger("arq-worker")


async def on_startup(ctx: dict) -> None:
    settings = get_settings()
    mongo_client = AsyncIOMotorClient(settings.mongo_uri)
    mongo_db = mongo_client[settings.mongo_db_name]
    ctx["mongo_client"] = mongo_client
    ctx["jobs_collection"] = mongo_db[settings.mongo_jobs_collection]


async def on_shutdown(ctx: dict) -> None:
    mongo_client = ctx.get("mongo_client")
    if mongo_client is not None:
        mongo_client.close()


async def process_ocr_job(ctx: dict, job_id: str) -> None:
    collection = ctx["jobs_collection"]
    repo = JobRepository(collection=collection)

    job = await repo.get(job_id)
    if job is None:
        LOGGER.error("Job not found: %s", job_id)
        return

    await repo.update(job_id, status=JobStatus.pending, error_message=None)

    try:
        storage = get_storage()
        image_bytes = await storage.read_bytes(job.file_key)

        raw_data, model_used = await extract_invoice_data(image_bytes=image_bytes, mime_type=job.content_type)
        data = OCRInvoiceData.model_validate(raw_data)

        calculation = calculate_see(
            precursors_emissions=data.precursors_emissions,
            indirect_emissions=data.indirect_emissions,
            direct_emissions=data.direct_emissions,
            total_product_output=data.product_output_quantity,
        )
        result = OCRExtractResponse(
            success=True,
            model_used=model_used,
            data=data,
            calculation=calculation,
        )
        await repo.update(
            job_id,
            status=JobStatus.completed,
            result=result,
            error_message=None,
            model_used=model_used,
        )
    except Exception as exc:  # noqa: BLE001
        LOGGER.exception("Job %s failed", job_id)
        await repo.update(
            job_id,
            status=JobStatus.failed,
            result=None,
            error_message=str(exc),
            model_used=None,
        )


class WorkerSettings:
    functions = [process_ocr_job]
    on_startup = on_startup
    on_shutdown = on_shutdown
    redis_settings: RedisSettings = get_redis_settings(get_settings())
    max_tries = 1
