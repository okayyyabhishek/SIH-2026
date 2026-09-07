"""
Sentinel NER — Stage 5 Model Artifact Security & Lifecycle Tests
Validates SHA-256 artifact verification, rejection of tampered weights,
safe JSON weight serialization, and strict model lifecycle transitions.
"""

import pytest

from src.core.errors import ConflictException, ValidationException
from src.core.risk.registry import (
    ModelRegistry,
    compute_weights_checksum,
)
from src.schemas.risk import ModelLifecycleStatus


class TestStage5ArtifactSecurity:
    def test_checksum_verification_detects_tampered_weights(self):
        """CRITICAL: Rejects execution if model weights have been altered without matching checksum."""
        registry = ModelRegistry()

        # Legitimate weights
        weights_data = {
            "weights": {"slope_angle_deg": 0.45, "road_proximity_m": -0.25},
            "intercept": -0.5,
        }
        checksum = compute_weights_checksum(weights_data)

        model = registry.register_model(
            model_name="TEST-INTEGRITY-MODEL",
            algorithm="LogisticRegression",
            version="1.0.0",
            feature_definition_version="1.0.0",
            hyperparameters={},
            weights=weights_data,
            limitations=["Test limitation"],
        )
        assert model.artifact_checksum_sha256 == checksum

        # Tamper with weights in registry without updating checksum
        model.weights["weights"]["slope_angle_deg"] = 999.9  # Tampered!
        model.status = ModelLifecycleStatus.ACTIVE

        # Attempt to instantiate executable model must fail
        with pytest.raises(ValidationException) as exc_info:
            registry._instantiate_model(model)
        assert "Artifact checksum verification failed" in str(exc_info.value)

    def test_model_lifecycle_activation_and_retirement(self):
        """Verifies state progression from DRAFT to ACTIVE, and supersession of prior models."""
        registry = ModelRegistry()
        active_initial = registry.get_active_model()
        assert active_initial.status == ModelLifecycleStatus.ACTIVE

        # Register second model
        weights2 = {"weights": {"slope_angle_deg": 0.3}, "intercept": -0.2}
        model2 = registry.register_model(
            model_name="TEST-SECOND-MODEL",
            algorithm="LogisticRegression",
            version="2.0.0",
            feature_definition_version="1.0.0",
            hyperparameters={},
            weights=weights2,
            limitations=["Test limitation 2"],
        )
        assert model2.status == ModelLifecycleStatus.DRAFT

        # Execution of DRAFT model is rejected
        with pytest.raises(ValidationException) as exc:
            registry.get_executable_model(model2.id)
        assert "cannot be executed for operational inference" in str(exc.value)

        # Activate second model
        activated = registry.activate_model(model2.id, approved_by="usr-super-admin")
        assert activated.status == ModelLifecycleStatus.ACTIVE
        assert activated.approved_by == "usr-super-admin"
        assert activated.activated_at is not None

        # Prior model is now retired
        prior = registry.get_model(active_initial.id)
        assert prior.status == ModelLifecycleStatus.RETIRED

        # Activating retired model is rejected
        with pytest.raises(ConflictException) as exc_ret:
            registry.activate_model(prior.id, approved_by="usr-admin")
        assert "Cannot activate retired model" in str(exc_ret.value)

    def test_duplicate_model_registration_rejected(self):
        """Rejects registration of already existing model name and version."""
        registry = ModelRegistry()
        weights = {"weights": {"slope_angle_deg": 0.2}, "intercept": 0.0}

        registry.register_model(
            model_name="DUP-MODEL",
            algorithm="LogisticRegression",
            version="1.0.0",
            feature_definition_version="1.0.0",
            hyperparameters={},
            weights=weights,
            limitations=[],
        )

        with pytest.raises(ConflictException) as exc:
            registry.register_model(
                model_name="DUP-MODEL",
                algorithm="LogisticRegression",
                version="1.0.0",
                feature_definition_version="1.0.0",
                hyperparameters={},
                weights=weights,
                limitations=[],
            )
        assert "already registered" in str(exc.value)
