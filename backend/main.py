import logging
from contextlib import asynccontextmanager

from arq.connections import create_pool
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from src.api.cases import router as cases_router
from src.api.emission import router as emission_router
from src.api.jobs import router as jobs_router
from src.api.ocr import router as ocr_router
from src.core.config import get_redis_settings, get_settings
from src.services.emission_lookup import EmissionFactorLookupService

LOGGER = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.redis = await create_pool(get_redis_settings(settings))
    LOGGER.info("Connected to Redis at %s:%s", settings.redis_host, settings.redis_port)

    app.state.mongo_client = AsyncIOMotorClient(settings.mongo_uri)
    app.state.mongo_db = app.state.mongo_client[settings.mongo_db_name]
    await app.state.mongo_db.command("ping")
    app.state.jobs_collection = app.state.mongo_db[settings.mongo_jobs_collection]
    app.state.cases_collection = app.state.mongo_db[settings.mongo_cases_collection]
    app.state.fuel_mapping_collection = app.state.mongo_db[settings.mongo_fuel_mapping_collection]
    app.state.emission_factor_collection = app.state.mongo_db[settings.mongo_emission_factor_collection]
    await app.state.jobs_collection.create_index("job_id", unique=True)
    await app.state.jobs_collection.create_index("updated_at")
    await app.state.jobs_collection.create_index("case_id")
    await app.state.cases_collection.create_index("case_id", unique=True)
    await app.state.cases_collection.create_index("updated_at")
    app.state.emission_lookup = EmissionFactorLookupService(
        fuel_mapping_collection=app.state.fuel_mapping_collection,
        emission_factor_collection=app.state.emission_factor_collection,
    )
    await app.state.emission_lookup.ensure_seed_data()
    LOGGER.info("Connected to MongoDB: %s", settings.mongo_uri)

    try:
        yield
    finally:
        redis = getattr(app.state, "redis", None)
        if redis is not None:
            await redis.aclose()
        mongo_client = getattr(app.state, "mongo_client", None)
        if mongo_client is not None:
            mongo_client.close()


app = FastAPI(title="Receipt Recognizer OCR API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(ocr_router)
app.include_router(jobs_router)
app.include_router(emission_router)
app.include_router(cases_router)
