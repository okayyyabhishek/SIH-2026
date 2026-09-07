"""
Sentinel NER — Stage 6 Security, SSRF & File Safety Tests
Verifies:
1. SSRF URL allowlisting and private IP resolution blocking.
2. Anti-ZipSlip and decompression bomb protection in satellite archive extraction.
3. Pure Python GeoTIFF raster header validation and dimension limits.
4. Storage key path traversal prevention and SHA-256 checksum tamper detection.
"""

import struct
import tempfile
import zipfile
from pathlib import Path

import pytest

from src.core.errors import ValidationException
from src.core.satellite.lineage import build_synthetic_geotiff_bytes
from src.core.satellite.safety import (
    compute_sha256,
    safe_extract_archive,
    validate_external_url_ssrf,
    validate_raster_file,
)
from src.core.satellite.storage import SatelliteObjectStorage


class TestStage6SecurityAndSSRF:
    def test_ssrf_rejects_insecure_schemes(self):
        with pytest.raises(ValidationException, match="Only HTTPS is permitted"):
            validate_external_url_ssrf("http://dataspace.copernicus.eu/scene.zip")

        with pytest.raises(ValidationException, match="Only HTTPS is permitted"):
            validate_external_url_ssrf("ftp://dataspace.copernicus.eu/scene.zip")

        with pytest.raises(ValidationException, match="Only HTTPS is permitted"):
            validate_external_url_ssrf("file:///etc/passwd")

    def test_ssrf_rejects_untrusted_domains(self):
        with pytest.raises(ValidationException, match="Untrusted satellite domain"):
            validate_external_url_ssrf("https://malicious-external-source.com/product.SAFE.zip")

        with pytest.raises(ValidationException, match="Untrusted satellite domain"):
            validate_external_url_ssrf("https://attacker.org/copernicus.eu/scene.zip")

    def test_ssrf_permits_approved_catalog_domains(self):
        # Must not raise
        validate_external_url_ssrf("https://catalogue.dataspace.copernicus.eu/odata/v1/Products")
        validate_external_url_ssrf("https://earth-search.aws.element84.com/v1/collections")
        validate_external_url_ssrf("https://planetarycomputer.microsoft.com/api/stac/v1/items")

    def test_archive_extraction_rejects_zipslip_traversal(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            malicious_zip = tmp_path / "malicious.zip"
            extract_dir = tmp_path / "extracted"

            # Construct zip containing a path traversal member
            with zipfile.ZipFile(str(malicious_zip), "w") as zf:
                zf.writestr("../escaped_file.txt", b"Exploit payload")

            with pytest.raises(ValidationException, match="Path traversal detected"):
                safe_extract_archive(malicious_zip, extract_dir)

    def test_archive_extraction_rejects_decompression_bomb(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            bomb_zip = tmp_path / "bomb.zip"
            extract_dir = tmp_path / "extracted"

            # Create zip with many files exceeding limit
            with zipfile.ZipFile(str(bomb_zip), "w") as zf:
                for i in range(15):
                    zf.writestr(f"file_{i}.bin", b"A" * 1024)

            # Enforce max 10 files
            with pytest.raises(ValidationException, match="File count exceeds"):
                safe_extract_archive(bomb_zip, extract_dir, max_files=10)

    def test_raster_validator_accepts_valid_geotiff(self):
        valid_tiff = build_synthetic_geotiff_bytes(64, 64)
        info = validate_raster_file(valid_tiff)
        assert info["width"] == 64
        assert info["height"] == 64
        assert info["endian"] == "LITTLE"

    def test_raster_validator_rejects_non_tiff(self):
        fake_data = b"NOT_A_TIFF_HEADER_CONTENT"
        with pytest.raises(ValidationException, match="Unrecognized magic bytes"):
            validate_raster_file(fake_data)

    def test_raster_validator_rejects_oversized_dimensions(self):
        # Create a header with width = 20000 (> 16384)
        header = bytearray(b"II\x2a\x00")
        ifd_offset = 8
        header.extend(struct.pack("<I", ifd_offset))
        num_tags = 2
        ifd = bytearray(struct.pack("<H", num_tags))
        ifd.extend(struct.pack("<HHI I", 256, 4, 1, 20000))  # Width = 20000
        ifd.extend(struct.pack("<HHI I", 257, 4, 1, 100))    # Height = 100
        ifd.extend(struct.pack("<I", 0))

        with pytest.raises(ValidationException, match="exceeds maximum dimension"):
            validate_raster_file(bytes(header + ifd))

    def test_storage_rejects_path_traversal_keys(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = SatelliteObjectStorage(base_dir=Path(tmpdir))

            with pytest.raises(ValidationException, match="Path traversal detected"):
                storage.put_bytes("../escape.tif", b"data")

            with pytest.raises(ValidationException, match="Path traversal detected"):
                storage.get_bytes("nested/../../etc/passwd")

    def test_storage_detects_tampered_payload_checksum(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            storage = SatelliteObjectStorage(base_dir=Path(tmpdir))
            key = "products/scene_001.tif"
            payload = b"Genuine radar observation data"
            real_hash = compute_sha256(payload)

            # Store payload
            storage.put_bytes(key, payload, expected_sha256=real_hash)

            # Tampering test: retrieve with different expected hash
            tampered_hash = "0" * 64
            with pytest.raises(ValidationException, match="Integrity violation"):
                storage.get_bytes(key, expected_sha256=tampered_hash)
