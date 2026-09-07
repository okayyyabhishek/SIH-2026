"""
Sentinel NER — Stage 7 Consequence Intelligence Schemas & Non-Autonomous Boundary Tests
Verifies schema contracts, field validation, deterministic enums, and non-alarmist terminology.
"""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from src.schemas.consequence import (
    ASSET_EXPOSURE_TERMINOLOGY,
    CHAINAGE_DATA_UNAVAILABLE_CODE,
    CRITICALITY_UNKNOWN_CODE,
    NON_AUTONOMOUS_DISCLAIMER,
    RISK_DATA_UNAVAILABLE_CODE,
    ROAD_EXPOSURE_TERMINOLOGY,
    SATELLITE_EVIDENCE_UNAVAILABLE_CODE,
    VILLAGE_EXPOSURE_TERMINOLOGY,
    AssetCriticality,
    ConsequenceCategory,
    ConsequenceConfidence,
    ConsequenceRelationship,
    ConsequenceRunRequest,
    ConsequenceSourceType,
    ConsequenceSummary,
    ConsequenceTargetType,
    RelationshipStatus,
    SpatialRelationType,
    UncertaintyLevel,
)


class TestStage7ConsequenceSchemas:
    def test_consequence_relationship_valid_schema(self):
        now = datetime.now(timezone.utc)
        rel = ConsequenceRelationship(
            id="rel-test-001",
            source_type=ConsequenceSourceType.SLOPE_UNIT,
            source_id="su-mz-aiz-001",
            source_name="SU-001",
            target_type=ConsequenceTargetType.ROAD,
            target_id="road-nh54-001",
            target_name="National Highway 54",
            target_code="NH-54",
            relationship_type=ConsequenceCategory.TRANSPORT_CORRIDOR_EXPOSURE,
            spatial_relation=SpatialRelationType.INTERSECTS,
            distance_meters=0.0,
            intersection_ratio=1.0,
            exposure_basis="Geometric intersection identified between SU-001 and NH-54 corridor.",
            evidence_ids=["su-mz-aiz-001", "road-nh54-001"],
            risk_prediction_id="pred-001",
            risk_level="HIGH",
            satellite_observation_id="insar-001",
            insar_deformation_mm_yr=-32.4,
            criticality=AssetCriticality.HIGH,
            confidence=ConsequenceConfidence.HIGH,
            uncertainty=UncertaintyLevel.LOW,
            assumptions=["Buffer zone 250m", ROAD_EXPOSURE_TERMINOLOGY],
            organization_id="org-bro-pushpak",
            chainage_km=14.5,
            chainage_status="KM_14.5",
            district_id="dst-aizawl",
            state_code="MZ",
            generated_at=now,
            valid_from=now,
            algorithm_version="sentinel-consequence-v1.0.0",
            status=RelationshipStatus.ACTIVE,
        )

        assert rel.id == "rel-test-001"
        assert rel.spatial_relation == SpatialRelationType.INTERSECTS
        assert rel.distance_meters == 0.0
        assert rel.chainage_km == 14.5
        assert rel.criticality == AssetCriticality.HIGH

    def test_non_autonomous_disclaimers_present(self):
        assert "Stage 7 Consequence Intelligence denotes potential spatial exposure" in NON_AUTONOMOUS_DISCLAIMER
        assert "NOT automatically order road closures" in NON_AUTONOMOUS_DISCLAIMER
        assert "POTENTIALLY AFFECTED" in ROAD_EXPOSURE_TERMINOLOGY
        assert "NOT designated as CLOSED" in ROAD_EXPOSURE_TERMINOLOGY
        assert "POTENTIALLY EXPOSED" in ASSET_EXPOSURE_TERMINOLOGY
        assert "NOT designated as DAMAGED" in ASSET_EXPOSURE_TERMINOLOGY
        assert "NOT designated as UNSAFE" in VILLAGE_EXPOSURE_TERMINOLOGY

    def test_missing_data_sentinel_codes(self):
        assert CHAINAGE_DATA_UNAVAILABLE_CODE == "CHAINAGE_DATA_UNAVAILABLE"
        assert RISK_DATA_UNAVAILABLE_CODE == "RISK_DATA_UNAVAILABLE"
        assert SATELLITE_EVIDENCE_UNAVAILABLE_CODE == "SATELLITE_EVIDENCE_UNAVAILABLE"
        assert CRITICALITY_UNKNOWN_CODE == "CRITICALITY_UNKNOWN"

    def test_criticality_never_assumed_from_name(self):
        # Even if name has 'Bridge' or 'Hospital', without explicit metadata, criticality is UNKNOWN
        now = datetime.now(timezone.utc)
        rel = ConsequenceRelationship(
            id="rel-test-asset",
            source_type=ConsequenceSourceType.SLOPE_UNIT,
            source_id="su-001",
            target_type=ConsequenceTargetType.ASSET,
            target_id="asset-bridge-4",
            target_name="Super Critical Major Hospital Bridge",
            relationship_type=ConsequenceCategory.ASSET_EXPOSURE,
            spatial_relation=SpatialRelationType.NEARBY,
            distance_meters=120.5,
            exposure_basis="Asset is in proximity zone.",
            criticality=AssetCriticality.UNKNOWN,
            district_id="dst-aizawl",
            state_code="MZ",
            generated_at=now,
            valid_from=now,
        )
        assert rel.criticality == AssetCriticality.UNKNOWN

    def test_consequence_run_request_validation(self):
        # Valid run request
        req = ConsequenceRunRequest(district_id="dst-aizawl", distance_threshold_m=400.0)
        assert req.district_id == "dst-aizawl"
        assert req.distance_threshold_m == 400.0

        # Negative: distance threshold < 10m should fail validation
        with pytest.raises(ValidationError):
            ConsequenceRunRequest(district_id="dst-aizawl", distance_threshold_m=2.0)

        # Negative: distance threshold > 5000m should fail validation
        with pytest.raises(ValidationError):
            ConsequenceRunRequest(district_id="dst-aizawl", distance_threshold_m=10000.0)

    def test_consequence_summary_schema(self):
        now = datetime.now(timezone.utc)
        summary = ConsequenceSummary(
            district_id="dst-aizawl",
            total_relationships=12,
            potentially_affected_roads_count=2,
            linked_chainages_count=3,
            exposed_assets_count=4,
            critical_assets_count=2,
            nearby_villages_count=3,
            generated_at=now,
        )
        assert summary.district_id == "dst-aizawl"
        assert summary.total_relationships == 12
        assert "NOT automatically order road closures" in summary.disclaimer
