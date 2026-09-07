"""
Sentinel NER — API v1 Router
Mounts active v1 routes and stage-gated architectural placeholders.
"""

from fastapi import APIRouter

from src.api.v1.actions import router as actions_router
from src.api.v1.assets import router as assets_router
from src.api.v1.audit import router as audit_router
from src.api.v1.auth import router as auth_router
from src.api.v1.consequences import router as consequences_router
from src.api.v1.districts import router as districts_router
from src.api.v1.health import router as health_router
from src.api.v1.insar import router as insar_router
from src.api.v1.landslide_events import router as landslide_events_router
from src.api.v1.organizations import router as organizations_router
from src.api.v1.playbooks import router as playbooks_router
from src.api.v1.risk import router as risk_router
from src.api.v1.road_chainages import router as road_chainages_router
from src.api.v1.roads import router as roads_router
from src.api.v1.satellite import router as satellite_router
from src.api.v1.slope_units import router as slope_units_router
from src.api.v1.spatial import router as spatial_router
from src.api.v1.users import router as users_router
from src.api.v1.villages import router as villages_router
from src.api.v1.warning_ledger import router as warning_ledger_router
from src.api.v1.warnings import router as warnings_router
from src.core.errors import StageNotImplementedException

api_v1_router = APIRouter(prefix="/api/v1")

# Active Stage 1 & Stage 2 Endpoints
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(organizations_router)
api_v1_router.include_router(audit_router)

# Active Stage 3 Domain & Geospatial Endpoints
api_v1_router.include_router(districts_router)
api_v1_router.include_router(slope_units_router)
api_v1_router.include_router(roads_router)
api_v1_router.include_router(road_chainages_router)
api_v1_router.include_router(villages_router)
api_v1_router.include_router(assets_router)
api_v1_router.include_router(landslide_events_router)
api_v1_router.include_router(spatial_router)

# Active Stage 5 Transparent Risk Engine Endpoints
api_v1_router.include_router(risk_router)

# Active Stage 6 Satellite & InSAR Change Intelligence Endpoints
api_v1_router.include_router(satellite_router)
api_v1_router.include_router(insar_router)

# Active Stage 7 Road & Asset Consequence Intelligence Endpoints
api_v1_router.include_router(consequences_router)

# Active Stage 8 Human-Authorized Action, Warning & Intervention Control Endpoints
api_v1_router.include_router(actions_router)
api_v1_router.include_router(warnings_router)
api_v1_router.include_router(playbooks_router)
api_v1_router.include_router(warning_ledger_router)

# Active Stage 9 Alerting, Notification Delivery & Degraded Connectivity Endpoints
from src.api.v1.alerts import router as alerts_router
from src.api.v1.connectivity import router as connectivity_router

api_v1_router.include_router(alerts_router)
api_v1_router.include_router(connectivity_router)

# Active Stage 10 Community Intelligence & Field Sensor Network Endpoints
from src.api.v1.community import router as community_router
from src.api.v1.sensors import router as sensors_router

api_v1_router.include_router(community_router)
api_v1_router.include_router(sensors_router)

# Stage-Gated Architectural Placeholder for legacy /community-reports/* paths
@api_v1_router.api_route("/community-reports/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def community_reports_placeholder(path: str):
    raise StageNotImplementedException(
        feature_name="Stage 10 Community Intelligence & Field Observations",
        target_stage=10,
    )



