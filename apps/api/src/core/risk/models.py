"""
Sentinel NER — Transparent Logistic Regression & Risk Estimation Model (Stage 5)
Provides pure-Python, zero-dependency, statistically transparent baseline modeling,
Platt scaling calibration, feature contribution decomposition, and uncertainty quantification.
"""

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from src.schemas.risk import (
    DataQualityState,
    FeatureContribution,
    PredictionExplanation,
    RiskEvidence,
    RiskLevel,
    RiskPrediction,
    RiskSubjectType,
    UncertaintyLevel,
)


class TransparentLogisticRegression:
    """
    Transparent, verifiable Logistic Regression baseline.
    Computes linear log-odds: z = intercept + sum(weight_i * normalized_x_i).
    Applies standard sigmoid activation: sigma(z) = 1 / (1 + exp(-z)).
    Applies Platt scaling: P = 1 / (1 + exp(A * z + B)).
    Decomposes log-odds to generate machine-readable feature contributions.
    """

    def __init__(
        self,
        model_version_id: str,
        weights: Dict[str, float],
        intercept: float = -0.5,
        feature_scaling: Optional[Dict[str, Dict[str, float]]] = None,
        platt_params: Optional[Dict[str, float]] = None,
        threshold_scale_version: str = "RISK_SCALE_V1",
    ):
        self.model_version_id = model_version_id
        self.weights = weights
        self.intercept = intercept
        self.feature_scaling = feature_scaling or {}
        self.platt_params = platt_params
        self.threshold_scale_version = threshold_scale_version

    def _normalize_feature(self, name: str, val: Optional[float]) -> float:
        if val is None:
            return 0.0  # Median / zero-centered imputation on missingness
        scaling = self.feature_scaling.get(name)
        if scaling:
            mean = scaling.get("mean", 0.0)
            std = scaling.get("std", 1.0)
            if std > 1e-9:
                return (val - mean) / std
        return val

    @staticmethod
    def _sigmoid(z: float) -> float:
        # Bounded sigmoid to avoid float overflow
        clipped_z = max(-15.0, min(15.0, z))
        return 1.0 / (1.0 + math.exp(-clipped_z))

    def evaluate_risk_level(self, score: float) -> RiskLevel:
        if score < 0.25:
            return RiskLevel.LOW
        elif score < 0.50:
            return RiskLevel.MODERATE
        elif score < 0.75:
            return RiskLevel.HIGH
        else:
            return RiskLevel.VERY_HIGH

    def compute_uncertainty(
        self,
        raw_score: float,
        missing_count: int,
        stale_count: int,
        is_calibrated: bool,
    ) -> Tuple[float, UncertaintyLevel]:
        # Aleatoric / boundary uncertainty: highest at decision boundary (0.5), lowest at 0 or 1
        boundary_uncertainty = 1.0 - 2.0 * abs(raw_score - 0.5)

        # Epistemic penalty for missing or stale features
        epistemic_penalty = (missing_count * 0.25) + (stale_count * 0.12)
        if not is_calibrated:
            epistemic_penalty += 0.15

        total_uncertainty = min(1.0, max(0.0, (boundary_uncertainty * 0.5) + epistemic_penalty))
        total_uncertainty = round(total_uncertainty, 4)

        if total_uncertainty < 0.35:
            level = UncertaintyLevel.LOW
        elif total_uncertainty < 0.70:
            level = UncertaintyLevel.MEDIUM
        else:
            level = UncertaintyLevel.HIGH

        return total_uncertainty, level

    def predict(
        self,
        snapshot_id: str,
        subject_type: RiskSubjectType,
        subject_id: str,
        district_id: str,
        state_code: str,
        feature_values: Dict[str, Optional[float]],
        data_quality_state: DataQualityState,
        missing_count: int,
        stale_count: int,
        model_run_id: str,
        now: Optional[datetime] = None,
        historical_event_ids: Optional[List[str]] = None,
    ) -> Tuple[RiskPrediction, PredictionExplanation, RiskEvidence]:
        current_time = now or datetime.now(timezone.utc)
        pred_id = f"pred-{uuid.uuid4().hex[:12]}"
        expl_id = f"expl-{uuid.uuid4().hex[:12]}"
        evid_id = f"evid-{uuid.uuid4().hex[:12]}"

        # SAFETY GATE: Data Insufficient State
        if data_quality_state == DataQualityState.DATA_INSUFFICIENT:
            prediction = RiskPrediction(
                id=pred_id,
                subject_type=subject_type,
                subject_id=subject_id,
                geographic_scope={"state_code": state_code, "district_id": district_id},
                district_id=district_id,
                state_code=state_code,
                model_version_id=self.model_version_id,
                model_run_id=model_run_id,
                generated_at=current_time,
                valid_from=current_time,
                valid_until=current_time + timedelta(hours=24),
                risk_value=0.0,
                risk_scale=self.threshold_scale_version,
                risk_level=RiskLevel.LOW,
                raw_score=0.0,
                calibrated_probability=None,
                calibration_method=None,
                calibration_version=None,
                uncertainty_score=1.0,
                uncertainty_level=UncertaintyLevel.UNKNOWN,
                confidence_state="UNAVAILABLE",
                feature_snapshot_id=snapshot_id,
                evidence_ids=[evid_id],
                explanation_id=expl_id,
                data_quality_state=data_quality_state,
                missing_feature_count=missing_count,
                stale_feature_count=stale_count,
                status="DATA_INSUFFICIENT",
                created_at=current_time,
            )
            explanation = PredictionExplanation(
                id=expl_id,
                prediction_id=pred_id,
                top_contributing_features=[],
                summary_narrative="Prediction refused: Critical input features are missing or unverified. Operational safety requires an explicit DATA_INSUFFICIENT state.",
                baseline_intercept=self.intercept,
                raw_model_score=0.0,
                created_at=current_time,
            )
            evidence = RiskEvidence(
                id=evid_id,
                prediction_id=pred_id,
                subject_type=subject_type,
                subject_id=subject_id,
                historical_events_count=len(historical_event_ids or []),
                historical_event_ids=historical_event_ids or [],
                spatial_relation_notes="Evaluation aborted due to insufficient authoritative input features.",
                created_at=current_time,
            )
            return prediction, explanation, evidence

        # Compute linear sum
        z = self.intercept
        contributions: List[FeatureContribution] = []
        raw_contribs: Dict[str, float] = {}

        for feat_name, weight in self.weights.items():
            raw_val = feature_values.get(feat_name)
            norm_val = self._normalize_feature(feat_name, raw_val)
            contrib = weight * norm_val
            raw_contribs[feat_name] = contrib
            z += contrib

        raw_score = round(self._sigmoid(z), 4)

        # Calibration
        calibrated_prob: Optional[float] = None
        calib_method: Optional[str] = None
        calib_ver: Optional[str] = None
        if self.platt_params:
            platt_a = self.platt_params.get("A", 1.0)
            platt_b = self.platt_params.get("B", 0.0)
            calibrated_z = platt_a * z + platt_b
            calibrated_prob = round(self._sigmoid(calibrated_z), 4)
            calib_method = "PLATT_SCALING"
            calib_ver = self.platt_params.get("version", "PLATT_V1")

        # Effective score for categorization
        effective_score = calibrated_prob if calibrated_prob is not None else raw_score
        risk_level = self.evaluate_risk_level(effective_score)

        # Uncertainty
        uncertainty_score, uncertainty_level = self.compute_uncertainty(
            raw_score=raw_score,
            missing_count=missing_count,
            stale_count=stale_count,
            is_calibrated=(calibrated_prob is not None),
        )

        # Calculate normalized contribution weights
        total_abs_contrib = sum(abs(c) for c in raw_contribs.values()) + 1e-6
        for feat_name, contrib in raw_contribs.items():
            norm_w = round(abs(contrib) / total_abs_contrib, 4)
            if contrib > 0.02:
                direction = "INCREASES_RISK"
                stat = f"Feature '{feat_name}' elevated the model estimate (+{round(contrib, 3)} log-odds contribution)."
            elif contrib < -0.02:
                direction = "DECREASES_RISK"
                stat = f"Feature '{feat_name}' dampened the model estimate ({round(contrib, 3)} log-odds contribution)."
            else:
                direction = "NEUTRAL"
                stat = f"Feature '{feat_name}' had minimal influence on the model estimate."

            contributions.append(
                FeatureContribution(
                    feature_name=feat_name,
                    feature_value=feature_values.get(feat_name),
                    coefficient=self.weights.get(feat_name, 0.0),
                    raw_contribution=round(contrib, 4),
                    normalized_weight=norm_w,
                    direction_of_influence=direction,
                    association_statement=stat,
                )
            )

        # Sort contributions by absolute impact
        contributions.sort(key=lambda c: abs(c.raw_contribution), reverse=True)

        top_factors = [
            f"{c.feature_name} ({c.direction_of_influence})" for c in contributions[:3]
        ]
        drivers_text = ", ".join(top_factors) if top_factors else "Baseline terrain state"
        narrative = (
            f"Model estimate categorized as {risk_level.value} (score: {effective_score}). "
            f"Primary statistical drivers: {drivers_text}. "
            f"Uncertainty is assessed as {uncertainty_level.value} ({uncertainty_score})."
        )

        prediction = RiskPrediction(
            id=pred_id,
            subject_type=subject_type,
            subject_id=subject_id,
            geographic_scope={"state_code": state_code, "district_id": district_id},
            district_id=district_id,
            state_code=state_code,
            model_version_id=self.model_version_id,
            model_run_id=model_run_id,
            generated_at=current_time,
            valid_from=current_time,
            valid_until=current_time + timedelta(hours=24),
            risk_value=effective_score,
            risk_scale=self.threshold_scale_version,
            risk_level=risk_level,
            raw_score=raw_score,
            calibrated_probability=calibrated_prob,
            calibration_method=calib_method,
            calibration_version=calib_ver,
            uncertainty_score=uncertainty_score,
            uncertainty_level=uncertainty_level,
            confidence_state="CALIBRATED" if calibrated_prob is not None else "UNCALIBRATED",
            feature_snapshot_id=snapshot_id,
            evidence_ids=[evid_id],
            explanation_id=expl_id,
            data_quality_state=data_quality_state,
            missing_feature_count=missing_count,
            stale_feature_count=stale_count,
            status="COMPLETED",
            created_at=current_time,
        )

        explanation = PredictionExplanation(
            id=expl_id,
            prediction_id=pred_id,
            top_contributing_features=contributions,
            summary_narrative=narrative,
            baseline_intercept=self.intercept,
            raw_model_score=raw_score,
            created_at=current_time,
        )

        evidence = RiskEvidence(
            id=evid_id,
            prediction_id=pred_id,
            subject_type=subject_type,
            subject_id=subject_id,
            historical_events_count=len(historical_event_ids or []),
            historical_event_ids=historical_event_ids or [],
            spatial_relation_notes=f"Derived from terrain slope unit '{subject_id}' and {len(historical_event_ids or [])} spatially correlated historical events in district '{district_id}'.",
            observations_summary={
                "features_evaluated": len(feature_values),
                "data_quality_state": data_quality_state.value,
            },
            created_at=current_time,
        )

        return prediction, explanation, evidence
