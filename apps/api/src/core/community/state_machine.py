"""
Sentinel NER — Stage 10 Community Report State Machine
Enforces:
1. Strict forward lifecycle: SUBMITTED -> PROCESSING -> UNVERIFIED -> PROBABLE -> VERIFIED -> ACTIONED -> RESOLVED
2. Gated rejection: UNVERIFIED -> REJECTED, PROBABLE -> REJECTED
3. Human-gated verification: Transition to VERIFIED strictly requires an authorized human reviewer.
4. Non-autonomous safety rule: Never automatically mark reports VERIFIED due to GPS, images, AI scores, or predictions.
"""

from typing import Dict, List, Optional
from src.core.errors import ValidationException
from src.schemas.community import ReportStatus


class CitizenReportStateMachine:
    """
    Authoritative state machine for citizen observation reports.
    Prevents unverified citizen reports from mutating operational state without human review.
    """

    ALLOWED_TRANSITIONS: Dict[ReportStatus, List[ReportStatus]] = {
        ReportStatus.SUBMITTED: [
            ReportStatus.PROCESSING,
            ReportStatus.UNVERIFIED,
            ReportStatus.REJECTED,
        ],
        ReportStatus.PROCESSING: [
            ReportStatus.UNVERIFIED,
            ReportStatus.PROBABLE,
            ReportStatus.REJECTED,
        ],
        ReportStatus.UNVERIFIED: [
            ReportStatus.PROBABLE,
            ReportStatus.VERIFIED,
            ReportStatus.REJECTED,
        ],
        ReportStatus.PROBABLE: [
            ReportStatus.VERIFIED,
            ReportStatus.REJECTED,
            ReportStatus.ACTIONED,
        ],
        ReportStatus.VERIFIED: [
            ReportStatus.ACTIONED,
            ReportStatus.RESOLVED,
        ],
        ReportStatus.ACTIONED: [
            ReportStatus.RESOLVED,
        ],
        ReportStatus.RESOLVED: [],  # Terminal state
        ReportStatus.REJECTED: [],  # Terminal state
    }

    @classmethod
    def validate_transition(
        cls,
        current_status: ReportStatus,
        target_status: ReportStatus,
        reviewer_id: Optional[str] = None,
        reviewer_role: Optional[str] = None,
    ) -> None:
        """
        Validates state transition and enforces human authorization for VERIFIED state.
        """
        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, [])
        if target_status not in allowed:
            raise ValidationException(
                message=f"Invalid citizen report transition from {current_status.value} to {target_status.value}.",
                error_code="STG_REPORT_INVALID_STATE_TRANSITION",
            )

        # STRICT HUMAN AUTHORIZATION RULE FOR VERIFIED STATUS:
        # A citizen report can NEVER transition to VERIFIED without an explicit authorized human reviewer.
        if target_status == ReportStatus.VERIFIED:
            cls.validate_verification_actor(
                target_status=target_status,
                reviewer_id=reviewer_id,
                reviewer_role=reviewer_role,
            )

    @classmethod
    def is_valid_transition(cls, current_status: ReportStatus, target_status: ReportStatus) -> bool:
        return target_status in cls.ALLOWED_TRANSITIONS.get(current_status, [])

    @classmethod
    def validate_verification_actor(
        cls,
        target_status: ReportStatus,
        reviewer_id: Optional[str] = None,
        reviewer_role: Optional[str] = None,
    ) -> None:
        if target_status == ReportStatus.VERIFIED:
            if not reviewer_id or reviewer_id.startswith("system:") or reviewer_id == "system":
                raise ValidationException(
                    message="Verification requires explicit authorized human review. Automated system verification is strictly forbidden.",
                    error_code="STG_HUMAN_VERIFICATION_REQUIRED",
                )
            if reviewer_role and reviewer_role not in (
                "PLATFORM_ADMIN",
                "ADMIN",
                "DDMA",
                "OPERATOR",
                "GEOLOGIST",
                "FORENSIC_AUDITOR",
            ):
                from src.core.errors import AuthorizationException
                raise AuthorizationException(
                    message=f"Only authorized forensic roles can verify citizen reports. Role '{reviewer_role}' is not permitted.",
                    error_code="STG_INSUFFICIENT_MODERATION_ROLE",
                )
