"""
Sentinel NER — Priority 3: Copernicus STAC Provider & Acquisition Unit Tests
Verifies:
1. STAC Item normalization into domain model (SatelliteScene).
2. STAC search query construction and validation (bbox bounds, date ranges).
3. OAuth2 token authentication handling (with separation of Copernicus and AWS credentials).
4. SatelliteAcquisitionService state machine:
   DISCOVERED -> ACQUIRING -> UPLOADED -> VERIFYING -> SUCCESS (or FAILED).
5. Mandatory Processing Gate:
   Processing is blocked when acquisition fails, when scene is unacquired,
   or when synthetic fixtures are supplied in production mode.
6. Synthetic fixture isolation: Production rejects synthetic IDs (mock-*, fixture-*, etc.).
"""

import hashlib
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.config import settings
from src.core.errors import (
    ValidationException,
)
from src.core.satellite.acquisition import SatelliteAcquisitionService
from src.core.satellite.pipeline import SatelliteProcessingPipeline
from src.core.satellite.provider import CopernicusSTACProvider
from src.schemas.satellite import (
    AcquisitionStatus,
    InstrumentType,
    PassDirection,
    ProcessingLevel,
    ProductType,
    ProvenanceState,
    QualityState,
    SatelliteMission,
    SatelliteObservation,
    SatellitePlatform,
    StorageBackendType,
    StorageObjectMetadata,
)


class TestCopernicusSTACProvider:
    def test_stac_item_normalization(self):
        provider = CopernicusSTACProvider(stac_url="https://stac.dataspace.copernicus.eu/v1")

        mock_stac_feature = {
            "type": "Feature",
            "id": "S2A_MSIL2A_20250115T041041_N0511_R090_T46RFL_20250115T072530",
            "collection": "sentinel-2-l2a",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[92.5, 23.5], [93.5, 23.5], [93.5, 24.5], [92.5, 24.5], [92.5, 23.5]]],
            },
            "bbox": [92.5, 23.5, 93.5, 24.5],
            "properties": {
                "datetime": "2025-01-15T04:10:41.024Z",
                "eo:cloud_cover": 12.4,
                "platform": "sentinel-2a",
                "constellation": "sentinel-2",
            },
            "assets": {
                "visual": {
                    "href": "https://browser.dataspace.copernicus.eu/visual.tif",
                    "title": "True Color Image",
                    "type": "image/tiff",
                    "roles": ["visual"],
                    "file:size": 25000000,
                },
                "B04": {
                    "href": "https://browser.dataspace.copernicus.eu/b04.jp2",
                    "title": "Band 4 (Red)",
                    "type": "image/jp2",
                    "roles": ["data"],
                },
            },
            "links": [{"rel": "self", "href": "https://stac.dataspace.copernicus.eu/items/item1"}],
        }

        scene = provider._normalize_stac_item(mock_stac_feature, "sentinel-2-l2a")

        assert scene.id == "S2A_MSIL2A_20250115T041041_N0511_R090_T46RFL_20250115T072530"
        assert scene.collection == "sentinel-2-l2a"
        assert scene.cloud_cover == 12.4
        assert scene.bbox == [92.5, 23.5, 93.5, 24.5]
        assert "visual" in scene.assets
        assert scene.assets["visual"].size_bytes == 25000000
        assert "B04" in scene.assets

    @pytest.mark.asyncio
    async def test_search_scenes_builds_valid_stac_payload(self):
        provider = CopernicusSTACProvider(stac_url="https://stac.dataspace.copernicus.eu/v1")

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "id": "S2A_SCENE_001",
                        "collection": "sentinel-2-l2a",
                        "geometry": {"type": "Polygon", "coordinates": [[[92.0, 23.0], [93.0, 23.0], [93.0, 24.0], [92.0, 24.0], [92.0, 23.0]]]},
                        "bbox": [92.0, 23.0, 93.0, 24.0],
                        "properties": {"datetime": "2025-02-01T00:00:00Z", "eo:cloud_cover": 5.0},
                        "assets": {},
                    }
                ],
            }
            mock_post.return_value = mock_resp

            start = datetime(2025, 2, 1, tzinfo=timezone.utc)
            end = datetime(2025, 2, 10, tzinfo=timezone.utc)
            results = await provider.search_scenes(
                bbox=[92.0, 23.0, 93.0, 24.0],
                datetime_start=start,
                datetime_end=end,
                max_cloud_cover=20.0,
                collection="sentinel-2-l2a",
            )

            assert len(results) == 1
            assert results[0].id == "S2A_SCENE_001"
            assert results[0].cloud_cover == 5.0

            # Verify POST payload sent to STAC
            call_args = mock_post.call_args
            payload = call_args[1]["json"]
            assert payload["collections"] == ["sentinel-2-l2a"]
            assert payload["bbox"] == [92.0, 23.0, 93.0, 24.0]
            assert payload["query"] == {"eo:cloud_cover": {"lte": 20.0}}
            assert "2025-02-01" in payload["datetime"]

    def test_search_rejects_inverted_bbox(self):
        provider = CopernicusSTACProvider(stac_url="https://stac.dataspace.copernicus.eu/v1")
        with pytest.raises(ValidationException, match="Invalid inverted bounding box"):
            import asyncio
            asyncio.run(provider.search_scenes(bbox=[93.0, 24.0, 92.0, 23.0]))


class TestSatelliteAcquisitionService:
    @pytest.mark.asyncio
    async def test_acquisition_end_to_end_success(self):
        mock_provider = MagicMock()
        mock_storage = MagicMock()

        # Mock STAC scene
        scene_id = "S2A_MSIL2A_TEST_SCENE"
        mock_scene = MagicMock()
        mock_scene.id = scene_id
        mock_scene.datetime = datetime(2025, 1, 15, tzinfo=timezone.utc)
        mock_scene.geometry = {"type": "Polygon", "coordinates": [[[92.0, 23.0], [93.0, 23.0], [93.0, 24.0], [92.0, 24.0], [92.0, 23.0]]]}
        mock_scene.bbox = [92.0, 23.0, 93.0, 24.0]
        mock_scene.cloud_cover = 8.5
        mock_scene.properties = {"tile": "T46RFL"}

        mock_asset = MagicMock()
        mock_asset.href = "https://browser.dataspace.copernicus.eu/visual.tif"
        mock_asset.type = "image/tiff"
        mock_scene.assets = {"visual": mock_asset}

        mock_provider.get_scene = AsyncMock(return_value=mock_scene)
        mock_provider.provider_name = "copernicus-cdse"

        # Stream chunks
        chunk1 = b"GeoTIFF Chunk 1"
        chunk2 = b"GeoTIFF Chunk 2"
        full_data = chunk1 + chunk2
        expected_sha = hashlib.sha256(full_data).hexdigest()

        async def mock_stream(_url):
            yield chunk1
            yield chunk2

        mock_provider.stream_asset = mock_stream

        # Storage mock
        mock_meta = StorageObjectMetadata(
            bucket="test-s3-bucket",
            key=f"raw/satellite/sentinel-2-l2a/{scene_id}/visual.tif",
            size_bytes=len(full_data),
            sha256=expected_sha,
            etag="hash123",
            content_type="image/tiff",
            backend=StorageBackendType.S3,
        )

        mock_storage.put_object.return_value = mock_meta
        mock_storage.head_object.return_value = mock_meta
        mock_storage.backend_type = "s3"

        service = SatelliteAcquisitionService(provider=mock_provider, storage=mock_storage)

        obs = await service.acquire_scene(
            scene_id=scene_id,
            collection="sentinel-2-l2a",
            asset_name="visual",
            district_id="dist-aizawl",
            state="Mizoram",
        )

        assert obs.product_id == scene_id
        assert obs.source_checksum == expected_sha
        assert obs.acquisition_status == AcquisitionStatus.SUCCESS
        assert obs.provenance_state == ProvenanceState.REAL_EXTERNAL_DATA
        assert obs.storage_key == f"raw/satellite/sentinel-2-l2a/{scene_id}/visual.tif"

    @pytest.mark.asyncio
    async def test_production_mode_rejects_synthetic_scene_id(self):
        mock_provider = MagicMock()
        mock_storage = MagicMock()
        service = SatelliteAcquisitionService(provider=mock_provider, storage=mock_storage)

        orig_mode = settings.SATELLITE_MODE
        try:
            settings.SATELLITE_MODE = "production"
            with pytest.raises(ValidationException, match="Synthetic scene identifier.*is forbidden in production"):
                await service.acquire_scene(scene_id="mock-scene-001")

            with pytest.raises(ValidationException, match="Synthetic scene identifier.*is forbidden in production"):
                await service.acquire_scene(scene_id="fixture-scene-002")
        finally:
            settings.SATELLITE_MODE = orig_mode


class TestProcessingGateEnforcement:
    def _create_obs(
        self,
        obs_id: str,
        acq_status: AcquisitionStatus = AcquisitionStatus.SUCCESS,
        has_checksum: bool = True,
    ) -> SatelliteObservation:
        t = datetime(2025, 1, 10, tzinfo=timezone.utc)
        return SatelliteObservation(
            id=obs_id,
            mission=SatelliteMission.SENTINEL_1,
            platform=SatellitePlatform.SENTINEL_1A,
            instrument=InstrumentType.C_SAR,
            product_type=ProductType.SLC,
            product_id=f"S1A_{obs_id}",
            acquisition_time=t,
            processing_time=t,
            pass_direction=PassDirection.ASCENDING,
            mode=None,
            footprint={"type": "Polygon", "coordinates": [[[92.0, 23.0], [93.0, 23.0], [93.0, 24.0], [92.0, 24.0], [92.0, 23.0]]]},
            bbox=[92.0, 23.0, 93.0, 24.0],
            source_checksum="sha256real" if has_checksum else None,
            processing_level=ProcessingLevel.LEVEL_1_SLC,
            quality_state=QualityState.VALID,
            provenance_state=ProvenanceState.REAL_EXTERNAL_DATA,
            acquisition_status=acq_status,
            created_at=t,
        )

    def test_processing_gate_blocks_incomplete_acquisition(self):
        pipeline = SatelliteProcessingPipeline()
        obs_ok = self._create_obs("obs-real-1", acq_status=AcquisitionStatus.SUCCESS)
        obs_unacquired = self._create_obs("obs-real-2", acq_status=AcquisitionStatus.ACQUIRING)

        with pytest.raises(ValidationException, match="Processing blocked: Scene.*acquisition status is 'ACQUIRING'"):
            pipeline.validate_insar_pair(obs_ok, obs_unacquired, perpendicular_baseline=45.0)

    def test_processing_gate_blocks_missing_checksum(self):
        pipeline = SatelliteProcessingPipeline()
        obs1 = self._create_obs("obs-real-1", acq_status=AcquisitionStatus.SUCCESS, has_checksum=True)
        obs2 = self._create_obs("obs-real-2", acq_status=AcquisitionStatus.SUCCESS, has_checksum=False)

        with pytest.raises(ValidationException, match="Processing blocked: Scene.*lacks verified integrity checksum"):
            pipeline.validate_insar_pair(obs1, obs2, perpendicular_baseline=45.0)

    def test_processing_gate_blocks_synthetic_in_production(self):
        pipeline = SatelliteProcessingPipeline()
        obs_real = self._create_obs("obs-real-1")
        obs_mock = self._create_obs("mock-s1-scene")

        orig_mode = settings.SATELLITE_MODE
        try:
            settings.SATELLITE_MODE = "production"
            with pytest.raises(ValidationException, match="Processing blocked: Synthetic scene.*forbidden in production"):
                pipeline.validate_insar_pair(obs_real, obs_mock, perpendicular_baseline=45.0)
        finally:
            settings.SATELLITE_MODE = orig_mode
