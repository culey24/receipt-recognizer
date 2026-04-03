import asyncio
from pathlib import Path
from uuid import uuid4

from src.storage.base import StorageInterface


class LocalStorage(StorageInterface):
    def __init__(self, root_path: str) -> None:
        self.root = Path(root_path)
        self.root.mkdir(parents=True, exist_ok=True)

    async def save_bytes(self, content: bytes, filename: str, content_type: str | None = None) -> str:
        suffix = Path(filename).suffix.lower() or ".bin"
        key = f"{uuid4().hex}{suffix}"
        target = self.root / key

        await asyncio.to_thread(target.write_bytes, content)
        return key

    async def read_bytes(self, file_key: str) -> bytes:
        source = self.root / file_key
        if source.exists() is False:
            raise FileNotFoundError(f"Local file not found: {file_key}")
        return await asyncio.to_thread(source.read_bytes)
