import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import unquote, urlparse

from arq.connections import RedisSettings
from pydantic import AliasChoices, Field, ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


def _redis_tuple_from_url(
    url: str,
    *,
    db_fallback: int,
    password_fallback: str | None,
) -> tuple[str, int, int, str | None, bool]:
    parsed = urlparse(url.strip())
    if not parsed.hostname:
        raise ValueError("redis url missing host")
    path = (parsed.path or "").strip("/")
    db = int(path) if path.isdigit() else db_fallback
    port = parsed.port if parsed.port is not None else 6379
    password = unquote(parsed.password) if parsed.password else password_fallback
    ssl = parsed.scheme == "rediss"
    return parsed.hostname, port, db, password, ssl


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
    # Railway exposes REDISHOST / REDISPORT / REDISPASSWORD / REDIS_URL (see .env.example).
    redis_host: str = Field(default="localhost", validation_alias=AliasChoices("REDIS_HOST", "REDISHOST"))
    redis_port: int = Field(default=6379, validation_alias=AliasChoices("REDIS_PORT", "REDISPORT"))
    redis_db: int = 0
    redis_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices("REDIS_PASSWORD", "REDISPASSWORD"),
    )
    redis_url: str | None = Field(default=None, validation_alias="REDIS_URL")
    redis_ssl: bool = False
    job_ttl_seconds: int = 86400

    # MongoDB configuration
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "receipt_recognizer"
    mongo_jobs_collection: str = "ocr_jobs"
    mongo_cases_collection: str = "ocr_cases"
    mongo_fuel_mapping_collection: str = "fuel_mappings"
    mongo_emission_factor_collection: str = "emission_factors"

    # Storage strategy configuration
    storage_provider: str = "local"
    local_storage_path: str = str(BASE_DIR / "data" / "uploads")
    minio_endpoint_url: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "receipt-images"
    minio_region: str = "us-east-1"
    grid_emission_factor_vn: float = 0.6592
    carbon_price_tickers: str = "CO2.L,^ICEEUA"
    carbon_price_fallback_eur: float | None = None
    fx_rate_ticker: str = "EURVND=X"
    fx_rate_fallback_eur_vnd: float | None = None
    report_storage_path: str = str(BASE_DIR / "data" / "reports")

    # CORS — comma-separated list of allowed origins (added for production deployments)
    # Example: https://my-app.vercel.app,https://my-custom-domain.com
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    @field_validator("redis_port", "redis_db", "job_ttl_seconds", mode="before")
    @classmethod
    def _empty_env_int_uses_default(cls, v: object, info: ValidationInfo) -> object:
        # Railway / dashboards often inject REDIS_PORT="" when referencing unset vars.
        if v != "" and v is not None:
            return v
        defaults = {"redis_port": 6379, "redis_db": 0, "job_ttl_seconds": 86400}
        key = info.field_name
        return defaults[key] if key in defaults else v

    @field_validator("redis_password", mode="before")
    @classmethod
    def _empty_redis_password(cls, v: object) -> object:
        if v == "":
            return None
        return v

    @model_validator(mode="after")
    def _apply_redis_url(self) -> "Settings":
        raw = (self.redis_url or "").strip()
        if not raw:
            return self
        try:
            host, port, db, password, ssl = _redis_tuple_from_url(
                raw, db_fallback=self.redis_db, password_fallback=self.redis_password
            )
        except ValueError:
            return self
        # Mutate in place; returning model_copy() from mode="after" triggers a Pydantic warning.
        object.__setattr__(self, "redis_host", host)
        object.__setattr__(self, "redis_port", port)
        object.__setattr__(self, "redis_password", password)
        object.__setattr__(self, "redis_db", db)
        object.__setattr__(self, "redis_ssl", ssl)
        return self


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
    # Prefer process env so Railway REDISHOST / REDIS_URL always win over a mistaken
    # REDIS_HOST=localhost in Variables or a bundled .env (Settings can lag aliases).
    url = (os.environ.get("REDIS_URL") or "").strip()
    if url:
        try:
            host, port, db, password, ssl = _redis_tuple_from_url(
                url, db_fallback=settings.redis_db, password_fallback=settings.redis_password
            )
        except ValueError:
            pass
        else:
            return RedisSettings(
                host=host, port=port, database=db, password=password or None, ssl=ssl
            )

    rail_host = (os.environ.get("REDISHOST") or "").strip()
    if rail_host:
        port_raw = (os.environ.get("REDISPORT") or os.environ.get("REDIS_PORT") or "").strip()
        port = int(port_raw) if port_raw else 6379
        password = os.environ.get("REDISPASSWORD") or os.environ.get("REDIS_PASSWORD")
        if password == "":
            password = None
        db_raw = (os.environ.get("REDIS_DB") or "").strip()
        db = int(db_raw) if db_raw.isdigit() else settings.redis_db
        return RedisSettings(
            host=rail_host,
            port=port,
            database=db,
            password=password,
            ssl=False,
        )

    return RedisSettings(
        host=settings.redis_host,
        port=settings.redis_port,
        database=settings.redis_db,
        password=settings.redis_password or None,
        ssl=settings.redis_ssl,
    )
