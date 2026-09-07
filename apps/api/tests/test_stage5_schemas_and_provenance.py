"""
Sentinel NER — Stage 5 Schemas, Provenance & Data Quality Tests
Verifies feature definitions, data quality evaluation, missing/stale/out-of-bounds handling,
and cryptographic SHA-256 snapshot immutability.
"""

from datetime import datetime, timedelta, timezone

from src.core.risk.features import (
    AUTHORITATIVE_FEATURE_DEFINITIONS,
    FeatureSnapshotBuilder,
    RiskDataQualityEvaluator,
)
from src.schemas.risk import (
    DataQualityState,
    RiskSubjectType,
)


class TestStage5SchemasAndProvenance:
    def test_authoritative_feature_definitions_completeness(self):
        """Verifies that all 5 authoritative features have complete descriptions, units, and ranges."""
        expected_features = [
            "historical_event_density_30d",
            "slope_angle_deg",
            "road_proximity_m",
            "drainage_density",
            "soil_permeability_index",
        ]
        for f_name in expected_features:
            assert f_name in AUTHORITATIVE_FEATURE_DEFINITIONS
            defn = AUTHORITATIVE_FEATURE_DEFINITIONS[f_name]
            assert defn.name == f_name
            assert defn.unit
            assert defn.description
            assert len(defn.expected_range) == 2
            assert defn.expected_range[0] < defn.expected_range[1]
            assert defn.source
            assert defn.transformation

    def test_feature_quality_evaluator_valid_data(self):
        """Verifies clean validation for within-bound fresh features."""
        now = datetime.now(timezone.utc)
        defn = AUTHORITATIVE_FEATURE_DEFINITIONS["slope_angle_deg"]

        val, quality = RiskDataQualityEvaluator.evaluate_feature(
            definition=defn,
            raw_value=35.0,
            obs_time=now - timedelta(hours=24),
            now=now,
        )
        assert val == 35.0
        assert quality == DataQualityState.VALID

    def test_feature_quality_evaluator_out_of_range(self):
        """Verifies OUT_OF_RANGE detection when values breach expected physical bounds."""
        now = datetime.now(timezone.utc)
        defn = AUTHORITATIVE_FEATURE_DEFINITIONS["slope_angle_deg"]  # [0, 90]

        # Value exceeds maximum slope (120 degrees is impossible for standard terrain)
        val, quality = RiskDataQualityEvaluator.evaluate_feature(
            definition=defn,
            raw_value=120.0,
            obs_time=now,
            now=now,
        )
        assert val == 120.0
        assert quality == DataQualityState.OUT_OF_RANGE

        # Negative slope
        val_neg, quality_neg = RiskDataQualityEvaluator.evaluate_feature(
            definition=defn,
            raw_value=-5.0,
            obs_time=now,
            now=now,
        )
        assert quality_neg == DataQualityState.OUT_OF_RANGE

    def test_feature_quality_evaluator_stale_data(self):
        """Verifies STALE detection when observation timestamp exceeds freshness_hours."""
        now = datetime.now(timezone.utc)
        defn = AUTHORITATIVE_FEATURE_DEFINITIONS["historical_event_density_30d"]  # freshness: 72h

        # 5 days old observation
        val, quality = RiskDataQualityEvaluator.evaluate_feature(
            definition=defn,
            raw_value=2.5,
            obs_time=now - timedelta(hours=120),
            now=now,
        )
        assert val == 2.5
        assert quality == DataQualityState.STALE

    def test_feature_quality_evaluator_missing_data(self):
        """Verifies MISSING classification on None raw values."""
        now = datetime.now(timezone.utc)
        defn = AUTHORITATIVE_FEATURE_DEFINITIONS["road_proximity_m"]

        val, quality = RiskDataQualityEvaluator.evaluate_feature(
            definition=defn,
            raw_value=None,
            obs_time=now,
            now=now,
        )
        assert val is None
        assert quality == DataQualityState.MISSING

    def test_snapshot_builder_sha256_determinism_and_immutability(self):
        """Verifies that identical feature inputs yield strictly identical SHA-256 cryptographic hashes."""
        now = datetime.now(timezone.utc)
        inputs = {
            "historical_event_density_30d": (1.5, now - timedelta(hours=2), "src-events-01"),
            "slope_angle_deg": (30.0, now - timedelta(days=10), "src-dem-01"),
            "road_proximity_m": (400.0, now - timedelta(days=5), "src-roads-01"),
            "drainage_density": (3.2, now - timedelta(days=20), "src-hydro-01"),
            "soil_permeability_index": (5.0, now - timedelta(days=30), "src-soil-01"),
        }

        snap1 = FeatureSnapshotBuilder.build_snapshot(
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-test-001",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_dict=inputs,
            now=now,
        )

        snap2 = FeatureSnapshotBuilder.build_snapshot(
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-test-001",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_dict=inputs,
            now=now,
        )

        assert snap1.snapshot_hash_sha256 == snap2.snapshot_hash_sha256
        assert len(snap1.snapshot_hash_sha256) == 64
        assert snap1.data_quality_state == DataQualityState.VALID
        assert snap1.missing_feature_count == 0
        assert snap1.stale_feature_count == 0

    def test_snapshot_builder_triggers_data_insufficient_on_missing_features(self):
        """Verifies that when critical features are missing, the snapshot enters DATA_INSUFFICIENT."""
        now = datetime.now(timezone.utc)
        # Only provide 1 feature out of 5
        sparse_inputs = {
            "slope_angle_deg": (25.0, now, "src-dem-01"),
        }

        snap = FeatureSnapshotBuilder.build_snapshot(
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-test-sparse",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_dict=sparse_inputs,
            now=now,
        )

        assert snap.data_quality_state == DataQualityState.DATA_INSUFFICIENT
        assert snap.missing_feature_count >= 2
        # Verify provenance records explicitly tag missingness
        missing_provenance = [p for p in snap.provenance if p.missingness]
        assert len(missing_provenance) == 4
        for mp in missing_provenance:
            assert mp.quality_state == DataQualityState.MISSING
            assert mp.source_identifier == "NOT_AVAILABLE"
