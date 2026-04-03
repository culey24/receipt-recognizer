from abc import ABC, abstractmethod


class StorageInterface(ABC):
    @abstractmethod
    async def save_bytes(self, content: bytes, filename: str, content_type: str | None = None) -> str:
        """Save binary content and return storage key."""

    @abstractmethod
    async def read_bytes(self, file_key: str) -> bytes:
        """Read binary content by storage key."""
