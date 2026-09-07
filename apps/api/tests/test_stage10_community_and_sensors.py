"""
Sentinel NER — Stage 10 Community Hazard Intelligence & Field Sensor Test Suite
Validates:
1. Citizen report creation, duplicate prevention, GeoJSON point validation.
2. Media reference security (path traversal prevention, mime-types, size limits).
3. CitizenReportStateMachine transitions, rejection of invalid leaps.
4. Mandatory human verification rule (rejection of automated/system verification, role check).
5. Explainable spatial-temporal clustering and non-verification assertion.
6. Moderation event auditing with required operational rationale.
7. Physical sensor registration with uniqueness and district validation.
8. Sensor telemetry quality validation (valid, out_of_range, clock_skew, finite bounds).
9. Sensor freshness evaluation (LIVE <= 15m, RECENT <= 1h, STALE <= 24h, OFFLINE > 24h).
10. Telemetry batch ingestion and evidence recording (non-autonomous rule).
11. Security: RBAC, BOLA, district scoping, citizen role restrictions.
12. Persistence: Document isolation and summary aggregations.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
from httpx import AsyncClient

from src.core.community.clustering import CommunityClusteringEngine
from src.core.community.state_machine import CitizenReportStateMachine
from src.core.errors import AuthorizationException, ValidationException
from src.core.security.jwt import create_access_token
from src.core.sensors.ingestion_engine import SensorIngestionEngine
from src.core.sensors.validator import SensorTelemetryValidator
from src.db.repository import repository
from src.schemas.community import (
    CitizenReport,
    CitizenReportCreate,
    LocationSource,
    MediaReference,
    ModerationState,
    ReportCategory,
    ReportStatus,
)
from src.schemas.geojson import GeoJSONPoint
from src.schemas.sensor import (
    ObservationQuality,
    Sensor,
    SensorFreshness,
    SensorIngestionBatch,
    SensorRegistrationRequest,
    SensorStatus,
    SensorType,
    TelemetryItem,
)


@pytest.fixture(autouse=True)
async def clear_repos():
    await repository.clear_all()
    await repository.seed_dev_data_if_empty()
    yield
    await repository.clear_all()
    await repository.seed_dev_data_if_empty()


async def get_token_for(email: str = "ddma.aizawl@sentinel.ner.internal") -> str:
    user = await repository.get_user_by_email(email)
    if not user:
        await repository.seed_dev_data_if_empty()
        user = await repository.get_user_by_email(email)
    assert user is not None, f"User {email} not found"
    return create_access_token(
        subject=user["id"],
        claims={"email": user["email"], "role": user["role"], "district_id": user.get("district_id")},
    )


# =========================================================================
# 1. CITIZEN REPORT CREATION & VALIDATION
# =========================================================================

@pytest.mark.asyncio
async def test_citizen_report_creation_and_coordinate_bounds(client: AsyncClient):
    token = await get_token_for("ddma.aizawl@sentinel.ner.internal")

    # Valid report
    payload = {
        "district_id": "dst-aizawl",
        "location": {"type": "Point", "coordinates": [92.7176, 23.7271]},
        "location_accuracy_m": 12.5,
        "category": "LANDSLIDE",
        "description": "Active road fissure on Durtlang road",
    }
    res = await client.post(
        "/api/v1/community/reports",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["id"].startswith("cr-")
    assert data["status"] == "SUBMITTED"
    assert data["moderation_state"] == "UNMODERATED"
    assert data["category"] == "LANDSLIDE"

    # Out of bounds coordinates (lat > 90)
    invalid_payload = {
        "district_id": "dst-aizawl",
        "location": {"type": "Point", "coordinates": [92.7176, 123.7271]},
        "category": "LANDSLIDE",
    }
    res_err = await client.post(
        "/api/v1/community/reports",
        json=invalid_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_err.status_code == 422


@pytest.mark.asyncio
async def test_duplicate_report_detection(client: AsyncClient):
    token = await get_token_for("ddma.aizawl@sentinel.ner.internal")

    payload = {
        "district_id": "dst-aizawl",
        "location": {"type": "Point", "coordinates": [92.7176, 23.7271]},
        "category": "ROCKFALL",
        "description": "Boulders on slope road",
    }
    res1 = await client.post(
        "/api/v1/community/reports",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Exact duplicate within past 60s
    dup_payload = {
        "district_id": "dst-aizawl",
        "location": {"type": "Point", "coordinates": [92.7177, 23.7272]},
        "category": "ROCKFALL",
        "description": "Duplicate boulder report",
    }
    res2 = await client.post(
        "/api/v1/community/reports",
        json=dup_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 400
    assert res2.json()["error"]["code"] == "STG_DUPLICATE_COMMUNITY_REPORT"


# =========================================================================
# 2. MEDIA REFERENCE SECURITY
# =========================================================================

def test_media_reference_path_traversal_prevention():
    # Attempt directory traversal with '..'
    with pytest.raises(ValueError, match="Path traversal"):
        MediaReference(
            object_key="../../etc/passwd",
            content_type="image/jpeg",
            size_bytes=1024,
            checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploaded_at=datetime.now(timezone.utc),
        )

    # Attempt leading slash
    with pytest.raises(ValueError, match="Path traversal"):
        MediaReference(
            object_key="/secret/data.jpg",
            content_type="image/jpeg",
            size_bytes=1024,
            checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploaded_at=datetime.now(timezone.utc),
        )

    # Attempt oversized media (> 25MB)
    with pytest.raises(ValueError, match="25000000|less_than_equal|exceeds"):
        MediaReference(
            object_key="reports/photo.jpg",
            content_type="image/jpeg",
            size_bytes=30 * 1024 * 1024,
            checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploaded_at=datetime.now(timezone.utc),
        )

    # Attempt disallowed mime type
    with pytest.raises(ValueError, match="not permitted|Must be one of|Unsupported"):
        MediaReference(
            object_key="reports/malware.exe",
            content_type="application/x-msdownload",
            size_bytes=1024,
            checksum_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            uploaded_at=datetime.now(timezone.utc),
        )


# =========================================================================
# 3. STATE MACHINE & HUMAN VERIFICATION GATE
# =========================================================================

def test_citizen_report_state_machine_valid_flow():
    # SUBMITTED -> UNVERIFIED -> PROBABLE -> VERIFIED -> ACTIONED -> RESOLVED
    assert CitizenReportStateMachine.is_valid_transition(ReportStatus.SUBMITTED, ReportStatus.UNVERIFIED)
    assert CitizenReportStateMachine.is_valid_transition(ReportStatus.UNVERIFIED, ReportStatus.PROBABLE)
    assert CitizenReportStateMachine.is_valid_transition(ReportStatus.PROBABLE, ReportStatus.VERIFIED)
    assert CitizenReportStateMachine.is_valid_transition(ReportStatus.VERIFIED, ReportStatus.ACTIONED)
    assert CitizenReportStateMachine.is_valid_transition(ReportStatus.ACTIONED, ReportStatus.RESOLVED)

    # Terminal resolved cannot transition backwards to submitted
    assert not CitizenReportStateMachine.is_valid_transition(ReportStatus.RESOLVED, ReportStatus.SUBMITTED)
    assert not CitizenReportStateMachine.is_valid_transition(ReportStatus.REJECTED, ReportStatus.VERIFIED)


def test_human_verification_rule_blocks_system_auto_verification():
    # Attempting to verify report as "system" must fail closed
    with pytest.raises(ValidationException, match="Automated system verification is strictly forbidden"):
        CitizenReportStateMachine.validate_verification_actor(
            target_status=ReportStatus.VERIFIED,
            reviewer_id="system",
            reviewer_role="ADMIN",
        )

    with pytest.raises(ValidationException, match="Automated system verification is strictly forbidden"):
        CitizenReportStateMachine.validate_verification_actor(
            target_status=ReportStatus.VERIFIED,
            reviewer_id="system:ai_model_v1",
            reviewer_role="ADMIN",
        )

    # Attempting to verify report with CITIZEN role must fail closed
    with pytest.raises(AuthorizationException, match="Only authorized forensic roles"):
        CitizenReportStateMachine.validate_verification_actor(
            target_status=ReportStatus.VERIFIED,
            reviewer_id="usr-citizen-01",
            reviewer_role="CITIZEN",
        )

    # Valid human verification
    CitizenReportStateMachine.validate_verification_actor(
        target_status=ReportStatus.VERIFIED,
        reviewer_id="usr-ddma-01",
        reviewer_role="DDMA",
    )


@pytest.mark.asyncio
async def test_moderation_endpoint_records_audit_trail(client: AsyncClient):
    token = await get_token_for("ddma.aizawl@sentinel.ner.internal")

    # Create report
    payload = {
        "district_id": "dst-aizawl",
        "location": {"type": "Point", "coordinates": [92.7176, 23.7271]},
        "category": "SLOPE_MOVEMENT",
        "description": "Retaining wall cracking observed",
    }
    create_res = await client.post(
        "/api/v1/community/reports",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    report_id = create_res.json()["data"]["id"]

    # 1. Transition SUBMITTED -> UNVERIFIED (Initial screening)
    triage_res = await client.post(
        f"/api/v1/community/reports/{report_id}/moderate",
        json={
            "new_status": "UNVERIFIED",
            "reason": "Triage review passed initial screening.",
            "evidence_references": [],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert triage_res.status_code == 200

    # 2. Moderate UNVERIFIED -> VERIFIED (Field inspection)
    mod_res = await client.post(
        f"/api/v1/community/reports/{report_id}/moderate",
        json={
            "new_status": "VERIFIED",
            "reason": "Field inspection by Geologist John confirmed 15cm displacement.",
            "evidence_references": ["GEO-LOG-884", "SITE-PHOTO-12"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mod_res.status_code == 200
    mod_data = mod_res.json()["data"]
    assert mod_data["status"] == "VERIFIED"
    assert mod_data["moderation_state"] == "MODERATED"
    assert len(mod_data["moderation_history"]) == 2
    # Moderation history is sorted descending (newest first)
    assert mod_data["moderation_history"][0]["new_status"] == "VERIFIED"
    assert "Geologist John" in mod_data["moderation_history"][0]["reason"]
    assert mod_data["moderation_history"][1]["new_status"] == "UNVERIFIED"


# =========================================================================
# 4. SPATIAL-TEMPORAL CLUSTERING
# =========================================================================

def test_spatial_temporal_clustering_engine():
    now = datetime.now(timezone.utc)
    reports = [
        CitizenReport(
            id=f"crp-test-{i}",
            reporter_id="usr-1",
            district_id="dst-aizawl",
            location=GeoJSONPoint(type="Point", coordinates=[92.7176 + (i * 0.0005), 23.7271 + (i * 0.0005)]),
            location_source=LocationSource.DEVICE_GPS,
            coordinate_reference="EPSG:4326",
            reported_at=now - timedelta(minutes=i * 10),
            received_at=now,
            category=ReportCategory.LANDSLIDE,
            source="MOBILE_APP",
            status=ReportStatus.UNVERIFIED,
            confidence=0.7,
            moderation_state=ModerationState.UNMODERATED,
            correlation_id="corr-1",
        )
        for i in range(4)
    ]

    clusters = CommunityClusteringEngine.detect_clusters(
        reports=reports,
        max_distance_meters=500,
        max_time_window_hours=48,
        min_cluster_size=3,
    )

    assert len(clusters) == 1
    c = clusters[0]
    assert c.report_count == 4
    assert c.category == ReportCategory.LANDSLIDE
    assert "Cluster does not verify reports" in c.explanation
    assert c.radius_meters > 0


# =========================================================================
# 5. SENSOR REGISTRATION & TELEMETRY VALIDATION
# =========================================================================

@pytest.mark.asyncio
async def test_sensor_registration_and_uniqueness(client: AsyncClient):
    token = await get_token_for("ddma.aizawl@sentinel.ner.internal")

    reg_payload = {
        "sensor_code": "SN-AIZ-RAIN-99",
        "sensor_type": "RAINFALL",
        "manufacturer": "Encardio-Rite",
        "model": "ER-RG-100",
        "serial_reference": "SN-998822",
        "location": {"type": "Point", "coordinates": [92.7176, 23.7271]},
        "elevation_m": 845.0,
        "district_id": "dst-aizawl",
        "installation_site": "Durtlang Station 1",
        "sampling_interval_seconds": 300,
        "measurement_units": "mm/hr",
    }

    res = await client.post(
        "/api/v1/sensors",
        json=reg_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    sensor = res.json()["data"]
    assert sensor["sensor_code"] == "SN-AIZ-RAIN-99"
    assert sensor["status"] == "ACTIVE"

    # Duplicate code rejection
    res_dup = await client.post(
        "/api/v1/sensors",
        json=reg_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_dup.status_code == 400
    assert res_dup.json()["error"]["code"] == "STG_DUPLICATE_SENSOR_CODE"


def test_sensor_telemetry_bounds_and_clock_skew():
    now = datetime.now(timezone.utc)

    # 1. Valid rainfall
    item_valid = TelemetryItem(metric="rain_rate", value=45.0, unit="mm/hr", observed_at=now)
    q, r = SensorTelemetryValidator.validate_observation(SensorType.RAINFALL, item_valid, now=now)
    assert q == ObservationQuality.VALID

    # 2. Out of range rainfall (negative)
    item_neg = TelemetryItem(metric="rain_rate", value=-5.0, unit="mm/hr", observed_at=now)
    q_neg, r_neg = SensorTelemetryValidator.validate_observation(SensorType.RAINFALL, item_neg, now=now)
    assert q_neg == ObservationQuality.OUT_OF_RANGE

    # 3. Out of range rainfall (> 500 mm/hr)
    item_high = TelemetryItem(metric="rain_rate", value=999.0, unit="mm/hr", observed_at=now)
    q_high, r_high = SensorTelemetryValidator.validate_observation(SensorType.RAINFALL, item_high, now=now)
    assert q_high == ObservationQuality.OUT_OF_RANGE

    # 4. Out of range soil moisture (> 100%)
    item_sm = TelemetryItem(metric="volumetric_water_content", value=105.0, unit="%", observed_at=now)
    q_sm, r_sm = SensorTelemetryValidator.validate_observation(SensorType.SOIL_MOISTURE, item_sm, now=now)
    assert q_sm == ObservationQuality.OUT_OF_RANGE

    # 5. Future clock skew (> 60s ahead)
    future_time = now + timedelta(hours=2)
    item_future = TelemetryItem(metric="rain_rate", value=12.0, unit="mm/hr", observed_at=future_time)
    q_future, r_future = SensorTelemetryValidator.validate_observation(SensorType.RAINFALL, item_future, now=now)
    assert q_future == ObservationQuality.CLOCK_SKEW


def test_sensor_freshness_evaluation():
    now = datetime.now(timezone.utc)

    # LIVE: <= 15 minutes
    assert SensorTelemetryValidator.evaluate_freshness(now - timedelta(minutes=10), now=now) == SensorFreshness.LIVE
    # RECENT: 15 min - 1 hour
    assert SensorTelemetryValidator.evaluate_freshness(now - timedelta(minutes=45), now=now) == SensorFreshness.RECENT
    # STALE: 1 hour - 24 hours
    assert SensorTelemetryValidator.evaluate_freshness(now - timedelta(hours=12), now=now) == SensorFreshness.STALE
    # OFFLINE: > 24 hours
    assert SensorTelemetryValidator.evaluate_freshness(now - timedelta(hours=36), now=now) == SensorFreshness.OFFLINE
    # OFFLINE: None
    assert SensorTelemetryValidator.evaluate_freshness(None, now=now) == SensorFreshness.OFFLINE


# =========================================================================
# 6. INGESTION & AUDIT EVIDENCE RECORDING
# =========================================================================

@pytest.mark.asyncio
async def test_telemetry_batch_ingestion_and_evidence_persistence(client: AsyncClient):
    token = await get_token_for("ddma.aizawl@sentinel.ner.internal")

    # Register sensor
    reg_res = await client.post(
        "/api/v1/sensors",
        json={
            "sensor_code": "SN-AIZ-TILT-01",
            "sensor_type": "TILT",
            "manufacturer": "Amrita IoT",
            "model": "TILT-X2",
            "serial_reference": "SN-TILT-77",
            "location": {"type": "Point", "coordinates": [92.7176, 23.7271]},
            "elevation_m": 820.0,
            "district_id": "dst-aizawl",
            "installation_site": "Slope Pier 3",
            "sampling_interval_seconds": 60,
            "measurement_units": "degrees",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert reg_res.status_code == 201
    sensor_id = reg_res.json()["data"]["id"]

    # Ingest batch
    now_iso = datetime.now(timezone.utc).isoformat()
    ingest_payload = {
        "sensor_id": sensor_id,
        "observations": [
            {"metric": "tilt_angle_x", "value": 1.45, "unit": "degrees", "observed_at": now_iso},
            {"metric": "tilt_angle_y", "value": 0.32, "unit": "degrees", "observed_at": now_iso},
            {"metric": "tilt_angle_z", "value": 150.0, "unit": "degrees", "observed_at": now_iso},  # OUT_OF_RANGE
        ],
    }

    ingest_res = await client.post(
        "/api/v1/sensors/ingest",
        json=ingest_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ingest_res.status_code == 200
    res_data = ingest_res.json()["data"]
    assert res_data["observations_count"] == 3
    assert res_data["ingestion_metadata"]["valid_count"] == 2
    assert res_data["ingestion_metadata"]["flagged_count"] == 1

    # Verify observations list endpoint
    obs_res = await client.get(
        f"/api/v1/sensors/{sensor_id}/observations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert obs_res.status_code == 200
    obs_items = obs_res.json()["data"]["items"]
    assert len(obs_items) == 3
    # Check payload hash is populated
    assert all(o["payload_hash"] is not None for o in obs_items)

    # Check updated freshness on sensor detail
    detail_res = await client.get(
        f"/api/v1/sensors/{sensor_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_res.status_code == 200
    detail_data = detail_res.json()["data"]
    assert detail_data["freshness"] == "LIVE"
    assert detail_data["latest_observation"] is not None


# =========================================================================
# 7. SECURITY & BOLA DISTRICT ISOLATION
# =========================================================================

@pytest.mark.asyncio
async def test_security_district_scoping_and_bola(client: AsyncClient):
    # ddma.aizawl has district_id = dst-aizawl
    token = await get_token_for("ddma.aizawl@sentinel.ner.internal")

    # Attempting to query kolasib sensors with aizawl user token must be forbidden
    res = await client.get(
        "/api/v1/sensors?district_id=dst-kolasib",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "STG_DISTRICT_SCOPE_VIOLATION"

    # Attempting to query kolasib reports with aizawl user token must be forbidden
    res_comm = await client.get(
        "/api/v1/community/reports?district_id=dst-kolasib",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_comm.status_code == 403
    assert res_comm.json()["error"]["code"] == "STG_DISTRICT_SCOPE_VIOLATION"


# =========================================================================
# 8. SUMMARIES & AUDIT PERSISTENCE
# =========================================================================

@pytest.mark.asyncio
async def test_community_and_sensor_summaries(client: AsyncClient):
    token = await get_token_for("ddma.aizawl@sentinel.ner.internal")

    # Community summary
    res_c_sum = await client.get(
        "/api/v1/community/reports/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_c_sum.status_code == 200
    c_sum = res_c_sum.json()["data"]
    assert "total_reports" in c_sum
    assert "submitted_count" in c_sum
    assert "cluster_count" in c_sum

    # Sensor summary
    res_s_sum = await client.get(
        "/api/v1/sensors/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_s_sum.status_code == 200
    s_sum = res_s_sum.json()["data"]
    assert "total_sensors" in s_sum
    assert "live_count" in s_sum
    assert "by_type" in s_sum
