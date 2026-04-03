import asyncio
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import boto3
from botocore.exceptions import ClientError

from src.storage.base import StorageInterface


class MinIOStorage(StorageInterface):
    def __init__(
        self,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str,
    ) -> None:
        self.bucket = bucket
        self.region = region
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )
        self._bucket_checked = False

    async def save_bytes(self, content: bytes, filename: str, content_type: str | None = None) -> str:
        await self._ensure_bucket_exists()

        suffix = Path(filename).suffix.lower() or ".bin"
        key = f"{uuid4().hex}{suffix}"
        await asyncio.to_thread(
            self.client.put_object,
            Bucket=self.bucket,
            Key=key,
            Body=BytesIO(content),
            ContentType=content_type or "application/octet-stream",
        )
        return key

    async def read_bytes(self, file_key: str) -> bytes:
        await self._ensure_bucket_exists()

        def _read() -> bytes:
            response = self.client.get_object(Bucket=self.bucket, Key=file_key)
            return response["Body"].read()

        try:
            return await asyncio.to_thread(_read)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in {"NoSuchKey", "404"}:
                raise FileNotFoundError(f"MinIO key not found: {file_key}") from exc
            raise

    async def _ensure_bucket_exists(self) -> None:
        if self._bucket_checked:
            return

        def _ensure() -> None:
            try:
                self.client.head_bucket(Bucket=self.bucket)
            except ClientError:
                if self.region == "us-east-1":
                    self.client.create_bucket(Bucket=self.bucket)
                else:
                    self.client.create_bucket(
                        Bucket=self.bucket,
                        CreateBucketConfiguration={"LocationConstraint": self.region},
                    )

        await asyncio.to_thread(_ensure)
        self._bucket_checked = True
