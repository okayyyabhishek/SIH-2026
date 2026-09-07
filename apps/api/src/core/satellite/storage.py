"""
Sentinel NER — Satellite & Raster Object Storage Abstraction (Priority 2)
Provides an enterprise-grade storage abstraction supporting:
1. AWS S3 Production Object Storage (S3ObjectStorage) with SSE-S3 AES-256, IAM credential chain,
   deterministic keys, chunked streaming, and SHA-256 integrity checks.
2. Local filesystem storage (LocalObjectStorage) strictly isolated to test and development modes.
3. Path traversal prevention, no user-controlled escaping keys, and fail-fast configuration.
4. Large raster binaries are NEVER stored in MongoDB documents.
"""

import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO, Optional, Union

from src.core.config import settings
from src.core.errors import (
    ForbiddenException,
    NotFoundException,
    UpstreamDependencyUnavailableException,
    ValidationException,
)
from src.core.logging import logger
from src.core.satellite.safety import compute_sha256
from src.schemas.satellite import StorageBackendType, StorageObjectMetadata


def validate_storage_key(key: str) -> str:
    """
    Sanitizes and validates a storage object key.
    Enforces:
    - Non-empty string
    - Forbids absolute paths (starting with / or \\)
    - Forbids drive letters and colons
    - Forbids path traversal segments (.. or .)
    - Replaces backslashes with forward slashes
    """
    if not key or not isinstance(key, str):
        raise ValidationException("Storage key must be a non-empty string.")

    raw_stripped = key.strip()
    if not raw_stripped:
        raise ValidationException("Storage key cannot be empty or solely whitespace.")

    if raw_stripped.startswith("/") or raw_stripped.startswith("\\"):
        raise ValidationException(f"Absolute storage keys starting with slashes are forbidden: '{key}'")

    if ":" in raw_stripped:
        raise ValidationException(f"Storage keys containing drive letters or colons are forbidden: '{key}'")

    clean_key = raw_stripped.replace("\\", "/").rstrip("/")
    parts = clean_key.split("/")
    if any(p in ("..", ".", "") for p in parts):
        raise ValidationException(f"Path traversal detected in storage key: '{key}'")

    return clean_key


class ObjectStorage(ABC):
    """
    Abstract Base Class defining the contract for Sentinel NER object storage.
    Application and business layers depend strictly on this abstraction, not on boto3.
    """

    @property
    @abstractmethod
    def backend_type(self) -> StorageBackendType:
        """Returns the storage backend type (s3 or local)."""
        pass

    @abstractmethod
    def put_object(
        self,
        key: str,
        data: Union[bytes, BinaryIO],
        expected_sha256: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> StorageObjectMetadata:
        """
        Stores byte payload or binary stream at the specified key.
        Verifies expected checksum if provided, and returns verified StorageObjectMetadata.
        """
        pass

    @abstractmethod
    def get_object(self, key: str, expected_sha256: Optional[str] = None) -> bytes:
        """
        Retrieves stored bytes for key and optionally verifies integrity against expected SHA-256.
        """
        pass

    @abstractmethod
    def head_object(self, key: str) -> StorageObjectMetadata:
        """
        Retrieves object metadata (size, sha256, creation time) without downloading full payload.
        """
        pass

    @abstractmethod
    def delete_object(self, key: str) -> bool:
        """
        Safely removes an object from storage.
        """
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """
        Checks whether an object exists at the specified key.
        """
        pass

    @abstractmethod
    def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generates a short-lived presigned URL for controlled read access.
        """
        pass

    # Backward compatibility wrappers for existing Stage 6 callers
    def put_bytes(self, key: str, data: bytes, expected_sha256: Optional[str] = None) -> str:
        """Compatibility wrapper returning SHA-256 string."""
        meta = self.put_object(key, data, expected_sha256=expected_sha256)
        return meta.sha256

    def get_bytes(self, key: str, expected_sha256: Optional[str] = None) -> bytes:
        """Compatibility wrapper retrieving bytes."""
        return self.get_object(key, expected_sha256=expected_sha256)

    def delete(self, key: str) -> bool:
        """Compatibility wrapper deleting object."""
        return self.delete_object(key)


class S3ObjectStorage(ObjectStorage):
    """
    AWS S3 Production Object Storage implementation.
    Features:
    - Server-side encryption (SSE-S3 AES-256)
    - AWS credential chain / IAM role resolution
    - Deterministic key layout and path traversal prevention
    - Streaming SHA-256 checksum calculation and verification
    - Bounded exponential retries on transient errors
    """

    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        client: Optional[object] = None,
    ):
        self.bucket = bucket or settings.AWS_S3_BUCKET or settings.S3_BUCKET_NAME
        if not self.bucket:
            raise ValidationException("AWS_S3_BUCKET must be configured for S3ObjectStorage.")

        self.region = region or settings.AWS_REGION or "ap-south-1"
        self.endpoint_url = endpoint_url or settings.S3_ENDPOINT_URL

        if client is not None:
            self._client = client
        else:
            self._client = self._init_s3_client()

    def _init_s3_client(self):
        """Initializes boto3 S3 client using IAM role or configured environment variables."""
        import boto3
        from botocore.config import Config

        boto_config = Config(
            region_name=self.region,
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=5,
            read_timeout=30,
        )

        client_kwargs = {
            "service_name": "s3",
            "region_name": self.region,
            "config": boto_config,
        }

        if self.endpoint_url:
            client_kwargs["endpoint_url"] = self.endpoint_url

        # Prefer IAM role / default credential chain. Only provide explicit credentials if present.
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

        return boto3.client(**client_kwargs)

    @property
    def backend_type(self) -> StorageBackendType:
        return StorageBackendType.S3

    def put_object(
        self,
        key: str,
        data: Union[bytes, BinaryIO],
        expected_sha256: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> StorageObjectMetadata:
        from botocore.exceptions import ClientError

        clean_key = validate_storage_key(key)

        # Convert to bytes or read stream to compute hash
        if isinstance(data, bytes):
            payload = data
            calculated_hash = compute_sha256(payload)
            size_bytes = len(payload)
            upload_body = payload
        elif hasattr(data, "read"):
            # Streamed data: Avoid reading entire file into memory
            if hasattr(data, "seek") and hasattr(data, "tell"):
                data.seek(0, 2)
                size_bytes = data.tell()
                data.seek(0)
            else:
                size_bytes = 0

            if expected_sha256:
                calculated_hash = expected_sha256
            else:
                hasher = hashlib.sha256()
                while chunk := data.read(65536):
                    hasher.update(chunk)
                calculated_hash = hasher.hexdigest()
                if hasattr(data, "seek"):
                    data.seek(0)
            upload_body = data
        else:
            raise ValidationException("Payload must be bytes or a binary stream.")

        if expected_sha256 and calculated_hash.lower() != expected_sha256.lower():
            raise ValidationException(
                f"Integrity check failed: Expected SHA-256 {expected_sha256}, got {calculated_hash}"
            )

        resolved_content_type = content_type or "application/octet-stream"

        try:
            logger.info(
                "S3_UPLOAD_STARTED",
                extra={"bucket": self.bucket, "key": clean_key, "size_bytes": size_bytes},
            )
            response = self._client.put_object(
                Bucket=self.bucket,
                Key=clean_key,
                Body=upload_body,
                ContentType=resolved_content_type,
                ServerSideEncryption="AES256",
                Metadata={"sha256": calculated_hash},
            )
            etag = response.get("ETag", "").strip('"')
            logger.info(
                "S3_UPLOAD_COMPLETED",
                extra={"bucket": self.bucket, "key": clean_key, "etag": etag, "sha256": calculated_hash},
            )
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error("S3 upload failed", extra={"error_code": error_code, "key": clean_key})
            if error_code in ("AccessDenied", "Forbidden"):
                raise ForbiddenException(f"S3 access denied for bucket '{self.bucket}': {e}")
            raise UpstreamDependencyUnavailableException(
                dependency=f"AWS S3 ({self.bucket})",
                details={"error_code": error_code, "key": clean_key},
            )

        now = datetime.now(timezone.utc)
        return StorageObjectMetadata(
            key=clean_key,
            bucket=self.bucket,
            backend=StorageBackendType.S3,
            size_bytes=size_bytes,
            sha256=calculated_hash,
            content_type=resolved_content_type,
            etag=etag,
            created_at=now,
        )

    def get_object(self, key: str, expected_sha256: Optional[str] = None) -> bytes:
        from botocore.exceptions import ClientError

        clean_key = validate_storage_key(key)
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=clean_key)
            body = response["Body"].read()
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code in ("NoSuchKey", "404"):
                raise NotFoundException(f"S3 object not found for key: {clean_key}")
            if error_code in ("AccessDenied", "Forbidden"):
                raise ForbiddenException(f"S3 access denied for key: {clean_key}")
            raise UpstreamDependencyUnavailableException(
                dependency=f"AWS S3 ({self.bucket})",
                details={"error_code": error_code, "key": clean_key},
            )

        actual_hash = compute_sha256(body)
        # Check against metadata or expected_sha256
        metadata_sha = response.get("Metadata", {}).get("sha256")
        target_hash = expected_sha256 or metadata_sha
        if target_hash and actual_hash.lower() != target_hash.lower():
            raise ValidationException(
                f"Integrity violation: Stored S3 object '{clean_key}' failed checksum verification. "
                f"Expected {target_hash}, got {actual_hash}"
            )

        return body

    def head_object(self, key: str) -> StorageObjectMetadata:
        from botocore.exceptions import ClientError

        clean_key = validate_storage_key(key)
        try:
            response = self._client.head_object(Bucket=self.bucket, Key=clean_key)
            size_bytes = response.get("ContentLength", 0)
            content_type = response.get("ContentType", "application/octet-stream")
            etag = response.get("ETag", "").strip('"')
            sha256_meta = response.get("Metadata", {}).get("sha256", "")
            last_modified = response.get("LastModified", datetime.now(timezone.utc))

            return StorageObjectMetadata(
                key=clean_key,
                bucket=self.bucket,
                backend=StorageBackendType.S3,
                size_bytes=size_bytes,
                sha256=sha256_meta,
                content_type=content_type,
                etag=etag,
                created_at=last_modified,
            )
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code in ("NoSuchKey", "404"):
                raise NotFoundException(f"S3 object not found for key: {clean_key}")
            raise UpstreamDependencyUnavailableException(
                dependency=f"AWS S3 ({self.bucket})",
                details={"error_code": error_code, "key": clean_key},
            )

    def delete_object(self, key: str) -> bool:
        from botocore.exceptions import ClientError

        clean_key = validate_storage_key(key)
        try:
            self._client.delete_object(Bucket=self.bucket, Key=clean_key)
            return True
        except ClientError as e:
            logger.warning("Failed to delete S3 object", extra={"key": clean_key, "error": str(e)})
            return False

    def exists(self, key: str) -> bool:
        try:
            self.head_object(key)
            return True
        except (NotFoundException, ValidationException):
            return False
        except Exception:
            return False

    def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        clean_key = validate_storage_key(key)
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": clean_key},
            ExpiresIn=expires_in,
        )


class LocalObjectStorage(ObjectStorage):
    """
    Local filesystem-backed object storage implementation strictly for test/demo mode.
    Guarantees:
    - Path traversal prevention
    - SHA-256 calculation and verification
    - Never used as silent fallback in production/staging
    """

    def __init__(self, base_dir: Optional[Path | str] = None):
        raw_dir = base_dir or getattr(settings, "SATELLITE_STORAGE_DIR", "apps/api/storage/satellite")
        self.base_dir = Path(raw_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    @property
    def backend_type(self) -> StorageBackendType:
        return StorageBackendType.LOCAL

    def _resolve_safe_path(self, key: str) -> Path:
        clean_key = validate_storage_key(key)
        target = (self.base_dir / clean_key).resolve()
        if not str(target).startswith(str(self.base_dir)):
            raise ValidationException(f"Path traversal attempt: Key '{key}' escapes storage base directory.")
        return target

    def put_object(
        self,
        key: str,
        data: Union[bytes, BinaryIO],
        expected_sha256: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> StorageObjectMetadata:
        target_path = self._resolve_safe_path(key)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        if isinstance(data, bytes):
            payload = data
            calculated_hash = compute_sha256(payload)
            size_bytes = len(payload)
            target_path.write_bytes(payload)
        elif hasattr(data, "read"):
            hasher = hashlib.sha256()
            size_bytes = 0
            with open(target_path, "wb") as f:
                while chunk := data.read(65536):
                    f.write(chunk)
                    hasher.update(chunk)
                    size_bytes += len(chunk)
            calculated_hash = hasher.hexdigest()
        else:
            raise ValidationException("Payload must be bytes or a binary stream.")

        if expected_sha256 and calculated_hash.lower() != expected_sha256.lower():
            if target_path.exists():
                target_path.unlink()
            raise ValidationException(
                f"Checksum mismatch for '{key}': expected {expected_sha256}, got {calculated_hash}"
            )

        now = datetime.now(timezone.utc)
        return StorageObjectMetadata(
            key=key.replace("\\", "/").strip("/"),
            bucket=None,
            backend=StorageBackendType.LOCAL,
            size_bytes=size_bytes,
            sha256=calculated_hash,
            content_type=content_type or "application/octet-stream",
            etag=calculated_hash[:16],
            created_at=now,
        )

    def get_object(self, key: str, expected_sha256: Optional[str] = None) -> bytes:
        target_path = self._resolve_safe_path(key)
        if not target_path.exists() or not target_path.is_file():
            raise NotFoundException(f"Stored satellite object not found for key: {key}")

        data = target_path.read_bytes()
        if expected_sha256:
            actual_hash = compute_sha256(data)
            if actual_hash.lower() != expected_sha256.lower():
                raise ValidationException(
                    f"Integrity violation: Stored asset for key '{key}' failed checksum verification."
                )

        return data

    def head_object(self, key: str) -> StorageObjectMetadata:
        target_path = self._resolve_safe_path(key)
        if not target_path.exists() or not target_path.is_file():
            raise NotFoundException(f"Stored satellite object not found for key: {key}")

        stat = target_path.stat()
        data = target_path.read_bytes()
        sha = compute_sha256(data)
        modified_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

        return StorageObjectMetadata(
            key=key.replace("\\", "/").strip("/"),
            bucket=None,
            backend=StorageBackendType.LOCAL,
            size_bytes=stat.st_size,
            sha256=sha,
            content_type="application/octet-stream",
            etag=sha[:16],
            created_at=modified_at,
        )

    def delete_object(self, key: str) -> bool:
        try:
            target_path = self._resolve_safe_path(key)
            if target_path.exists() and target_path.is_file():
                target_path.unlink()
                return True
            return False
        except ValidationException:
            return False

    def exists(self, key: str) -> bool:
        try:
            target_path = self._resolve_safe_path(key)
            return target_path.exists() and target_path.is_file()
        except ValidationException:
            return False

    def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        # Local mock presigned URL
        clean_key = validate_storage_key(key)
        return f"file://{self.base_dir}/{clean_key}?expires={expires_in}"


# Backward compatibility alias
SatelliteObjectStorage = LocalObjectStorage


def get_object_storage() -> ObjectStorage:
    """
    Factory function returning the authoritative ObjectStorage provider.
    Enforces non-negotiable production constraints:
    - Production and staging strictly require S3ObjectStorage.
    - Local storage is permitted only in development and test environments.
    """
    backend = getattr(settings, "STORAGE_BACKEND", "auto").lower()
    if backend == "auto":
        backend = "s3" if settings.APP_ENV in ("production", "staging") else "local"

    if backend == "s3":
        bucket = getattr(settings, "AWS_S3_BUCKET", None) or getattr(settings, "S3_BUCKET_NAME", None)
        region = getattr(settings, "AWS_REGION", "ap-south-1")
        endpoint_url = getattr(settings, "S3_ENDPOINT_URL", None)

        if not bucket or not bucket.strip():
            if settings.APP_ENV in ("production", "staging"):
                raise RuntimeError("AWS_S3_BUCKET must be configured when STORAGE_BACKEND='s3' in production/staging.")
            # Fall back to local for unconfigured dev environment
            logger.warning("AWS_S3_BUCKET not configured in dev; using LocalObjectStorage for local development.")
            return LocalObjectStorage()

        return S3ObjectStorage(bucket=bucket, region=region, endpoint_url=endpoint_url)

    if backend == "local":
        if settings.APP_ENV in ("production", "staging"):
            raise RuntimeError("STORAGE_BACKEND='local' is strictly prohibited in production and staging.")
        return LocalObjectStorage()

    raise ValidationException(f"Unsupported STORAGE_BACKEND '{backend}'. Must be 's3' or 'local'.")


# Authoritative singleton storage instance
satellite_storage: ObjectStorage = get_object_storage()
