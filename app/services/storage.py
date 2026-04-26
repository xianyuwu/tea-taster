from abc import ABC, abstractmethod
from io import BytesIO

from app.config import PHOTO_DIR, settings


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, key: str, data: bytes, content_type: str = "image/jpeg") -> str:
        """Save data and return the key/filename."""

    @abstractmethod
    async def get_url(self, key: str) -> str:
        """Return URL or path for accessing the file."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete the file."""

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if file exists."""


class LocalStorage(StorageBackend):
    def __init__(self):
        self.base_dir = PHOTO_DIR

    async def save(self, key: str, data: bytes, content_type: str = "image/jpeg") -> str:
        self.base_dir.mkdir(exist_ok=True)
        (self.base_dir / key).write_bytes(data)
        return key

    async def get_url(self, key: str) -> str:
        return f"/data/photos/{key}"

    async def delete(self, key: str) -> None:
        path = self.base_dir / key
        if path.exists():
            path.unlink()

    async def exists(self, key: str) -> bool:
        return (self.base_dir / key).exists()


class S3Storage(StorageBackend):
    def __init__(self):
        import boto3
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint or None,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region or "us-east-1",
        )
        self._bucket = settings.s3_bucket
        self._public_url = settings.s3_public_url.rstrip("/") if settings.s3_public_url else None

    async def save(self, key: str, data: bytes, content_type: str = "image/jpeg") -> str:
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=BytesIO(data),
            ContentType=content_type,
        )
        return key

    async def get_url(self, key: str) -> str:
        if self._public_url:
            return f"{self._public_url}/{key}"
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=3600,
        )

    async def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)

    async def exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except Exception:
            return False


def get_storage() -> StorageBackend:
    if settings.storage_type == "s3":
        return S3Storage()
    return LocalStorage()
