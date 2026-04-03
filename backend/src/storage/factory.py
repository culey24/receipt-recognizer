from functools import lru_cache

from src.core.config import get_settings
from src.storage.base import StorageInterface
from src.storage.local_storage import LocalStorage
from src.storage.minio_storage import MinIOStorage


@lru_cache
def get_storage() -> StorageInterface:
    settings = get_settings()
    provider = settings.storage_provider.strip().lower()

    if provider == "local":
        return LocalStorage(root_path=settings.local_storage_path)

    if provider == "minio":
        return MinIOStorage(
            endpoint_url=settings.minio_endpoint_url,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            bucket=settings.minio_bucket,
            region=settings.minio_region,
        )

    raise ValueError(f"Unsupported storage provider: {settings.storage_provider}")
