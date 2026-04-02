from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    ocr_provider: str = "openrouter"
    openrouter_api_key: str
    openrouter_model: str = "nvidia/nemotron-nano-12b-v2-vl:free"
    openrouter_models: str = ""
    openrouter_auto_fallback: bool = True
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_site_url: str = "http://localhost:5173"
    openrouter_site_name: str = "CBAM OCR Local"

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8")


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
