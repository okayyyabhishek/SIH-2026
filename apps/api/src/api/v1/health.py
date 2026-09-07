"""
Sentinel NER — Health and Readiness Probes
Endpoints for container orchestrators, AWS ALB, and operational monitoring.
"""

import os
import time
from typing import Tuple

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from src.core.config import settings
from src.core.logging import correlation_id_ctx
from src.db.mongodb import check_mongo_health
from src.schemas.common import HealthResponse, SubsystemHealth

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])

# Record application boot time
START_TIME = time.time()


def check_s3_readiness() -> Tuple[bool, str]:
    """
    Lightweight, safe check for AWS S3 bucket accessibility without heavy satellite downloads.
    """
    is_prod = settings.APP_ENV in ("production", "staging")
    backend = getattr(settings, "STORAGE_BACKEND", "local")

    if is_prod and backend != "s3":
        return False, "STORAGE_BACKEND must be 's3' in production/staging environments."

    if backend == "s3" or is_prod:
        bucket = settings.AWS_S3_BUCKET or settings.S3_BUCKET_NAME
        if not bucket:
            return False, "AWS_S3_BUCKET is not configured."
        region = settings.AWS_REGION or "eu-north-1"
        try:
            import boto3
            from botocore.config import Config
            from botocore.exceptions import ClientError

            boto_config = Config(
                region_name=region,
                retries={"max_attempts": 2, "mode": "standard"},
                connect_timeout=3,
                read_timeout=5,
            )
            client_kwargs = {
                "service_name": "s3",
                "region_name": region,
                "config": boto_config,
            }
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                client_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                client_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            if settings.S3_ENDPOINT_URL:
                client_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

            s3_client = boto3.client(**client_kwargs)
            s3_client.head_bucket(Bucket=bucket)
            return True, f"Bucket '{bucket}' accessible"
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "Unknown")
            return False, f"S3 bucket '{bucket}' inaccessible ({code})"
        except Exception as e:
            return False, f"S3 check failed: {str(e)}"
    else:
        base_dir = getattr(settings, "LOCAL_STORAGE_PATH", "./data/storage")
        if os.path.exists(base_dir) and os.access(base_dir, os.W_OK):
            return True, f"Local directory '{base_dir}' accessible"
        return True, "Local storage backend active"


def check_notification_readiness() -> Tuple[bool, str]:
    """
    Verifies required notification gateway configuration without dispatching notifications.
    """
    is_prod = settings.APP_ENV in ("production", "staging")
    provider = (getattr(settings, "NOTIFICATION_PROVIDER", "auto") or "auto").lower()

    if is_prod:
        if provider == "simulated":
            return False, "NOTIFICATION_PROVIDER='simulated' is rejected in production/staging."
        effective_provider = "aws_sns" if provider == "auto" else provider
        if effective_provider == "aws_sns":
            if not getattr(settings, "AWS_SNS_REGION", None) and not getattr(settings, "AWS_REGION", None):
                return False, "AWS_SNS_REGION must be configured for aws_sns provider."
            return True, f"AWS SNS provider configured (region: {settings.AWS_SNS_REGION or settings.AWS_REGION})"
        elif effective_provider == "webhook":
            if not getattr(settings, "NOTIFICATION_WEBHOOK_URL", None):
                return False, "NOTIFICATION_WEBHOOK_URL is required for webhook provider in production."
            return True, "HTTP webhook provider configured"
        else:
            return False, f"Unsupported notification provider '{provider}' in production."
    else:
        effective_provider = "simulated" if provider == "auto" else provider
        return True, f"Provider configured ({effective_provider})"


@router.get(
    "",
    response_model=HealthResponse,
    summary="Aggregated system health status",
    description="Returns composite health state of the Sentinel NER platform and all registered subsystems.",
)
async def get_system_health():
    uptime = time.time() - START_TIME

    # Check live MongoDB Atlas connectivity
    mongo_ok, mongo_latency, mongo_msg = await check_mongo_health()

    # Truthful subsystem checks without fabricating data
    subsystems = [
        SubsystemHealth(
            name="mongodb",
            status="HEALTHY" if mongo_ok else "UNAVAILABLE",
            latency_ms=mongo_latency,
            message=mongo_msg,
            is_external=False,
        ),
        SubsystemHealth(
            name="redis",
            status="STANDBY",
            message="Cache & task broker standby (Stage 3 target)",
            is_external=False,
        ),
        SubsystemHealth(
            name="gsi_nlfc",
            status="STANDBY" if settings.GSI_NLFC_ENABLED else "NOT_CONFIGURED",
            message="GSI National Landslide Forecasting Centre adapter standby",
            is_external=True,
        ),
        SubsystemHealth(
            name="imd_api",
            status="STANDBY" if settings.IMD_API_ENABLED else "NOT_CONFIGURED",
            message="IMD Rainfall and Radar feed adapter standby",
            is_external=True,
        ),
    ]

    overall_status = "HEALTHY" if mongo_ok else ("DEGRADED" if settings.APP_ENV in ("development", "test") else "UNHEALTHY")

    return HealthResponse(
        status=overall_status,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        uptime_seconds=round(uptime, 2),
        subsystems=subsystems,
    )


@router.get(
    "/live",
    summary="Liveness probe",
    description="Kubernetes/ECS liveness probe. Returns HTTP 200 if the process is responsive.",
)
async def liveness_probe():
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "LIVE",
            "correlation_id": correlation_id_ctx.get(),
            "timestamp": time.time(),
        },
    )


@router.get(
    "/ready",
    summary="Readiness probe",
    description="Returns HTTP 200 when ready to receive traffic, HTTP 503 if critical dependencies are down.",
)
async def readiness_probe():
    mongo_ok, latency, mongo_msg = await check_mongo_health()
    s3_ok, s3_msg = check_s3_readiness()
    notify_ok, notify_msg = check_notification_readiness()

    is_prod = settings.APP_ENV in ("production", "staging")

    if is_prod:
        is_ready = mongo_ok and s3_ok and notify_ok
    else:
        is_ready = mongo_ok

    if not is_ready:
        error_msg = "Authoritative MongoDB dependency unavailable" if not mongo_ok else "Critical dependencies unavailable"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "NOT_READY",
                "ready": False,
                "error": error_msg,
                "environment": settings.APP_ENV,
                "dependencies": {
                    "mongodb": {
                        "status": "HEALTHY" if mongo_ok else "UNAVAILABLE",
                        "message": mongo_msg,
                        "latency_ms": latency,
                    },
                    "storage": {
                        "status": "HEALTHY" if s3_ok else "UNAVAILABLE",
                        "message": s3_msg,
                    },
                    "notifications": {
                        "status": "HEALTHY" if notify_ok else "UNAVAILABLE",
                        "message": notify_msg,
                    },
                },
                "correlation_id": correlation_id_ctx.get(),
            },
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "READY",
            "ready": True,
            "database": "mongodb",
            "database_latency_ms": latency,
            "environment": settings.APP_ENV,
            "version": settings.APP_VERSION,
            "dependencies": {
                "mongodb": {"status": "HEALTHY", "latency_ms": latency},
                "storage": {"status": "HEALTHY", "backend": settings.STORAGE_BACKEND},
                "notifications": {"status": "HEALTHY", "provider": settings.NOTIFICATION_PROVIDER},
            },
            "correlation_id": correlation_id_ctx.get(),
        },
    )
