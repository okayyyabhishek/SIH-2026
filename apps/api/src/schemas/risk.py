"""
Sentinel NER — Risk Engine Domain Schemas & Contracts (Stage 5)
Defines authoritative models for Risk Predictions, Feature Snapshots, Provenance,
Model Registry, Model Runs, Explanations, and Evidence.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


class RiskSubjectType(str, Enum):
    SLOPE_UNIT = "SLOPE_UNIT"
    DISTRICT = "DISTRICT"
    ROAD = "ROAD"


class DataQualityState(str, Enum):
    VALID = "VALID"
    STALE = "STALE"
    MISSING = "MISSING"
    OUT_OF_RANGE = "OUT_OF_RANGE"
    LOW_QUALITY = "LOW_QUALITY"
    PARTIAL = "PARTIAL"
    DATA_INSUFFICIENT = "DATA_INSUFFICIENT"


class UncertaintyLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    UNKNOWN = "UNKNOWN"


class ModelLifecycleStatus(str, Enum):
    DRAFT = "DRAFT"
    VALIDATING = "VALIDATING"
    VALIDATED = "VALIDATED"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    RETIRED = "RETIRED"


class ModelRunStatus(str, Enum):
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"
    FAILED = "FAILED"


# Authoritative Risk Threshold Scale V1
RISK_SCALE_V1_THRESHOLDS = {
    "version": "RISK_SCALE_V1",
    "thresholds": [
        {"level": RiskLevel.LOW, "min_score": 0.0, "max_score": 0.25},
        {"level": RiskLevel.MODERATE, "min_score": 0.25, "max_score": 0.50},
        {"level": RiskLevel.HIGH, "min_score": 0.50, "max_score": 0.75},
        {"level": RiskLevel.VERY_HIGH, "min_score": 0.75, "max_score": 1.0},
    ],
    "description": "Deterministic 4-tier risk threshold scale based on calibrated probability / normalized model score.",
}


class RiskFeatureDefinition(BaseModel):
    name: str = Field(..., description="Canonical feature identifier")
    version: str = Field(default="1.0.0", description="Feature specification version")
    description: str = Field(..., description="Human-readable explanation of feature")
    unit: str = Field(..., description="Physical or statistical unit of measurement")
    expected_range: Tuple[float, float] = Field(..., description="Allowable [min, max] range")
    source: str = Field(..., description="Authoritative origin of input data")
    transformation: str = Field(..., description="Mathematical transformation applied")
    aggregation_window: Optional[str] = Field(None, description="Time window (e.g. 24h, 30d)")
    missing_policy: str = Field(default="EXPLICIT_MISSING_INDICATOR", description="Handling strategy on missingness")
    freshness_hours: Optional[float] = Field(default=72.0, description="Maximum allowable age before marked STALE")
    is_training: bool = Field(default=True, description="Whether used for model training")
    is_inference: bool = Field(default=True, description="Whether used for operational inference")


class FeatureProvenance(BaseModel):
    feature_name: str
    feature_value: Optional[float] = None
    unit: str
    source_type: str
    source_identifier: str
    observation_timestamp: datetime
    ingestion_timestamp: datetime
    spatial_reference: Optional[str] = None
    transformation_applied: str
    missingness: bool = False
    quality_state: DataQualityState = DataQualityState.VALID


class RiskFeatureSnapshot(BaseModel):
    id: str
    snapshot_hash_sha256: str
    subject_type: RiskSubjectType
    subject_id: str
    district_id: str
    state_code: str
    feature_values: Dict[str, Optional[float]]
    provenance: List[FeatureProvenance]
    data_quality_state: DataQualityState
    missing_feature_count: int = 0
    stale_feature_count: int = 0
    created_at: datetime


class FeatureContribution(BaseModel):
    feature_name: str
    feature_value: Optional[float] = None
    coefficient: float
    raw_contribution: float
    normalized_weight: float
    direction_of_influence: str = Field(..., description="'INCREASES_RISK', 'DECREASES_RISK', or 'NEUTRAL'")
    association_statement: str = Field(..., description="Non-causal model association statement")


class PredictionExplanation(BaseModel):
    id: str
    prediction_id: str
    top_contributing_features: List[FeatureContribution]
    summary_narrative: str
    baseline_intercept: float
    raw_model_score: float
    disclaimer: str = Field(
        default="Feature importance denotes statistical contribution to the model estimate, not direct physical causality. Predictions are decision support only.",
        description="Mandatory explanation disclaimer",
    )
    created_at: datetime


class RiskEvidence(BaseModel):
    id: str
    prediction_id: str
    subject_type: RiskSubjectType
    subject_id: str
    historical_events_count: int = 0
    historical_event_ids: List[str] = Field(default_factory=list)
    spatial_relation_notes: str
    observations_summary: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class RiskPrediction(BaseModel):
    id: str
    subject_type: RiskSubjectType
    subject_id: str
    geographic_scope: Dict[str, Any] = Field(default_factory=dict)
    district_id: str
    state_code: str
    model_version_id: str
    model_run_id: str
    generated_at: datetime
    valid_from: datetime
    valid_until: datetime
    risk_value: float = Field(..., ge=0.0, le=1.0, description="Normalized risk estimate [0, 1]")
    risk_scale: str = Field(default="RISK_SCALE_V1", description="Associated threshold scale version")
    risk_level: RiskLevel
    raw_score: float
    calibrated_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    calibration_method: Optional[str] = None
    calibration_version: Optional[str] = None
    uncertainty_score: float = Field(default=0.0, ge=0.0, le=1.0)
    uncertainty_level: UncertaintyLevel = UncertaintyLevel.LOW
    confidence_state: str = Field(default="CALIBRATED", description="E.g. CALIBRATED, UNCALIBRATED, LOW_SAMPLE")
    feature_snapshot_id: str
    evidence_ids: List[str] = Field(default_factory=list)
    explanation_id: Optional[str] = None
    data_quality_state: DataQualityState = DataQualityState.VALID
    missing_feature_count: int = 0
    stale_feature_count: int = 0
    status: str = Field(default="COMPLETED", description="'COMPLETED', 'DATA_INSUFFICIENT', or 'FAILED'")
    created_at: datetime


class ModelVersion(BaseModel):
    id: str
    model_name: str
    algorithm: str
    version: str
    feature_definition_version: str
    training_dataset_reference: Optional[str] = None
    training_period: Optional[Dict[str, str]] = None
    validation_period: Optional[Dict[str, str]] = None
    test_period: Optional[Dict[str, str]] = None
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    preprocessing_version: str = "1.0.0"
    threshold_version: str = "RISK_SCALE_V1"
    calibration_version: Optional[str] = None
    artifact_reference: str
    artifact_checksum_sha256: str
    weights: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    limitations: List[str] = Field(default_factory=list)
    status: ModelLifecycleStatus = ModelLifecycleStatus.DRAFT
    created_at: datetime
    approved_by: Optional[str] = None
    activated_at: Optional[datetime] = None


class ModelRun(BaseModel):
    id: str
    model_version_id: str
    initiated_by: str
    execution_time: datetime
    dataset_reference: Optional[str] = None
    district_id: Optional[str] = None
    entities_evaluated: int = 0
    successful_predictions: int = 0
    rejected_predictions: int = 0
    failed_predictions: int = 0
    duration_ms: float = 0.0
    software_commit: str = "head"
    status: ModelRunStatus = ModelRunStatus.RUNNING
    failure_reason: Optional[str] = None
    correlation_id: str


class RiskRunRequest(BaseModel):
    model_version_id: Optional[str] = None
    district_id: Optional[str] = None
    subject_type: Optional[RiskSubjectType] = RiskSubjectType.SLOPE_UNIT
    subject_ids: Optional[List[str]] = None


class ModelRegistrationRequest(BaseModel):
    model_name: str
    algorithm: str
    version: str
    feature_definition_version: str = "1.0.0"
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    weights: Dict[str, Any]
    limitations: List[str] = Field(default_factory=list)
    metrics: Optional[Dict[str, Any]] = None
