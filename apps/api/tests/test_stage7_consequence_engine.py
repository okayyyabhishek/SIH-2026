"""
Sentinel NER — Stage 7 Consequence Intelligence Engine & Spatial Analysis Tests
Verifies spatial proximity, intersection, road chainage linking, asset criticality,
village exposure, multi-stage risk/satellite integration, and non-alarmist phrasing.
"""

from datetime import datetime, timedelta, timezone

import pytest

from src.core.consequence.engine import consequence_engine
from src.core.spatial_utils import (
    distance_geometry_to_geometry,
    segments_intersect,
)
from src.schemas.consequence import (
    CHAINAGE_DATA_UNAVAILABLE_CODE,
    RISK_DATA_UNAVAILABLE_CODE,
    AssetCriticality,
    ConsequenceCategory,
    SpatialRelationType,
)


class TestStage7ConsequenceEngine:
    @pytest.fixture
    def sample_slope_unit(self):
        return {
            "id": "su-aizawl-101",
            "code": "SU-AIZ-101",
            "name": "Durtlang Ridge Slope Unit 101",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [92.715, 23.720],
                        [92.725, 23.720],
                        [92.725, 23.730],
                        [92.715, 23.730],
                        [92.715, 23.720],
                    ]
                ],
            },
        }

    @pytest.fixture
    def intersecting_road(self):
        return {
            "id": "road-nh54-section1",
            "road_code": "NH-54",
            "name": "National Highway 54 (Aizawl North)",
            "road_type": "NATIONAL_HIGHWAY",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "authority_organization_id": "org-bro-pushpak",
            "operational_status": "OPERATIONAL",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [92.710, 23.725],
                    [92.730, 23.725],  # Cuts directly across the slope unit
                ],
            },
        }

    @pytest.fixture
    def nearby_road(self):
        return {
            "id": "road-pwd-sec2",
            "road_code": "MDR-02",
            "name": "Major District Road 02",
            "road_type": "MAJOR_DISTRICT_ROAD",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "authority_organization_id": "org-pwd-mz",
            "operational_status": "OPERATIONAL",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [92.726, 23.720],
                    [92.726, 23.730],  # ~100m east of polygon boundary
                ],
            },
        }

    @pytest.fixture
    def distant_road(self):
        return {
            "id": "road-far-sec3",
            "road_code": "RURAL-09",
            "name": "Far Village Connector",
            "road_type": "RURAL_ROAD",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "authority_organization_id": "org-pwd-mz",
            "operational_status": "OPERATIONAL",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [92.750, 23.750],
                    [92.760, 23.750],  # > 3 km away
                ],
            },
        }

    @pytest.fixture
    def cross_district_road(self):
        return {
            "id": "road-kolasib-sec1",
            "road_code": "SH-01",
            "name": "Kolasib State Highway",
            "road_type": "STATE_HIGHWAY",
            "district_id": "dst-kolasib",
            "state_code": "MZ",
            "authority_organization_id": "org-pwd-mz",
            "operational_status": "OPERATIONAL",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [92.720, 23.725],
                    [92.722, 23.725],
                ],
            },
        }

    def test_spatial_utilities_geometry_distance(self, sample_slope_unit, intersecting_road, distant_road):
        # Intersecting road distance should be 0.0m
        dist_intersect = distance_geometry_to_geometry(sample_slope_unit["geometry"], intersecting_road["geometry"])
        assert dist_intersect == 0.0

        # Distant road distance should be > 1000m
        dist_far = distance_geometry_to_geometry(sample_slope_unit["geometry"], distant_road["geometry"])
        assert dist_far > 1000.0

    def test_segment_intersection(self):
        # Crossing segments
        assert segments_intersect([0.0, 0.0], [2.0, 2.0], [0.0, 2.0], [2.0, 0.0]) is True
        # Parallel non-intersecting segments
        assert segments_intersect([0.0, 0.0], [2.0, 0.0], [0.0, 1.0], [2.0, 1.0]) is False

    def test_road_exposure_intersecting(self, sample_slope_unit, intersecting_road):
        rel = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=intersecting_road,
        )
        assert rel is not None
        assert rel.spatial_relation == SpatialRelationType.INTERSECTS
        assert rel.distance_meters == 0.0
        assert rel.target_id == intersecting_road["id"]
        assert "POTENTIALLY AFFECTED" in rel.exposure_basis
        # Road must never be called CLOSED without authoritative field order
        assert "CLOSED" not in rel.exposure_basis

    def test_road_exposure_nearby_and_distant(self, sample_slope_unit, nearby_road, distant_road):
        rel_nearby = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=nearby_road,
            distance_threshold_m=250.0,
        )
        assert rel_nearby is not None
        assert rel_nearby.spatial_relation == SpatialRelationType.NEARBY
        assert 0.0 < rel_nearby.distance_meters <= 250.0

        # Distant road should not produce a consequence relationship
        rel_far = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=distant_road,
            distance_threshold_m=250.0,
        )
        assert rel_far is None

    def test_cross_district_relationship_blocked(self, sample_slope_unit, cross_district_road):
        # Cross-district slope-unit to road relationship must be rejected
        rel = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=cross_district_road,
        )
        assert rel is None

    def test_road_chainage_linking_and_unavailable(self, sample_slope_unit, intersecting_road):
        # 1. With chainages present
        chainages = [
            {
                "id": "ch-nh54-14",
                "road_id": intersecting_road["id"],
                "chainage_km": 14.2,
                "geometry": {"type": "Point", "coordinates": [92.721, 23.725]},
            },
            {
                "id": "ch-nh54-20",
                "road_id": intersecting_road["id"],
                "chainage_km": 20.0,
                "geometry": {"type": "Point", "coordinates": [92.780, 23.750]},
            },
        ]
        rel_with_chainage = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=intersecting_road,
            chainages=chainages,
        )
        assert rel_with_chainage is not None
        assert rel_with_chainage.chainage_km == 14.2
        assert rel_with_chainage.chainage_status == "KM_14.2"
        assert "KM 14.2" in rel_with_chainage.exposure_basis

        # 2. Without chainages present
        rel_no_chainage = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=intersecting_road,
            chainages=None,
        )
        assert rel_no_chainage is not None
        assert rel_no_chainage.chainage_km is None
        assert rel_no_chainage.chainage_status == CHAINAGE_DATA_UNAVAILABLE_CODE
        assert "CHAINAGE_DATA_UNAVAILABLE" in rel_no_chainage.exposure_basis

    def test_asset_exposure_and_criticality(self, sample_slope_unit):
        # Asset with explicit CRITICAL metadata
        bridge_asset = {
            "id": "asset-bridge-01",
            "name": "Tuirial Major Bridge",
            "asset_type": "BRIDGE",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "operational_status": "OPERATIONAL",
            "geometry": {"type": "Point", "coordinates": [92.722, 23.725]},  # Inside SU
            "metadata": {"criticality": "CRITICAL"},
        }
        rel_bridge = consequence_engine.evaluate_slope_unit_to_asset(
            slope_unit=sample_slope_unit,
            asset=bridge_asset,
        )
        assert rel_bridge is not None
        assert rel_bridge.spatial_relation == SpatialRelationType.INTERSECTS
        assert rel_bridge.criticality == AssetCriticality.CRITICAL
        assert rel_bridge.relationship_type == ConsequenceCategory.CRITICAL_INFRASTRUCTURE_EXPOSURE
        assert "POTENTIALLY EXPOSED" in rel_bridge.exposure_basis
        assert "DAMAGED" not in rel_bridge.exposure_basis

        # Asset without criticality metadata -> UNKNOWN
        telecom_asset = {
            "id": "asset-telecom-02",
            "name": "Aizawl Telecom Tower 12",
            "asset_type": "TELECOM",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "operational_status": "OPERATIONAL",
            "geometry": {"type": "Point", "coordinates": [92.720, 23.722]},
            "metadata": {},
        }
        rel_telecom = consequence_engine.evaluate_slope_unit_to_asset(
            slope_unit=sample_slope_unit,
            asset=telecom_asset,
        )
        assert rel_telecom is not None
        assert rel_telecom.criticality == AssetCriticality.UNKNOWN
        assert rel_telecom.relationship_type == ConsequenceCategory.ASSET_EXPOSURE

    def test_village_exposure_and_non_alarmist_phrasing(self, sample_slope_unit):
        village = {
            "id": "vil-aizawl-north",
            "name": "Durtlang North",
            "village_code": "VIL-MZ-DUR-01",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "population": 12400,
            "status": "ACTIVE",
            "geometry": {"type": "Point", "coordinates": [92.724, 23.728]},
        }
        rel_village = consequence_engine.evaluate_slope_unit_to_village(
            slope_unit=sample_slope_unit,
            village=village,
        )
        assert rel_village is not None
        assert rel_village.relationship_type == ConsequenceCategory.VILLAGE_PROXIMITY
        assert "Durtlang North" in rel_village.exposure_basis
        assert "12400" in rel_village.exposure_basis
        # Critical negative check: Village is never classified as unsafe or evacuated
        assert "UNSAFE" not in rel_village.exposure_basis
        assert "EVACUATE" not in rel_village.exposure_basis
        assert "no evacuation order is inferred or issued" in rel_village.assumptions[1]

    def test_risk_and_insar_integration(self, sample_slope_unit, intersecting_road):
        now = datetime.now(timezone.utc)

        # 1. Valid risk prediction
        valid_risk = {
            "id": "pred-su-101",
            "subject_type": "SLOPE_UNIT",
            "subject_id": sample_slope_unit["id"],
            "risk_level": "VERY_HIGH",
            "valid_until": now + timedelta(days=2),
        }
        # InSAR deformation observation
        insar_obs = {
            "id": "insar-obs-99",
            "displacement_statistics": {"mean_los_mm_yr": -42.8, "max_los_mm_yr": -65.2},
            "intersected_slope_units": [sample_slope_unit["code"]],
        }

        rel = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=intersecting_road,
            risk_prediction=valid_risk,
            insar_observation=insar_obs,
        )
        assert rel is not None
        assert rel.risk_prediction_id == "pred-su-101"
        assert rel.risk_level == "VERY_HIGH"
        assert rel.satellite_observation_id == "insar-obs-99"
        assert rel.insar_deformation_mm_yr == -42.8

        # 2. Stale risk prediction
        stale_risk = {
            "id": "pred-su-101-old",
            "subject_type": "SLOPE_UNIT",
            "subject_id": sample_slope_unit["id"],
            "risk_level": "HIGH",
            "valid_until": now - timedelta(days=5),  # Expired
        }
        rel_stale = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=intersecting_road,
            risk_prediction=stale_risk,
        )
        assert rel_stale is not None
        assert "STALE" in rel_stale.risk_level

        # 3. Missing risk prediction
        rel_no_risk = consequence_engine.evaluate_slope_unit_to_road(
            slope_unit=sample_slope_unit,
            road=intersecting_road,
            risk_prediction=None,
        )
        assert rel_no_risk is not None
        assert rel_no_risk.risk_level == RISK_DATA_UNAVAILABLE_CODE

    def test_full_district_batch_analysis(self, sample_slope_unit, intersecting_road, nearby_road):
        rels = consequence_engine.execute_consequence_analysis(
            district_id="dst-aizawl",
            slope_units=[sample_slope_unit],
            roads=[intersecting_road, nearby_road],
            chainages=[],
            assets=[],
            villages=[],
            distance_threshold_m=300.0,
        )
        assert len(rels) == 2
        for r in rels:
            assert r.algorithm_version == "sentinel-consequence-v1.0.0"
            assert r.district_id == "dst-aizawl"
            assert r.generated_at is not None
