"""
Sentinel NER — Stage 8 Action Domain Schemas & Contracts
Defines operational action models, recommendation structures, human authorizations,
execution tracking, and ground verification outcomes.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

NON_AUTONOMOUS_ACTION_DISCLAIMER = (
    "NON-AUTONOMOUS CONTROL PRINCIPLE: Operational actions are decision-support recommendations only. "
    "The system does NOT automatically dispatch personnel, close roads, or order evacuations. "
    "All interventions require explicit review and authorization by an authenticated official within their statutory jurisdiction."
)


class ActionType(str, Enum):
    FIELD_INSPECTION = "FIELD_INSPECTION"
    ENGINEERING_REVIEW = "ENGINEERING_REVIEW"
    ROAD_ASSESSMENT = "ROAD_ASSESSMENT"
    ASSET_INSPECTION = "ASSET_INSPECTION"
    SATELLITE_REVIEW = "SATELLITE_REVIEW"
    GEOLOGICAL_REVIEW = "GEOLOGICAL_REVIEW"
    AUTHORITY_REVIEW = "AUTHORITY_REVIEW"
    PUBLIC_WARNING_REVIEW = "PUBLIC_WARNING_REVIEW"


class ActionStatus(str, Enum):
    RECOMMENDED = "RECOMMENDED"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    QUEUED = "QUEUED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    FAILED = "FAILED"


class ActionPriority(str, Enum):
    CRITICAL = "CRITICAL"
    URGENT = "URGENT"
    ELEVATED = "ELEVATED"
    ROUTINE = "ROUTINE"


class AuthorizationDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_MORE_INFORMATION = "REQUEST_MORE_INFORMATION"


class ActionOutcomeType(str, Enum):
    HAZARD_CONFIRMED_MITIGATED = "HAZARD_CONFIRMED_MITIGATED"
    FALSE_ALARM = "FALSE_ALARM"
    STABILIZED = "STABILIZED"
    ESCALATED = "ESCALATED"
    MONITORING_CONTINUED = "MONITORING_CONTINUED"


class ActionEvidence(BaseModel):
    consequence_relationship_id: Optional[str] = Field(None, description="Stage 7 consequence relationship ID")
    slope_unit_id: Optional[str] = Field(None, description="Stage 3 slope unit ID")
    road_id: Optional[str] = Field(None, description="Stage 3 road ID")
    road_chainage_id: Optional[str] = Field(None, description="Stage 3 road chainage ID")
    asset_id: Optional[str] = Field(None, description="Stage 3 asset ID")
    village_id: Optional[str] = Field(None, description="Stage 3 village ID")
    risk_prediction_id: Optional[str] = Field(None, description="Stage 5 risk prediction ID")
    risk_level: Optional[str] = Field(None, description="Stage 5 risk level (HIGH, VERY_HIGH, etc.)")
    satellite_observation_id: Optional[str] = Field(None, description="Stage 6 satellite observation ID")
    insar_displacement_mm: Optional[float] = Field(None, description="Stage 6 LOS range change in mm")
    evidence_timestamps: List[datetime] = Field(default_factory=list, description="Timestamps of source evidence")
    uncertainty_level: str = Field(default="MEDIUM", description="Uncertainty level of evidence bundle")
    evidence_summary: str = Field(..., description="Human-readable factual summary of evidence")


class ActionAuthorization(BaseModel):
    authorizer_user_id: str = Field(..., description="User ID of authorizer")
    authorizer_name: Optional[str] = Field(None, description="Full name of authorizer")
    organization_id: str = Field(..., description="Authorizing organization ID")
    role: str = Field(..., description="Authorizer role")
    jurisdiction_district_id: str = Field(..., description="District jurisdiction of authorizer")
    decision: AuthorizationDecision = Field(..., description="Authorization decision")
    decision_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    justification: str = Field(..., min_length=5, description="Audit justification comment for decision")
    evidence_snapshot_version: str = Field(default="v1.0", description="Version of evidence evaluated")
    policy_version: str = Field(default="sentinel-auth-policy-v1.0", description="Authorization policy revision")


class ActionExecution(BaseModel):
    assigned_agency_id: str = Field(..., description="Responsible agency (PWD, BRO, DDMA, etc.)")
    assigned_personnel: Optional[List[str]] = Field(default_factory=list, description="Field officers or engineers")
    started_at: Optional[datetime] = Field(None, description="Execution start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Execution completion timestamp")
    execution_notes: Optional[str] = Field(None, description="Operational notes recorded during execution")
    failure_reason: Optional[str] = Field(None, description="Detailed explanation if execution failed")


class ActionOutcome(BaseModel):
    outcome_type: ActionOutcomeType = Field(..., description="Categorical outcome of action")
    ground_observations: str = Field(..., min_length=10, description="Verified physical conditions observed on site")
    mitigation_applied: Optional[str] = Field(None, description="Remediation or mitigation measures taken")
    follow_up_recommended: bool = Field(default=False, description="Whether subsequent monitoring or actions are recommended")
    recorded_by: str = Field(..., description="User ID of officer recording outcome")
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Action(BaseModel):
    id: str = Field(default_factory=lambda: f"act-{uuid4().hex[:12]}", description="Immutable action identifier")
    title: str = Field(..., min_length=5, max_length=200, description="Concise summary title of action")
    action_type: ActionType = Field(..., description="Operational category of action")
    priority: ActionPriority = Field(..., description="Operational urgency priority")
    status: ActionStatus = Field(default=ActionStatus.RECOMMENDED, description="Lifecycle state of action")
    district_id: str = Field(..., description="Authoritative district jurisdiction")
    state_id: str = Field(default="IN-MZ", description="State jurisdiction")
    target_entity_type: str = Field(..., description="ROAD, ASSET, VILLAGE, or SLOPE_UNIT")
    target_entity_id: str = Field(..., description="Identifier of target domain entity")
    target_entity_name: Optional[str] = Field(None, description="Human-readable name of target entity")
    recommended_agency_id: str = Field(..., description="Agency recommended to review and execute (PWD, BRO, DDMA)")
    recommendation_rationale: str = Field(..., min_length=10, description="Non-alarmist objective rationale")
    evidence: ActionEvidence = Field(..., description="Linked multi-stage evidence bundle")
    authorization: Optional[ActionAuthorization] = Field(None, description="Human authorization record")
    execution: Optional[ActionExecution] = Field(None, description="Operational execution tracking")
    outcome: Optional[ActionOutcome] = Field(None, description="Ground verification outcome")
    review_notes: Optional[str] = Field(None, description="Auditable reviewer observations")
    reviewed_by: Optional[str] = Field(None, description="User ID of technical reviewer")
    reviewed_at: Optional[datetime] = Field(None, description="Timestamp when review was completed")
    playbook_id: Optional[str] = Field(None, description="Associated standard operating procedure playbook ID")
    idempotency_key: Optional[str] = Field(None, description="Unique client dispatch idempotency key")
    created_by: str = Field(default="system:consequence-engine", description="Initiator of recommendation")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    effective_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(..., description="Action recommendation expiration timestamp")
    disclaimer: str = Field(default=NON_AUTONOMOUS_ACTION_DISCLAIMER, description="Statutory safety disclaimer")

    @field_validator("expires_at")
    @classmethod
    def validate_expiry(cls, v: datetime, info: Any) -> datetime:
        data = info.data
        eff = data.get("effective_from")
        if eff and v <= eff:
            raise ValueError("expires_at must be strictly greater than effective_from")
        return v


class ActionCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    action_type: ActionType
    priority: ActionPriority
    district_id: str
    target_entity_type: str
    target_entity_id: str
    target_entity_name: Optional[str] = None
    recommended_agency_id: str
    recommendation_rationale: str = Field(..., min_length=10)
    consequence_relationship_id: Optional[str] = None
    playbook_id: Optional[str] = None
    effective_from: Optional[datetime] = None
    expires_at: datetime
    idempotency_key: Optional[str] = None


class ActionReviewRequest(BaseModel):
    review_notes: str = Field(..., min_length=5, description="Auditable reviewer observations")


class ActionAuthorizeRequest(BaseModel):
    decision: AuthorizationDecision = Field(..., description="APPROVE, REJECT, or REQUEST_MORE_INFORMATION")
    justification: str = Field(..., min_length=5, description="Mandatory audit justification comment")


class ActionExecuteRequest(BaseModel):
    assigned_agency_id: str
    assigned_personnel: Optional[List[str]] = Field(default_factory=list)
    execution_notes: Optional[str] = None


class ActionOutcomeRequest(BaseModel):
    outcome_type: ActionOutcomeType
    ground_observations: str = Field(..., min_length=10)
    mitigation_applied: Optional[str] = None
    follow_up_recommended: bool = False


class ActionSummary(BaseModel):
    total_actions: int = 0
    recommended_count: int = 0
    pending_review_count: int = 0
    approved_count: int = 0
    in_progress_count: int = 0
    completed_count: int = 0
    rejected_count: int = 0
    critical_priority_count: int = 0
    urgent_priority_count: int = 0
    district_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
