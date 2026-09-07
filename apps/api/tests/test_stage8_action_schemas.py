"""
Sentinel NER — Stage 8 Action Domain Schema & Safety Contract Unit Tests
Validates non-autonomous action schemas, field validations, expiry constraints,
and mandatory disclaimers.
"""

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from src.schemas.action import (
    NON_AUTONOMOUS_ACTION_DISCLAIMER,
    Action,
    ActionAuthorization,
    ActionEvidence,
    ActionExecution,
    ActionOutcome,
    ActionOutcomeType,
    ActionPriority,
    ActionType,
    AuthorizationDecision,
)


class TestStage8ActionSchemas:
    def test_action_non_autonomous_disclaimer_present(self):
        """Verify statutory non-autonomous disclaimer is permanently embedded in Action contract."""
        now = datetime.now(timezone.utc)
        evidence = ActionEvidence(
            evidence_summary="Field inspection recommended for highway culverts.",
        )
        action = Action(
            id="act-test-001",
            title="Road Assessment: NH-54 Chainage km 12",
            action_type=ActionType.ROAD_ASSESSMENT,
            priority=ActionPriority.URGENT,
            district_id="dst-aizawl",
            target_entity_type="ROAD",
            target_entity_id="road-nh54",
            recommended_agency_id="PWD",
            recommendation_rationale="Consequence analysis indicates road is potentially exposed to slope unit.",
            evidence=evidence,
            expires_at=now + timedelta(hours=24),
        )

        assert action.disclaimer == NON_AUTONOMOUS_ACTION_DISCLAIMER
        assert "NON-AUTONOMOUS CONTROL PRINCIPLE" in action.disclaimer
        assert "NOT automatically dispatch personnel" in action.disclaimer

    def test_action_expiry_validation_rejects_past_or_equal_expiry(self):
        """Validation: expires_at must be strictly greater than effective_from."""
        now = datetime.now(timezone.utc)
        evidence = ActionEvidence(
            evidence_summary="Test evidence",
        )

        # expires_at earlier than effective_from
        with pytest.raises(ValidationError) as exc_info:
            Action(
                id="act-test-002",
                title="Test Action",
                action_type=ActionType.FIELD_INSPECTION,
                priority=ActionPriority.ROUTINE,
                district_id="dst-aizawl",
                target_entity_type="ROAD",
                target_entity_id="road-nh54",
                recommended_agency_id="PWD",
                recommendation_rationale="Testing invalid expiration timestamp rejection.",
                evidence=evidence,
                effective_from=now,
                expires_at=now - timedelta(hours=1),
            )
        assert "expires_at must be strictly greater than effective_from" in str(exc_info.value)

        # expires_at equal to effective_from
        with pytest.raises(ValidationError):
            Action(
                id="act-test-003",
                title="Test Action Equal",
                action_type=ActionType.FIELD_INSPECTION,
                priority=ActionPriority.ROUTINE,
                district_id="dst-aizawl",
                target_entity_type="ROAD",
                target_entity_id="road-nh54",
                recommended_agency_id="PWD",
                recommendation_rationale="Testing equal expiration timestamp rejection.",
                evidence=evidence,
                effective_from=now,
                expires_at=now,
            )

    def test_action_authorization_model_attributes(self):
        """Verify ActionAuthorization captures authorizer identity, jurisdiction, and justification."""
        now = datetime.now(timezone.utc)
        auth = ActionAuthorization(
            authorizer_user_id="usr-ddma-1",
            authorizer_name="K. Lalhmingliana",
            organization_id="org-ddma-aizawl",
            role="DDMA",
            jurisdiction_district_id="dst-aizawl",
            decision=AuthorizationDecision.APPROVE,
            decision_timestamp=now,
            justification="Field team dispatched with high-resolution survey equipment.",
        )

        assert auth.decision == AuthorizationDecision.APPROVE
        assert auth.jurisdiction_district_id == "dst-aizawl"
        assert auth.policy_version == "sentinel-auth-policy-v1.0"
        assert len(auth.justification) >= 5

    def test_action_execution_and_outcome_models(self):
        """Verify ActionExecution and ActionOutcome models store complete operational trail."""
        now = datetime.now(timezone.utc)
        execution = ActionExecution(
            assigned_agency_id="PWD",
            assigned_personnel=["usr-field-1", "usr-field-2"],
            started_at=now,
            execution_notes="Highway patrol unit en route to km 14.5.",
        )
        assert len(execution.assigned_personnel) == 2
        assert execution.assigned_agency_id == "PWD"

        outcome = ActionOutcome(
            outcome_type=ActionOutcomeType.HAZARD_CONFIRMED_MITIGATED,
            ground_observations="Tension crack observed on shoulder. Cleared minor debris and reinforced gabion wall.",
            mitigation_applied="Gabion toe reinforcement and culvert drainage cleared.",
            follow_up_recommended=True,
            recorded_by="usr-field-1",
            recorded_at=now,
        )
        assert outcome.outcome_type == ActionOutcomeType.HAZARD_CONFIRMED_MITIGATED
        assert outcome.follow_up_recommended is True
