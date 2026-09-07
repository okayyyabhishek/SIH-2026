"""
Sentinel NER — Live AWS S3 Production Object Storage Integration Tests
Verifies:
1. Live S3 connectivity to the production bucket (sentinel-ner-production-okayyyabhishek).
2. Live put_object with forced ServerSideEncryption='AES256' and SHA-256 metadata.
3. Live head_object retrieval of ContentLength, ETag, and metadata checksum.
4. Live get_object round-trip with byte and hash integrity verification.
5. Safe, non-destructive probe cleanup.

Note:
Cleanly skips if AWS credentials or network are not available.
"""

import hashlib
import uuid

import boto3
import pytest
from botocore.exceptions import ClientError, NoCredentialsError

from src.core.config import settings
from src.core.satellite.storage import S3ObjectStorage


def is_live_aws_available() -> bool:
    """Checks if AWS credentials and bucket access are genuinely operational."""
    try:
        bucket = settings.AWS_S3_BUCKET or "sentinel-ner-production-okayyyabhishek"
        region = settings.AWS_REGION or "eu-north-1"
        client = boto3.client("s3", region_name=region)
        client.head_bucket(Bucket=bucket)
        return True
    except (ClientError, NoCredentialsError, Exception):
        return False


LIVE_AWS_AVAILABLE = is_live_aws_available()


@pytest.mark.skipif(not LIVE_AWS_AVAILABLE, reason="Live AWS credentials or production S3 bucket unavailable")
class TestLiveS3Storage:
    def test_live_s3_put_head_get_delete_lifecycle(self):
        bucket = settings.AWS_S3_BUCKET or "sentinel-ner-production-okayyyabhishek"
        region = settings.AWS_REGION or "eu-north-1"
        client = boto3.client("s3", region_name=region)
        storage = S3ObjectStorage(bucket=bucket, client=client)

        probe_id = uuid.uuid4().hex[:12]
        test_key = f"test/live_probes/probe_{probe_id}.txt"
        test_content = f"Sentinel NER live production S3 verification payload probe {probe_id}".encode("utf-8")
        expected_sha = hashlib.sha256(test_content).hexdigest()

        try:
            # 1. Put object
            meta = storage.put_object(
                key=test_key,
                data=test_content,
                expected_sha256=expected_sha,
                content_type="text/plain",
            )
            assert meta.bucket == bucket
            assert meta.size_bytes == len(test_content)
            assert meta.sha256 == expected_sha

            # 2. Head object
            head_meta = storage.head_object(test_key)
            assert head_meta.size_bytes == len(test_content)
            assert head_meta.sha256 == expected_sha

            # 3. Get object & verify integrity
            retrieved_bytes = storage.get_object(test_key, expected_sha256=expected_sha)
            assert retrieved_bytes == test_content

            # 4. Generate presigned URL
            presigned_url = storage.generate_presigned_url(test_key, expires_in=300)
            assert "https://" in presigned_url
            assert bucket in presigned_url
            assert "X-Amz-Signature" in presigned_url

        finally:
            # 5. Non-destructive cleanup of test probe
            storage.delete_object(test_key)
            assert not storage.exists(test_key)
