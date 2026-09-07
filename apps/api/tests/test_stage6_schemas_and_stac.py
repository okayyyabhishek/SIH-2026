"""
Sentinel NER — Stage 6 Schemas, Sentinel-1 Metadata & STAC Contracts Tests
Verifies:
1. SatelliteObservation and InSARObservation schema fidelity.
2. Sentinel-1 SAR acquisition attributes.
3. Explicit Line-of-Sight (LOS) semantics and spatial intersection disclaimers.
4. STAC 1.0.0 item reference validation and coordinate bounds checking.
5. Truthful external connector status reporting (Anti-Fabrication).
"""

from datetime import datetime, timezone

import pytest

from src.core.errors import ValidationException
from src.core.satellite.lineage import get_external_connectors_status
from src.core.satellite.pipeline import satellite_pipeline
from src.schemas.satellite import (
    LOS_MANDATORY_QUALIFICATION,
    SPATIAL_OVERLAP_DISCLAIMER,
    AcquisitionMode,
    ConnectorStatus,
    InSARObservation,
    InstrumentType,
    PassDirection,
    Polarization,
    ProcessingLevel,
    ProductType,
    ProvenanceState,
    QualityState,
    SatelliteMission,
    SatelliteObservation,
    SatellitePlatform,
    UncertaintyState,
)


class TestStage6SchemasAndSTAC:
    def test_sentinel1_sar_observation_metadata(self):
        t = datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        obs = SatelliteObservation(
            id="sat-obs-test-s1",
            mission=SatelliteMission.SENTINEL_1,
            platform=SatellitePlatform.SENTINEL_1A,
            instrument=InstrumentType.C_SAR,
            product_type=ProductType.SLC,
            product_id="S1A_IW_SLC__1SDV_20250115T120000_20250115T120030_057400_070000_ABCD",
            acquisition_time=t,
            processing_time=t,
            orbit_number=57400,
            relative_orbit=121,
            pass_direction=PassDirection.ASCENDING,
            polarization=Polarization.VV_VH,
            mode=AcquisitionMode.IW,
            footprint={
                "type": "Polygon",
                "coordinates": [[[92.7, 23.7], [93.0, 23.7], [93.0, 24.0], [92.7, 24.0], [92.7, 23.7]]],
            },
            bbox=[92.7, 23.7, 93.0, 24.0],
            source_catalog="COPERNICUS_DATASPACE",
            spatial_reference="EPSG:4326",
            temporal_reference="UTC",
            processing_level=ProcessingLevel.LEVEL_1_SLC,
            quality_state=QualityState.VALID,
            provenance_state=ProvenanceState.DETERMINISTIC_TEST_FIXTURE,
            created_at=t,
        )
        assert obs.mission == SatelliteMission.SENTINEL_1
        assert obs.platform == SatellitePlatform.SENTINEL_1A
        assert obs.instrument == InstrumentType.C_SAR
        assert obs.mode == AcquisitionMode.IW
        assert obs.pass_direction == PassDirection.ASCENDING
        assert obs.polarization == Polarization.VV_VH
        assert obs.spatial_reference == "EPSG:4326"

    def test_insar_los_displacement_semantics(self):
        t1 = datetime(2025, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2025, 1, 22, 0, 0, 0, tzinfo=timezone.utc)
        insar = InSARObservation(
            id="insar-test-1",
            primary_scene_id="sat-obs-1",
            secondary_scene_id="sat-obs-2",
            acquisition_start=t1,
            acquisition_end=t2,
            temporal_baseline_days=12.0,
            perpendicular_baseline_meters=35.0,
            orbit_direction=PassDirection.DESCENDING,
            deformation_geometry={
                "type": "Polygon",
                "coordinates": [[[92.8, 23.8], [92.9, 23.8], [92.9, 23.9], [92.8, 23.9], [92.8, 23.8]]],
            },
            displacement_statistics={
                "min_los_mm_yr": -25.4,
                "max_los_mm_yr": 4.2,
                "mean_los_mm_yr": -12.1,
                "std_los_mm_yr": 5.1,
                "unit": "mm/year",
            },
            coherence_mean=0.72,
            valid_pixel_ratio=0.91,
            uncertainty=UncertaintyState.LOW,
            intersected_slope_units=["su-aizawl-001"],
            created_at=t2,
        )
        # Critical verification: Must carry explicit LOS qualification
        assert "line-of-sight" in insar.los_semantics.lower()
        assert insar.los_semantics == LOS_MANDATORY_QUALIFICATION
        assert insar.displacement_statistics["unit"] == "mm/year"
        # Critical verification: Must carry non-causal spatial overlap disclaimer
        assert insar.spatial_intersection_disclaimer == SPATIAL_OVERLAP_DISCLAIMER
        assert "su-aizawl-001" in insar.intersected_slope_units

    def test_stac_item_validator_valid_and_inverted_bbox(self):
        valid_stac = {
            "stac_version": "1.0.0",
            "id": "S1A_IW_SLC__1SDV_20250110T002345",
            "collection": "sentinel-1-grd",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[92.0, 23.0], [94.0, 23.0], [94.0, 25.0], [92.0, 25.0], [92.0, 23.0]]],
            },
            "bbox": [92.0, 23.0, 94.0, 25.0],
            "properties": {"datetime": "2025-01-10T00:23:45Z"},
            "assets": {"thumbnail": {"href": "https://dataspace.copernicus.eu/thumb.png"}},
            "links": [],
        }
        item = satellite_pipeline.validate_stac_item(valid_stac)
        assert item.id == "S1A_IW_SLC__1SDV_20250110T002345"
        assert item.bbox == [92.0, 23.0, 94.0, 25.0]

        # Inverted bounding box must raise ValidationException
        inverted_stac = valid_stac.copy()
        inverted_stac["bbox"] = [94.0, 25.0, 92.0, 23.0]
        with pytest.raises(ValidationException, match="inverted coordinates"):
            satellite_pipeline.validate_stac_item(inverted_stac)

        # Out-of-range latitude must raise ValidationException
        out_of_range_stac = valid_stac.copy()
        out_of_range_stac["bbox"] = [92.0, -95.0, 94.0, 25.0]
        with pytest.raises(ValidationException, match="out-of-range coordinates"):
            satellite_pipeline.validate_stac_item(out_of_range_stac)

    def test_truthful_connector_statuses_no_fabrication(self):
        connectors = get_external_connectors_status()
        assert len(connectors) >= 3

        statuses = {c.connector_id: c.status for c in connectors}
        # In accordance with anti-fabrication rules, live connectors must report truthful unconfigured/offline state
        assert statuses["copernicus-cdse-v1"] == ConnectorStatus.NOT_CONFIGURED
        assert statuses["aws-earth-search-v1"] == ConnectorStatus.DATASET_NOT_AVAILABLE
        assert statuses["planetary-computer-stac"] == ConnectorStatus.NOT_CONFIGURED

        for conn in connectors:
            assert conn.auth_configured is False
            assert len(conn.message) > 0
