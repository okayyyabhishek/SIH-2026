"""
Sentinel NER — Risk Engine API Endpoints (Stage 5)
Provides versioned endpoints for Risk Predictions, Explanations, Evidence,
Model Registry, and Scoped Execution Runs.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, NotFoundException
from src.core.risk.pipeline import RiskPipelineOrchestrator
from src.core.risk.registry import model_registry
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIEnvelope
from src.schemas.domain import PaginatedResult
from src.schemas.risk import (
    ModelRegistrationRequest,
    ModelRun,
    ModelVersion,
    PredictionExplanation,
    RiskEvidence,
    RiskLevel,
    RiskPrediction,
    RiskRunRequest,
    RiskSubjectType,
)

router = APIRouter(prefix="/risk", tags=["Stage 5 — Transparent Risk Engine"])


# =============================================================================
# RISK PREDICTIONS & EXPLANATIONS
# =============================================================================

@router.get("/predictions", response_model=APIEnvelope[PaginatedResult[RiskPrediction]])
async def list_risk_predictions(
    request: Request,
    subject_type: Optional[RiskSubjectType] = Query(None, description="Filter by subject type"),
    subject_id: Optional[str] = Query(None, description="Filter by subject ID"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    model_version_id: Optional[str] = Query(None, description="Filter by model version"),
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk category"),
    status: Optional[str] = Query(None, description="Filter by prediction status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Retrieves paginated risk predictions scoped by actor role and geographic jurisdiction."""
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    actor_state = current_user.get("state_code")
    actor_org = current_user.get("organization_id")

    # Authoritative Tenancy Scoping
    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect predictions for other districts.")
        effective_district = actor_district or district_id

    items, total = await repository.list_risk_predictions(
        subject_type=subject_type.value if subject_type else None,
        subject_id=subject_id,
        district_id=effective_district,
        state_code=actor_state if actor_role == "STATE_AUTHORITY" else None,
        model_version_id=model_version_id,
        risk_level=risk_level.value if risk_level else None,
        status=status,
        page=page,
        limit=limit,
    )

    # Secondary object-level boundary verification
    scoped_items = []
    for it in items:
        allowed = evaluate_domain_scope_access(
            actor_role=actor_role,
            actor_org_id=actor_org,
            actor_state_code=actor_state,
            actor_district_id=actor_district,
            target_state_code=it.get("state_code"),
            target_district_id=it.get("district_id"),
        )
        if allowed:
            scoped_items.append(RiskPrediction(**it))

    pages = (total + limit - 1) // limit if total > 0 else 1

    return APIEnvelope(
        data=PaginatedResult(
            items=scoped_items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        ),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/predictions/{prediction_id}", response_model=APIEnvelope[RiskPrediction])
async def get_risk_prediction(
    prediction_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Retrieves a single risk prediction with authoritative IDOR / tenant verification."""
    pred = await repository.get_risk_prediction_by_id(prediction_id)
    if not pred:
        raise NotFoundException(f"Risk prediction '{prediction_id}' not found.")

    allowed = evaluate_domain_scope_access(
        actor_role=current_user.get("role"),
        actor_org_id=current_user.get("organization_id"),
        actor_state_code=current_user.get("state_code"),
        actor_district_id=current_user.get("district_id"),
        target_state_code=pred.get("state_code"),
        target_district_id=pred.get("district_id"),
    )
    if not allowed:
        raise ForbiddenException("Actor is not authorized to inspect this risk prediction.")

    return APIEnvelope(
        data=RiskPrediction(**pred),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/predictions/{prediction_id}/explanation", response_model=APIEnvelope[PredictionExplanation])
async def get_prediction_explanation(
    prediction_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Retrieves the machine-readable statistical explanation and feature contributions for a prediction."""
    pred = await repository.get_risk_prediction_by_id(prediction_id)
    if not pred:
        raise NotFoundException(f"Risk prediction '{prediction_id}' not found.")

    allowed = evaluate_domain_scope_access(
        actor_role=current_user.get("role"),
        actor_org_id=current_user.get("organization_id"),
        actor_state_code=current_user.get("state_code"),
        actor_district_id=current_user.get("district_id"),
        target_state_code=pred.get("state_code"),
        target_district_id=pred.get("district_id"),
    )
    if not allowed:
        raise ForbiddenException("Actor is not authorized to access explanation for this prediction.")

    expl = await repository.get_prediction_explanation_by_prediction_id(prediction_id)
    if not expl:
        raise NotFoundException(f"Explanation for prediction '{prediction_id}' not found.")

    return APIEnvelope(
        data=PredictionExplanation(**expl),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/predictions/{prediction_id}/evidence", response_model=APIEnvelope[List[RiskEvidence]])
async def get_prediction_evidence(
    prediction_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Retrieves full source provenance and spatial evidence for a prediction."""
    pred = await repository.get_risk_prediction_by_id(prediction_id)
    if not pred:
        raise NotFoundException(f"Risk prediction '{prediction_id}' not found.")

    allowed = evaluate_domain_scope_access(
        actor_role=current_user.get("role"),
        actor_org_id=current_user.get("organization_id"),
        actor_state_code=current_user.get("state_code"),
        actor_district_id=current_user.get("district_id"),
        target_state_code=pred.get("state_code"),
        target_district_id=pred.get("district_id"),
    )
    if not allowed:
        raise ForbiddenException("Actor is not authorized to access evidence for this prediction.")

    evidence_list = await repository.get_risk_evidence_by_prediction_id(prediction_id)
    typed_evidence = [RiskEvidence(**ev) for ev in evidence_list]

    return APIEnvelope(
        data=typed_evidence,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


# =============================================================================
# MODEL REGISTRY & LIFECYCLE
# =============================================================================

@router.get("/models", response_model=APIEnvelope[List[ModelVersion]])
async def list_model_versions(
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Lists all registered risk model versions and their lifecycle status."""
    models = model_registry.list_models()
    return APIEnvelope(
        data=models,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/models/{model_id}", response_model=APIEnvelope[ModelVersion])
async def get_model_version(
    model_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Retrieves metadata, metrics, limitations, and checksum for a specific model version."""
    model = model_registry.get_model(model_id)
    if not model:
        raise NotFoundException(f"Risk model '{model_id}' not found.")
    return APIEnvelope(
        data=model,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.post("/models", response_model=APIEnvelope[ModelVersion], status_code=201)
async def register_model_version(
    payload: ModelRegistrationRequest,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_MODEL_MANAGE)),
):
    """Registers a new model version (Platform Admin only). Artifact is validated and starts in DRAFT."""
    registered = model_registry.register_model(
        model_name=payload.model_name,
        algorithm=payload.algorithm,
        version=payload.version,
        feature_definition_version=payload.feature_definition_version,
        hyperparameters=payload.hyperparameters,
        weights=payload.weights,
        limitations=payload.limitations,
        metrics=payload.metrics,
        created_by=current_user.get("id", "usr-admin"),
    )
    return APIEnvelope(
        data=registered,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.post("/models/{model_id}/activate", response_model=APIEnvelope[ModelVersion])
async def activate_model_version(
    model_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_MODEL_MANAGE)),
):
    """Activates an approved model version as the operational engine (Platform Admin only)."""
    activated = model_registry.activate_model(
        model_id=model_id,
        approved_by=current_user.get("id", "usr-admin"),
    )
    return APIEnvelope(
        data=activated,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


# =============================================================================
# MODEL RUNS & INFERENCE
# =============================================================================

@router.get("/runs", response_model=APIEnvelope[PaginatedResult[ModelRun]])
async def list_model_runs(
    request: Request,
    model_version_id: Optional[str] = Query(None, description="Filter by model version"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Lists historical and active model execution runs."""
    items, total = await repository.list_model_runs(
        model_version_id=model_version_id, page=page, limit=limit
    )
    typed_runs = [ModelRun(**r) for r in items]
    pages = (total + limit - 1) // limit if total > 0 else 1

    return APIEnvelope(
        data=PaginatedResult(
            items=typed_runs,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        ),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/runs/{run_id}", response_model=APIEnvelope[ModelRun])
async def get_model_run(
    run_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_READ)),
):
    """Retrieves execution metrics and status for a specific model run."""
    run_dict = await repository.get_model_run_by_id(run_id)
    if not run_dict:
        raise NotFoundException(f"Model run '{run_id}' not found.")
    return APIEnvelope(
        data=ModelRun(**run_dict),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.post("/runs", response_model=APIEnvelope[ModelRun], status_code=202)
async def trigger_risk_run(
    payload: RiskRunRequest,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.RISK_RUN)),
):
    """
    Triggers a scoped model inference run over authorized entities.
    Enforces geographic scoping (DDMA cannot run assessment for other districts).
    """
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    actor_state = current_user.get("state_code")
    actor_org = current_user.get("organization_id")
    actor_id = current_user.get("id", "usr-unknown")

    # Authoritative District Scope Enforcement
    target_district = payload.district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if target_district and actor_district and target_district != actor_district:
            raise ForbiddenException(
                f"Actor role '{actor_role}' assigned to district '{actor_district}' cannot trigger runs for '{target_district}'."
            )
        target_district = actor_district or target_district

    corr_id = getattr(request.state, "correlation_id", "default")

    model_run, _ = await RiskPipelineOrchestrator.execute_run(
        actor_id=actor_id,
        actor_role=actor_role,
        actor_org_id=actor_org,
        actor_state_code=actor_state,
        actor_district_id=actor_district,
        target_district_id=target_district,
        model_version_id=payload.model_version_id,
        subject_type=payload.subject_type,
        subject_ids=payload.subject_ids,
        correlation_id=corr_id,
    )

    return APIEnvelope(
        data=model_run,
        correlation_id=corr_id,
    )
