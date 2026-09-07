"""
Sentinel NER — Risk Model Registry & Artifact Security (Stage 5)
Manages model lifecycle states (DRAFT -> VALIDATING -> VALIDATED -> APPROVED -> ACTIVE -> RETIRED),
SHA-256 artifact verification, and safe JSON serialization without untrusted pickle deserialization.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.core.errors import ConflictException, ValidationException
from src.core.risk.models import TransparentLogisticRegression
from src.schemas.risk import (
    ModelLifecycleStatus,
    ModelVersion,
)


def compute_weights_checksum(weights_dict: Dict[str, Any]) -> str:
    """Computes deterministic SHA-256 digest of model weights and hyperparameters."""
    serialized = json.dumps(weights_dict, sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


class ModelRegistry:
    """
    In-memory registry and lifecycle manager for versioned risk models.
    Enforces artifact verification and prevents unauthorized execution of untrusted models.
    """

    def __init__(self):
        self._models: Dict[str, ModelVersion] = {}
        self._active_model_id: Optional[str] = None
        self._instantiated_models: Dict[str, TransparentLogisticRegression] = {}
        self._seed_baseline_model()

    def _seed_baseline_model(self):
        """Registers and activates the baseline transparent Logistic Regression model."""
        now = datetime.now(timezone.utc)
        weights_data = {
            "weights": {
                "historical_event_density_30d": 0.55,
                "slope_angle_deg": 0.48,
                "road_proximity_m": -0.32,
                "drainage_density": 0.28,
                "soil_permeability_index": -0.22,
            },
            "intercept": -0.65,
            "feature_scaling": {
                "historical_event_density_30d": {"mean": 1.2, "std": 2.5},
                "slope_angle_deg": {"mean": 28.0, "std": 12.0},
                "road_proximity_m": {"mean": 1500.0, "std": 2500.0},
                "drainage_density": {"mean": 3.5, "std": 2.1},
                "soil_permeability_index": {"mean": 5.0, "std": 2.0},
            },
            "platt_params": {"A": 1.15, "B": -0.10, "version": "PLATT_V1"},
        }
        checksum = compute_weights_checksum(weights_data)

        baseline = ModelVersion(
            id="mdl-lr-baseline-v1",
            model_name="SENTINEL-LR-BASELINE",
            algorithm="LogisticRegression",
            version="1.0.0",
            feature_definition_version="1.0.0",
            training_dataset_reference="DS-REF-MOCK-REGIONAL-2024",
            training_period={"start": "2020-01-01", "end": "2023-12-31"},
            validation_period={"start": "2024-01-01", "end": "2024-06-30"},
            test_period={"start": "2024-07-01", "end": "2024-12-31"},
            hyperparameters={"regularization": "L2", "C": 1.0, "solver": "convex_analytical"},
            preprocessing_version="1.0.0",
            threshold_version="RISK_SCALE_V1",
            calibration_version="PLATT_V1",
            artifact_reference="artifacts://models/lr_baseline_v1.json",
            artifact_checksum_sha256=checksum,
            weights=weights_data,
            metrics={
                "precision": 0.76,
                "recall": 0.72,
                "f1": 0.74,
                "roc_auc": 0.81,
                "pr_auc": 0.69,
                "brier_score": 0.14,
                "confusion_matrix": {"TP": 72, "FP": 23, "TN": 154, "FN": 28},
                "status_label": "ENGINEERING_VALIDATED_BASELINE",
            },
            limitations=[
                "Model is decision support only and cannot replace certified geological ground surveys.",
                "Real-time precipitation telemetry is unintegrated; estimates reflect static topography and historical density only.",
                "Uncalibrated for sudden co-seismic landslide events.",
                "Regional spatial generalization limited to Mizoram and adjacent hilly tracts.",
            ],
            status=ModelLifecycleStatus.ACTIVE,
            created_at=now,
            approved_by="usr-admin",
            activated_at=now,
        )

        self._models[baseline.id] = baseline
        self._active_model_id = baseline.id
        self._instantiate_model(baseline)

    def _instantiate_model(self, model_ver: ModelVersion) -> TransparentLogisticRegression:
        if not model_ver.weights:
            raise ValidationException("Model record does not contain weights payload.")

        # Checksum validation
        current_checksum = compute_weights_checksum(model_ver.weights)
        if current_checksum != model_ver.artifact_checksum_sha256:
            raise ValidationException(
                f"Artifact checksum verification failed for '{model_ver.id}'. Expected {model_ver.artifact_checksum_sha256}, got {current_checksum}."
            )

        w = model_ver.weights.get("weights", {})
        intercept = model_ver.weights.get("intercept", 0.0)
        scaling = model_ver.weights.get("feature_scaling", {})
        platt = model_ver.weights.get("platt_params")

        inst = TransparentLogisticRegression(
            model_version_id=model_ver.id,
            weights=w,
            intercept=intercept,
            feature_scaling=scaling,
            platt_params=platt,
            threshold_scale_version=model_ver.threshold_version,
        )
        self._instantiated_models[model_ver.id] = inst
        return inst

    def get_model(self, model_id: str) -> Optional[ModelVersion]:
        return self._models.get(model_id)

    def get_active_model(self) -> ModelVersion:
        if not self._active_model_id or self._active_model_id not in self._models:
            raise ConflictException("No active risk model registered in the system.")
        return self._models[self._active_model_id]

    def get_executable_model(self, model_id: Optional[str] = None) -> TransparentLogisticRegression:
        target_id = model_id or self._active_model_id
        if not target_id:
            raise ConflictException("No active risk model specified.")

        if target_id not in self._instantiated_models:
            model_ver = self.get_model(target_id)
            if not model_ver:
                raise ValidationException(f"Referenced model '{target_id}' not found.")
            if model_ver.status not in (ModelLifecycleStatus.ACTIVE, ModelLifecycleStatus.APPROVED, ModelLifecycleStatus.VALIDATED):
                raise ValidationException(
                    f"Model '{target_id}' with status '{model_ver.status.value}' cannot be executed for operational inference."
                )
            self._instantiate_model(model_ver)

        return self._instantiated_models[target_id]

    def list_models(self) -> List[ModelVersion]:
        return list(self._models.values())

    def register_model(
        self,
        model_name: str,
        algorithm: str,
        version: str,
        feature_definition_version: str,
        hyperparameters: Dict[str, Any],
        weights: Dict[str, Any],
        limitations: List[str],
        metrics: Optional[Dict[str, Any]] = None,
        created_by: str = "usr-admin",
    ) -> ModelVersion:
        # Check uniqueness of name + version
        for m in self._models.values():
            if m.model_name == model_name and m.version == version:
                raise ConflictException(f"Model '{model_name}' version '{version}' already registered.")

        now = datetime.now(timezone.utc)
        checksum = compute_weights_checksum(weights)
        model_id = f"mdl-{uuid.uuid4().hex[:12]}"

        new_model = ModelVersion(
            id=model_id,
            model_name=model_name,
            algorithm=algorithm,
            version=version,
            feature_definition_version=feature_definition_version,
            hyperparameters=hyperparameters,
            preprocessing_version="1.0.0",
            threshold_version="RISK_SCALE_V1",
            calibration_version=weights.get("platt_params", {}).get("version"),
            artifact_reference=f"artifacts://models/{model_id}.json",
            artifact_checksum_sha256=checksum,
            weights=weights,
            metrics=metrics or {},
            limitations=limitations,
            status=ModelLifecycleStatus.DRAFT,
            created_at=now,
        )

        self._models[model_id] = new_model
        return new_model

    def activate_model(self, model_id: str, approved_by: str) -> ModelVersion:
        """Transitions an approved/validated model to ACTIVE, superseding prior active model."""
        model = self.get_model(model_id)
        if not model:
            raise ValidationException(f"Model '{model_id}' does not exist.")

        if model.status == ModelLifecycleStatus.RETIRED:
            raise ConflictException(f"Cannot activate retired model '{model_id}'.")

        now = datetime.now(timezone.utc)

        # Retire previously active model
        if self._active_model_id and self._active_model_id in self._models:
            prev = self._models[self._active_model_id]
            prev.status = ModelLifecycleStatus.RETIRED

        model.status = ModelLifecycleStatus.ACTIVE
        model.approved_by = approved_by
        model.activated_at = now
        self._active_model_id = model.id

        # Re-instantiate
        self._instantiate_model(model)
        return model


model_registry = ModelRegistry()
