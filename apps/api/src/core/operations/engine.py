"""
Sentinel NER — Stage 8 Operational Control Engine
Enforces the Non-Autonomous Safety Principle: Converts consequence intelligence,
risk predictions, and satellite evidence into auditable action recommendations
and manages validated lifecycle state machines for actions and warnings.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from src.core.errors import ValidationException
from src.schemas.action import (
    NON_AUTONOMOUS_ACTION_DISCLAIMER,
    Action,
    ActionEvidence,
    ActionPriority,
    ActionStatus,
    ActionType,
)
from src.schemas.warning import (
    WarningStatus,
)


class OperationalControlEngine:
    """
    Core engine managing operational action recommendations, human authorization rules,
    and lifecycle state validation.
    """

    # Action State Transitions map
    VALID_ACTION_TRANSITIONS = {
        ActionStatus.RECOMMENDED: {
            ActionStatus.PENDING_REVIEW,
            ActionStatus.REJECTED,
            ActionStatus.CANCELLED,
            ActionStatus.EXPIRED,
        },
        ActionStatus.PENDING_REVIEW: {
            ActionStatus.APPROVED,
            ActionStatus.REJECTED,
            ActionStatus.PENDING_REVIEW,  # when requesting more information
            ActionStatus.CANCELLED,
            ActionStatus.EXPIRED,
        },
        ActionStatus.APPROVED: {
            ActionStatus.QUEUED,
            ActionStatus.IN_PROGRESS,
            ActionStatus.CANCELLED,
            ActionStatus.EXPIRED,
        },
        ActionStatus.QUEUED: {
            ActionStatus.IN_PROGRESS,
            ActionStatus.CANCELLED,
            ActionStatus.EXPIRED,
        },
        ActionStatus.IN_PROGRESS: {
            ActionStatus.COMPLETED,
            ActionStatus.FAILED,
            ActionStatus.CANCELLED,
            ActionStatus.EXPIRED,
        },
        ActionStatus.COMPLETED: set(),
        ActionStatus.REJECTED: set(),
        ActionStatus.CANCELLED: set(),
        ActionStatus.EXPIRED: set(),
        ActionStatus.FAILED: set(),
    }

    # Warning State Transitions map
    VALID_WARNING_TRANSITIONS = {
        WarningStatus.DRAFT: {
            WarningStatus.REVIEW,
            WarningStatus.CANCELLED,
            WarningStatus.EXPIRED,
        },
        WarningStatus.REVIEW: {
            WarningStatus.AUTHORIZED,
            WarningStatus.DRAFT,  # rejected back to draft
            WarningStatus.CANCELLED,
            WarningStatus.EXPIRED,
        },
        WarningStatus.AUTHORIZED: {
            WarningStatus.DISPATCHING,
            WarningStatus.CANCELLED,
            WarningStatus.EXPIRED,
        },
        WarningStatus.DISPATCHING: {
            WarningStatus.DISPATCHED,
            WarningStatus.CANCELLED,
        },
        WarningStatus.DISPATCHED: {
            WarningStatus.ACKNOWLEDGED,
            WarningStatus.PARTIALLY_ACKNOWLEDGED,
            WarningStatus.CANCELLED,
            WarningStatus.EXPIRED,
            WarningStatus.RESOLVED,
        },
        WarningStatus.ACKNOWLEDGED: {
            WarningStatus.RESOLVED,
            WarningStatus.EXPIRED,
            WarningStatus.CANCELLED,
        },
        WarningStatus.PARTIALLY_ACKNOWLEDGED: {
            WarningStatus.ACKNOWLEDGED,
            WarningStatus.RESOLVED,
            WarningStatus.EXPIRED,
            WarningStatus.CANCELLED,
        },
        WarningStatus.EXPIRED: set(),
        WarningStatus.CANCELLED: set(),
        WarningStatus.RESOLVED: set(),
    }

    @classmethod
    def recommend_action_from_consequence(
        cls,
        consequence_rel: Dict[str, Any],
        slope_unit: Optional[Dict[str, Any]] = None,
        target_entity: Optional[Dict[str, Any]] = None,
        risk_prediction: Optional[Dict[str, Any]] = None,
        insar_observation: Optional[Dict[str, Any]] = None,
    ) -> Action:
        """
        Synthesizes Stage 7 consequence relationships, Stage 5 risk, and Stage 6 InSAR
        into an auditable Action recommendation for human review.
        """
        now = datetime.now(timezone.utc)
        target_type = consequence_rel.get("target_type", "UNKNOWN")
        target_id = consequence_rel.get("target_id", "unknown")
        target_name = consequence_rel.get("target_name") or (target_entity.get("name") if target_entity else target_id)
        district_id = consequence_rel.get("district_id", "dst-aizawl")
        criticality = str(consequence_rel.get("criticality", "MODERATE")).upper()

        # Determine ActionType
        if target_type == "ROAD":
            action_type = ActionType.ROAD_ASSESSMENT
            default_agency = consequence_rel.get("managing_agency") or "PWD"
            title = f"Road Assessment: {target_name} at Chainage"
            playbook_id = "PB-ROAD-EXPOSURE"
        elif target_type == "ASSET":
            action_type = ActionType.ASSET_INSPECTION
            default_agency = consequence_rel.get("managing_agency") or "DDMA"
            title = f"Asset Inspection: {target_name}"
            playbook_id = "PB-CRITICAL-ASSET"
        elif target_type == "VILLAGE":
            action_type = ActionType.AUTHORITY_REVIEW
            default_agency = "DDMA"
            title = f"Civil Defense Review: {target_name} Vicinity"
            playbook_id = "PB-VILLAGE-PROXIMITY"
        else:
            action_type = ActionType.FIELD_INSPECTION
            default_agency = "DDMA"
            title = f"Field Inspection: {target_type} {target_id}"
            playbook_id = None

        # Priority calculation
        risk_level = risk_prediction.get("risk_level", "MODERATE") if risk_prediction else "MODERATE"
        if criticality == "CRITICAL" or risk_level in ("VERY_HIGH", "CRITICAL"):
            priority = ActionPriority.CRITICAL
        elif criticality == "HIGH" or risk_level == "HIGH":
            priority = ActionPriority.URGENT
        elif criticality == "MODERATE":
            priority = ActionPriority.ELEVATED
        else:
            priority = ActionPriority.ROUTINE

        # Preserving non-alarmist language in recommendation rationale
        su_id = consequence_rel.get("source_id", "unknown slope unit")
        rationale = (
            f"Consequence relationship analysis indicates {target_type.lower()} '{target_name}' is potentially "
            f"spatially exposed to slope unit {su_id} with estimated {criticality} criticality. "
            f"Verified ground inspection by {default_agency} is recommended to verify drainage, slope stabilization, "
            f"and physical integrity prior to any civil defense intervention."
        )

        evidence_ts = [now]
        if consequence_rel.get("generated_at"):
            evidence_ts.append(consequence_rel["generated_at"])

        insar_disp = None
        if insar_observation:
            insar_disp = insar_observation.get("mean_velocity_mm_year") or insar_observation.get("max_los_displacement_mm")

        evidence = ActionEvidence(
            consequence_relationship_id=consequence_rel.get("id"),
            slope_unit_id=consequence_rel.get("source_id"),
            road_id=target_id if target_type == "ROAD" else None,
            road_chainage_id=consequence_rel.get("chainage_id"),
            asset_id=target_id if target_type == "ASSET" else None,
            village_id=target_id if target_type == "VILLAGE" else None,
            risk_prediction_id=risk_prediction.get("id") if risk_prediction else None,
            risk_level=risk_level,
            satellite_observation_id=insar_observation.get("id") if insar_observation else None,
            insar_displacement_mm=insar_disp,
            evidence_timestamps=evidence_ts,
            uncertainty_level=consequence_rel.get("uncertainty_level", "MEDIUM"),
            evidence_summary=(
                f"Multi-stage evidence: Consequence rel {consequence_rel.get('id', 'N/A')}, "
                f"Criticality={criticality}, SpatialRelation={consequence_rel.get('spatial_relation', 'PROXIMATE')}."
            ),
        )

        return Action(
            id=f"act-{uuid4().hex[:12]}",
            title=title,
            action_type=action_type,
            priority=priority,
            status=ActionStatus.RECOMMENDED,
            district_id=district_id,
            state_id="IN-MZ",
            target_entity_type=target_type,
            target_entity_id=target_id,
            target_entity_name=target_name,
            recommended_agency_id=default_agency,
            recommendation_rationale=rationale,
            evidence=evidence,
            playbook_id=playbook_id,
            created_by="system:consequence-engine",
            created_at=now,
            updated_at=now,
            effective_from=now,
            expires_at=now + timedelta(hours=72),
            disclaimer=NON_AUTONOMOUS_ACTION_DISCLAIMER,
        )

    @classmethod
    def validate_action_transition(
        cls,
        current_status: ActionStatus,
        target_status: ActionStatus,
        is_expired: bool = False,
    ) -> None:
        """
        Validates whether an Action state transition is legal according to the lifecycle state machine.
        Rejects invalid transitions and operations on expired actions.
        """
        if is_expired and target_status in {ActionStatus.APPROVED, ActionStatus.QUEUED, ActionStatus.IN_PROGRESS, ActionStatus.COMPLETED}:
            raise ValidationException(
                message="Cannot progress expired action. Expired actions must be re-evaluated.",
                error_code="STG_ACTION_EXPIRED",
            )

        allowed = cls.VALID_ACTION_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise ValidationException(
                message=f"Invalid action state transition from {current_status.value} to {target_status.value}.",
                error_code="STG_INVALID_STATE_TRANSITION",
            )

    @classmethod
    def validate_warning_transition(
        cls,
        current_status: WarningStatus,
        target_status: WarningStatus,
        is_expired: bool = False,
    ) -> None:
        """
        Validates whether a Warning state transition is legal according to the lifecycle state machine.
        Rejects unvetted dispatches and operations on expired or cancelled warnings.
        """
        if is_expired and target_status in {WarningStatus.AUTHORIZED, WarningStatus.DISPATCHING, WarningStatus.DISPATCHED}:
            raise ValidationException(
                message="Cannot authorize or dispatch an expired warning. Re-issue required.",
                error_code="STG_WARNING_EXPIRED",
            )

        allowed = cls.VALID_WARNING_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise ValidationException(
                message=f"Invalid warning state transition from {current_status.value} to {target_status.value}.",
                error_code="STG_INVALID_STATE_TRANSITION",
            )

    @classmethod
    def sanitize_and_verify_warning_content(cls, headline: str, body: str) -> None:
        """
        Enforces Language Safety: Rejects ungrounded alarmist statements in warning drafts.
        Prevents algorithmic predictions from masquerading as definitive closures or evacuations.
        """
        upper_text = f"{headline} {body}".upper()
        # Ensure mandatory distinction keywords are respected
        forbidden_absolute_claims = [
            "LANDSLIDE WILL OCCUR",
            "DEFINITELY COLLAPSED",
            "ROAD CLOSED BY AI",
            "EVACUATION ORDERED BY SYSTEM",
        ]
        for claim in forbidden_absolute_claims:
            if claim in upper_text:
                raise ValidationException(
                    message=f"Safety Language Violation: Warning content contains prohibited absolute claim '{claim}'. "
                    f"Use non-alarmist advisory terms preserving uncertainty ('POTENTIALLY AFFECTED', 'ADVISORY WATCH').",
                    error_code="STG_LANGUAGE_SAFETY_VIOLATION",
                )
