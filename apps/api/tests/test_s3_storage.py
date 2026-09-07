"""
Sentinel NER — Priority 2: AWS S3 Object Storage Unit Tests
Verifies:
1. ObjectStorage abstraction contracts (S3ObjectStorage & LocalObjectStorage).
2. Key sanitization and path traversal prevention (anti-directory escape).
3. SHA-256 cryptographic integrity calculation and tamper detection.
4. AWS S3 adapter with mocked boto3 client (AES256 SSE, metadata, presigned URLs).
5. Error mapping (AccessDenied -> Forbidden, NoSuchKey -> NotFound, transient -> 503).
6. Fail-fast configuration constraints (production forbids local storage backend).
"""

import tempfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from botocore.exceptions import ClientError

from src.core.config import Settings
from src.core.errors import (
    ForbiddenException,
    UpstreamDependencyUnavailableException,
    ValidationException,
)
from src.core.satellite.safety import compute_sha256
from src.core.satellite.storage import (
    LocalObjectStorage,
    S3ObjectStorage,
    validate_storage_key,
)
from src.schemas.satellite import StorageBackendType


class TestStorageKeyValidation:
    def test_valid_keys(self):
        assert validate_storage_key("raw/satellite/sentinel-2/scene1/visual.tif") == "raw/satellite/sentinel-2/scene1/visual.tif"
        assert validate_storage_key("derived/scene1/disp.tif") == "derived/scene1/disp.tif"
        assert validate_storage_key(r"raw\satellite\sentinel-2\scene1\visual.tif") == "raw/satellite/sentinel-2/scene1/visual.tif"
        assert validate_storage_key("reports/analysis1/report.json") == "reports/analysis1/report.json"

    def test_rejects_empty_or_whitespace_keys(self):
        with pytest.raises(ValidationException, match="must be a non-empty string"):
            validate_storage_key("")
        with pytest.raises(ValidationException, match="must be a non-empty string"):
            validate_storage_key(None)  # type: ignore
        with pytest.raises(ValidationException, match="cannot be empty"):
            validate_storage_key("        ")

    def test_rejects_path_traversal(self):
        with pytest.raises(ValidationException, match="Absolute storage keys starting with slashes are forbidden"):
            validate_storage_key("/leading/slash/key.tif")
        with pytest.raises(ValidationException, match="Path traversal detected"):
            validate_storage_key("../escaped.tif")
        with pytest.raises(ValidationException, match="Path traversal detected"):
            validate_storage_key("raw/../../etc/passwd")
        with pytest.raises(ValidationException, match="Path traversal detected"):
            validate_storage_key("raw/./item.tif")


class TestLocalObjectStorage:
    def test_put_get_head_delete_lifecycle(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalObjectStorage(base_dir=Path(tmpdir))
            assert storage.backend_type == StorageBackendType.LOCAL

            key = "scenes/s2_001/b04.tif"
            payload = b"Sentinel-2 Band 4 Red Channel Raster Data"
            expected_hash = compute_sha256(payload)

            # 1. Put object
            meta = storage.put_object(key, payload, expected_sha256=expected_hash)
            assert meta.key == key
            assert meta.size_bytes == len(payload)
            assert meta.sha256 == expected_hash
            assert meta.backend == StorageBackendType.LOCAL

            # 2. Exists
            assert storage.exists(key) is True
            assert storage.exists("nonexistent/key.tif") is False

            # 3. Head object
            head = storage.head_object(key)
            assert head.size_bytes == len(payload)
            assert head.sha256 == expected_hash

            # 4. Get object
            retrieved = storage.get_object(key, expected_sha256=expected_hash)
            assert retrieved == payload

            # 5. Presigned URL
            url = storage.generate_presigned_url(key)
            assert "file://" in url

            # 6. Delete object
            assert storage.delete_object(key) is True
            assert storage.exists(key) is False

    def test_detects_checksum_mismatch_on_put_and_get(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = LocalObjectStorage(base_dir=Path(tmpdir))
            payload = b"Genuine data"
            tampered_hash = "0" * 64

            with pytest.raises(ValidationException, match="Checksum mismatch"):
                storage.put_object("item.tif", payload, expected_sha256=tampered_hash)

            # Put with valid hash
            valid_hash = compute_sha256(payload)
            storage.put_object("item.tif", payload, expected_sha256=valid_hash)

            # Get with wrong expected hash
            with pytest.raises(ValidationException, match="Integrity violation"):
                storage.get_object("item.tif", expected_sha256=tampered_hash)


class TestS3ObjectStorageWithMock:
    def _create_mock_s3_client(self):
        mock_client = MagicMock()
        return mock_client

    def test_s3_put_object_enforces_sse_and_metadata(self):
        mock_client = self._create_mock_s3_client()
        mock_client.put_object.return_value = {"ETag": '"abcdef123456"'}

        storage = S3ObjectStorage(
            bucket="sentinel-test-bucket",
            region="ap-south-1",
            client=mock_client,
        )
        assert storage.backend_type == StorageBackendType.S3

        key = "raw/satellite/sentinel-2-l2a/S2A_20250101/B04.tif"
        payload = b"GeoTIFF Raster Data for S2A B04"
        sha = compute_sha256(payload)

        meta = storage.put_object(key, payload, expected_sha256=sha, content_type="image/tiff")

        assert meta.key == key
        assert meta.bucket == "sentinel-test-bucket"
        assert meta.backend == StorageBackendType.S3
        assert meta.size_bytes == len(payload)
        assert meta.sha256 == sha
        assert meta.etag == "abcdef123456"

        # Verify boto3 call arguments
        mock_client.put_object.assert_called_once_with(
            Bucket="sentinel-test-bucket",
            Key=key,
            Body=payload,
            ContentType="image/tiff",
            ServerSideEncryption="AES256",
            Metadata={"sha256": sha},
        )

    def test_s3_get_object_and_integrity_check(self):
        mock_client = self._create_mock_s3_client()
        payload = b"Genuine S3 Raster Payload"
        sha = compute_sha256(payload)

        mock_body = MagicMock()
        mock_body.read.return_value = payload

        mock_client.get_object.return_value = {
            "Body": mock_body,
            "Metadata": {"sha256": sha},
        }

        storage = S3ObjectStorage(bucket="sentinel-test-bucket", client=mock_client)
        data = storage.get_object("products/disp.tif", expected_sha256=sha)
        assert data == payload

        # Tampered checksum check
        with pytest.raises(ValidationException, match="Integrity violation"):
            storage.get_object("products/disp.tif", expected_sha256="wrong_hash" * 4)

    def test_s3_head_object_and_exists(self):
        mock_client = self._create_mock_s3_client()
        now = datetime.now(timezone.utc)
        mock_client.head_object.return_value = {
            "ContentLength": 1024,
            "ContentType": "image/tiff",
            "ETag": '"hash123"',
            "Metadata": {"sha256": "fake_sha"},
            "LastModified": now,
        }

        storage = S3ObjectStorage(bucket="sentinel-test-bucket", client=mock_client)
        meta = storage.head_object("scene.tif")
        assert meta.size_bytes == 1024
        assert meta.sha256 == "fake_sha"
        assert storage.exists("scene.tif") is True

        # Test non-existent object
        mock_client.head_object.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}},
            "HeadObject",
        )
        assert storage.exists("missing.tif") is False

    def test_s3_error_handling_access_denied(self):
        mock_client = self._create_mock_s3_client()
        mock_client.put_object.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}},
            "PutObject",
        )

        storage = S3ObjectStorage(bucket="sentinel-test-bucket", client=mock_client)
        with pytest.raises(ForbiddenException, match="S3 access denied"):
            storage.put_object("test.tif", b"data")

    def test_s3_error_handling_service_unavailable(self):
        mock_client = self._create_mock_s3_client()
        mock_client.get_object.side_effect = ClientError(
            {"Error": {"Code": "InternalError", "Message": "AWS Transient Error"}},
            "GetObject",
        )

        storage = S3ObjectStorage(bucket="sentinel-test-bucket", client=mock_client)
        with pytest.raises(UpstreamDependencyUnavailableException):
            storage.get_object("test.tif")


class TestStorageProductionConstraints:
    def test_production_rejects_local_storage_backend(self):
        with pytest.raises(ValueError, match="STORAGE_BACKEND='local' is strictly forbidden"):
            Settings(
                APP_ENV="production",
                PERSISTENCE_BACKEND="mongodb",
                MONGODB_URI="mongodb+srv://cluster.mongodb.net/db",
                MONGODB_DB_NAME="sentinel_ner",
                AWS_S3_BUCKET="sentinel-prod-bucket",
                SATELLITE_MODE="production",
                STORAGE_BACKEND="local",
                SECRET_KEY="a" * 32,
            )

    def test_production_rejects_empty_s3_bucket(self):
        with pytest.raises(ValueError, match="AWS_S3_BUCKET is mandatory"):
            Settings(
                APP_ENV="production",
                PERSISTENCE_BACKEND="mongodb",
                MONGODB_URI="mongodb+srv://cluster.mongodb.net/db",
                MONGODB_DB_NAME="sentinel_ner",
                STORAGE_BACKEND="s3",
                AWS_S3_BUCKET="",
                S3_BUCKET_NAME="",
                SATELLITE_MODE="production",
                SECRET_KEY="a" * 32,
            )

    def test_production_rejects_non_production_satellite_mode(self):
        with pytest.raises(ValueError, match="SATELLITE_MODE='synthetic' is forbidden"):
            Settings(
                APP_ENV="production",
                PERSISTENCE_BACKEND="mongodb",
                MONGODB_URI="mongodb+srv://cluster.mongodb.net/db",
                MONGODB_DB_NAME="sentinel_ner",
                STORAGE_BACKEND="s3",
                AWS_S3_BUCKET="sentinel-prod-bucket",
                SATELLITE_MODE="synthetic",
                SECRET_KEY="a" * 32,
            )


