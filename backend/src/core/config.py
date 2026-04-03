from functools import lru_cache
from pathlib import Path

from arq.connections import RedisSettings
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    # OCR provider configuration
    ocr_provider: str = "openrouter"
    openrouter_api_key: str
    openrouter_model: str = "nvidia/nemotron-nano-12b-v2-vl:free"
    openrouter_models: str = ""
    openrouter_auto_fallback: bool = True
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_site_url: str = "http://localhost:5173"
    openrouter_site_name: str = "CBAM OCR Local"

    # Queue / Redis configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str | None = None
    job_ttl_seconds: int = 86400

    # MongoDB configuration
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "receipt_recognizer"
    mongo_jobs_collection: str = "ocr_jobs"

    # Storage strategy configuration
    storage_provider: str = "local"
    local_storage_path: str = str(BASE_DIR / "data" / "uploads")
    minio_endpoint_url: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "receipt-images"
    minio_region: str = "us-east-1"

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_model_fallback_chain(settings: Settings) -> list[str]:
    models: list[str] = []

    csv_models = [model.strip() for model in settings.openrouter_models.split(",") if model.strip()]
    models.extend(csv_models)

    if settings.openrouter_model.strip():
        models.append(settings.openrouter_model.strip())

    deduped: list[str] = []
    for model in models:
        if model not in deduped:
            deduped.append(model)

    return deduped


def get_redis_settings(settings: Settings) -> RedisSettings:
    return RedisSettings(
        host=settings.redis_host,
        port=settings.redis_port,
        database=settings.redis_db,
        password=settings.redis_password or None,
    )
