from arq.connections import RedisSettings
from motor.motor_asyncio import AsyncIOMotorClient

from src.cases.repository import CaseRepository
from src.core.config import get_redis_settings, get_settings
from src.jobs.repository import JobRepository
from src.models.invoice_schema import CalculationStatus, OCRExtractResponse, OCRInvoiceData
from src.models.job_schema import JobStatus
from src.ocr.ocr_engine import extract_invoice_data
from src.services.calculation import calculate_see
from src.services.document_enrichment import enrich_for_document_type
from src.services.emission_lookup import EmissionFactorLookupService
from src.storage.factory import get_storage
from src.utils.logger import setup_logger

LOGGER = setup_logger("arq-worker")


async def on_startup(ctx: dict) -> None:
    settings = get_settings()
    mongo_client = AsyncIOMotorClient(settings.mongo_uri)
    mongo_db = mongo_client[settings.mongo_db_name]
    ctx["mongo_client"] = mongo_client
    ctx["jobs_collection"] = mongo_db[settings.mongo_jobs_collection]
    ctx["cases_collection"] = mongo_db[settings.mongo_cases_collection]
    fuel_mapping_collection = mongo_db[settings.mongo_fuel_mapping_collection]
    emission_factor_collection = mongo_db[settings.mongo_emission_factor_collection]
    ctx["emission_lookup"] = EmissionFactorLookupService(
        fuel_mapping_collection=fuel_mapping_collection,
        emission_factor_collection=emission_factor_collection,
    )
    await ctx["emission_lookup"].ensure_seed_data()


async def on_shutdown(ctx: dict) -> None:
    mongo_client = ctx.get("mongo_client")
    if mongo_client is not None:
        mongo_client.close()


async def process_ocr_job(ctx: dict, job_id: str) -> None:
    collection = ctx["jobs_collection"]
    cases_collection = ctx["cases_collection"]
    emission_lookup = ctx["emission_lookup"]
    repo = JobRepository(collection=collection)
    case_repo = CaseRepository(collection=cases_collection)

    job = await repo.get(job_id)
    if job is None:
        LOGGER.error("Job not found: %s", job_id)
        return

    await repo.update(job_id, status=JobStatus.pending, error_message=None)

    try:
        storage = get_storage()
        image_bytes = await storage.read_bytes(job.file_key)

        raw_data, model_used = await extract_invoice_data(
            image_bytes=image_bytes,
            mime_type=job.content_type,
            document_type=job.document_type,
        )
        data = OCRInvoiceData.model_validate(raw_data)
        settings = get_settings()
        enrichment = await enrich_for_document_type(
            data=data,
            document_type=job.document_type,
            emission_lookup=emission_lookup,
            grid_emission_factor=settings.grid_emission_factor_vn,
        )
        enriched_data, calculation = calculate_see(
            data=enrichment.data,
            override=None,
            source=enrichment.source,
            fuel_type_mapped=enrichment.fuel_type_mapped,
            direct_emission_factor=enrichment.direct_emission_factor,
        )
        result = OCRExtractResponse(
            success=True,
            model_used=model_used,
            data=enriched_data,
            calculation=calculation,
        )
        job_status = JobStatus.failed if calculation.status == CalculationStatus.failed else JobStatus.completed
        await repo.update(
            job_id,
            status=job_status,
            result=result,
            error_message=calculation.reason if job_status == JobStatus.failed else None,
            model_used=model_used,
        )
        if job.case_id is not None:
            await case_repo.touch(job.case_id)
    except Exception as exc:  # noqa: BLE001
        LOGGER.exception("Job %s failed", job_id)
        await repo.update(
            job_id,
            status=JobStatus.failed,
            result=None,
            error_message=str(exc),
            model_used=None,
        )
        if job.case_id is not None:
            await case_repo.touch(job.case_id)


class WorkerSettings:
    functions = [process_ocr_job]
    on_startup = on_startup
    on_shutdown = on_shutdown
    redis_settings: RedisSettings = get_redis_settings(get_settings())
    max_tries = 1
