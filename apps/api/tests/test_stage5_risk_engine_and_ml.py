"""
Sentinel NER — Stage 5 Risk Engine & Transparent ML Tests
Verifies transparent logistic regression, Platt calibration, uncertainty quantification,
refusal policy on insufficient data, and non-causal explainability.
"""

from datetime import datetime, timezone

from src.core.risk.models import TransparentLogisticRegression
from src.schemas.risk import (
    DataQualityState,
    RiskLevel,
    RiskSubjectType,
    UncertaintyLevel,
)


class TestStage5RiskEngineAndML:
    def get_test_model(self, calibrated: bool = True) -> TransparentLogisticRegression:
        weights = {
            "historical_event_density_30d": 0.60,
            "slope_angle_deg": 0.50,
            "road_proximity_m": -0.30,
            "drainage_density": 0.25,
            "soil_permeability_index": -0.20,
        }
        scaling = {
            "historical_event_density_30d": {"mean": 1.0, "std": 2.0},
            "slope_angle_deg": {"mean": 25.0, "std": 10.0},
            "road_proximity_m": {"mean": 1000.0, "std": 2000.0},
            "drainage_density": {"mean": 3.0, "std": 2.0},
            "soil_permeability_index": {"mean": 5.0, "std": 2.0},
        }
        platt = {"A": 1.1, "B": -0.05, "version": "PLATT_V1"} if calibrated else None

        return TransparentLogisticRegression(
            model_version_id="mdl-test-v1",
            weights=weights,
            intercept=-0.5,
            feature_scaling=scaling,
            platt_params=platt,
            threshold_scale_version="RISK_SCALE_V1",
        )

    def test_predict_valid_inputs_generates_calibrated_estimate(self):
        """Verifies prediction generation, Platt scaling, and explainability on valid inputs."""
        model = self.get_test_model(calibrated=True)
        now = datetime.now(timezone.utc)

        features = {
            "historical_event_density_30d": 3.0,   # Elevated
            "slope_angle_deg": 40.0,               # High slope
            "road_proximity_m": 200.0,             # Near road
            "drainage_density": 5.0,               # High drainage
            "soil_permeability_index": 3.0,        # Less permeable
        }

        pred, expl, evid = model.predict(
            snapshot_id="snap-test-01",
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-001",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_values=features,
            data_quality_state=DataQualityState.VALID,
            missing_count=0,
            stale_count=0,
            model_run_id="run-001",
            now=now,
            historical_event_ids=["evt-01", "evt-02"],
        )

        assert pred.status == "COMPLETED"
        assert 0.0 <= pred.risk_value <= 1.0
        assert pred.calibrated_probability is not None
        assert pred.calibration_method == "PLATT_SCALING"
        assert pred.confidence_state == "CALIBRATED"
        assert pred.risk_level in (RiskLevel.HIGH, RiskLevel.VERY_HIGH)
        assert pred.uncertainty_score < 0.6
        assert pred.uncertainty_level in (UncertaintyLevel.LOW, UncertaintyLevel.MEDIUM)

        # Check Explanation
        assert expl.prediction_id == pred.id
        assert len(expl.top_contributing_features) == 5
        weights_sum = sum(c.normalized_weight for c in expl.top_contributing_features)
        assert 0.99 <= weights_sum <= 1.01  # Sums to ~1.0

        # Check top driver is positive contributor
        top = expl.top_contributing_features[0]
        assert top.raw_contribution > 0
        assert top.direction_of_influence == "INCREASES_RISK"
        assert "elevated" in top.association_statement.lower()

        # Check non-causality disclaimer
        assert "not direct physical causality" in expl.disclaimer

    def test_predict_uncalibrated_model_exposes_uncalibrated_state(self):
        """Verifies that an uncalibrated model leaves calibrated_probability as None."""
        model = self.get_test_model(calibrated=False)
        now = datetime.now(timezone.utc)

        features = {
            "historical_event_density_30d": 0.5,
            "slope_angle_deg": 15.0,
            "road_proximity_m": 3000.0,
            "drainage_density": 1.5,
            "soil_permeability_index": 7.0,
        }

        pred, _, _ = model.predict(
            snapshot_id="snap-test-02",
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-002",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_values=features,
            data_quality_state=DataQualityState.VALID,
            missing_count=0,
            stale_count=0,
            model_run_id="run-002",
            now=now,
        )

        assert pred.status == "COMPLETED"
        assert pred.calibrated_probability is None
        assert pred.calibration_method is None
        assert pred.confidence_state == "UNCALIBRATED"
        assert pred.raw_score > 0.0

    def test_refusal_policy_on_data_insufficient_state(self):
        """CRITICAL: Verifies engine refuses to produce risk score when data is insufficient."""
        model = self.get_test_model(calibrated=True)
        now = datetime.now(timezone.utc)

        sparse_features = {
            "historical_event_density_30d": None,
            "slope_angle_deg": 25.0,
            "road_proximity_m": None,
            "drainage_density": None,
            "soil_permeability_index": None,
        }

        pred, expl, evid = model.predict(
            snapshot_id="snap-test-sparse",
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-sparse",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_values=sparse_features,
            data_quality_state=DataQualityState.DATA_INSUFFICIENT,
            missing_count=4,
            stale_count=0,
            model_run_id="run-003",
            now=now,
        )

        assert pred.status == "DATA_INSUFFICIENT"
        assert pred.risk_value == 0.0
        assert pred.calibrated_probability is None
        assert pred.uncertainty_level == UncertaintyLevel.UNKNOWN
        assert pred.confidence_state == "UNAVAILABLE"
        assert "refused" in expl.summary_narrative.lower()

    def test_prediction_reproducibility_and_determinism(self):
        """Verifies that identical model and input features generate strictly identical outputs."""
        model = self.get_test_model(calibrated=True)
        now = datetime.now(timezone.utc)

        features = {
            "historical_event_density_30d": 2.2,
            "slope_angle_deg": 33.0,
            "road_proximity_m": 800.0,
            "drainage_density": 3.8,
            "soil_permeability_index": 4.0,
        }

        pred1, expl1, _ = model.predict(
            snapshot_id="snap-01",
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-rep",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_values=features,
            data_quality_state=DataQualityState.VALID,
            missing_count=0,
            stale_count=0,
            model_run_id="run-01",
            now=now,
        )

        pred2, expl2, _ = model.predict(
            snapshot_id="snap-01",
            subject_type=RiskSubjectType.SLOPE_UNIT,
            subject_id="su-rep",
            district_id="dst-aizawl",
            state_code="MZ",
            feature_values=features,
            data_quality_state=DataQualityState.VALID,
            missing_count=0,
            stale_count=0,
            model_run_id="run-01",
            now=now,
        )

        assert pred1.raw_score == pred2.raw_score
        assert pred1.calibrated_probability == pred2.calibrated_probability
        assert pred1.risk_value == pred2.risk_value
        assert pred1.risk_level == pred2.risk_level
        assert pred1.uncertainty_score == pred2.uncertainty_score
        assert expl1.raw_model_score == expl2.raw_model_score
