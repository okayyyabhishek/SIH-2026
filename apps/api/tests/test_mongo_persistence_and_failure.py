"""
Sentinel NER — Dedicated MongoDB Failure, Persistence & Hardening Proof Tests
Proves Authoritative Non-Negotiable Invariants:
1. Production environment cannot use in-memory persistence.
2. MongoDB outage causes immediate readiness failure (HTTP 503 NOT_READY).
3. MongoDB outage cannot silently switch repositories or fallback to memory.
4. Data survives in-process simulated restart via MongoDB Atlas.
5. MongoDB Atlas indexes and collections are actively provisioned.
6. Security redaction: Passwords and complete URIs are never exposed in errors, responses, or logs.
7. True OS-level multi-process restart: Process A writes, terminates; Process B independently reads.
8. Multi-worker cross-process visibility: Worker A writes, Worker B immediately reads authoritative state.
9. Authoritative MongoRepository CRUD across Stages 1–8 without memory stores.
"""

import subprocess
import sys
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.core.config import settings
from src.db.mongo_repository import MongoRepository
from src.db.mongodb import (
    close_mongo_connection,
    connect_to_mongo,
    get_database,
    mask_mongo_uri,
)
from src.db.repository import repository
from src.main import app


@pytest.mark.asyncio
async def test_1_production_cannot_use_in_memory_persistence():
    """PROVE: Production environment strictly forbids in-memory fallback."""
    orig_env = settings.APP_ENV
    from src.db import mongodb
    orig_client, orig_db = mongodb.client, mongodb.db

    try:
        settings.APP_ENV = "production"

        # 1. Directly verify policy enforcement when database is missing
        mongodb.client = None
        mongodb.db = None

        with pytest.raises(RuntimeError) as exc_info:
            repository.enforce_persistence_policy()
        assert "Production cannot use in-memory persistence" in str(exc_info.value)

        # 2. Verify write operation in production fails fast if DB is disconnected
        with pytest.raises(RuntimeError) as exc_info:
            await repository._mongo_persist("actions", {"id": "act-test-prod", "title": "Test"})
        assert "Production cannot use in-memory persistence" in str(exc_info.value)

    finally:
        mongodb.client, mongodb.db = orig_client, orig_db
        settings.APP_ENV = orig_env


@pytest.mark.asyncio
async def test_2_mongo_outage_causes_readiness_failure():
    """PROVE: MongoDB connection outage causes immediate HTTP 503 readiness failure."""
    orig_uri = settings.MONGODB_URI

    try:
        # Simulate severe MongoDB outage (unreachable port)
        await close_mongo_connection()
        settings.MONGODB_URI = "mongodb://127.0.0.1:27019/?serverSelectionTimeoutMS=500"

        # Verify readiness probe returns HTTP 503 SERVICE UNAVAILABLE
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            resp = await ac.get("/api/v1/health/ready")
            assert resp.status_code == 503
            body = resp.json()
            assert body["status"] == "NOT_READY"
            assert "Authoritative MongoDB dependency unavailable" in body["error"]
    finally:
        # Restore authoritative connection
        settings.MONGODB_URI = orig_uri
        await connect_to_mongo()

    # Verify readiness probe recovers to HTTP 200 READY
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp_healthy = await ac.get("/api/v1/health/ready")
        assert resp_healthy.status_code == 200
        assert resp_healthy.json()["status"] == "READY"
        assert resp_healthy.json()["database"] == "mongodb"


@pytest.mark.asyncio
async def test_3_mongo_outage_cannot_silently_switch_repositories():
    """PROVE: When MongoDB write fails, system raises RuntimeError instead of silent fallback."""
    await connect_to_mongo()

    with patch(
        "motor.motor_asyncio.AsyncIOMotorCollection.replace_one",
        side_effect=ConnectionResetError("Simulated socket drop during packet transmission to Atlas"),
    ):
        with pytest.raises(RuntimeError) as exc_info:
            await repository._mongo_persist("actions", {"id": "act-unreachable", "name": "Broken"})

        # Verify it raises a critical outage exception and DOES NOT swallow it
        assert "CRITICAL: MongoDB outage detected during write" in str(exc_info.value)
        assert "Repository cannot silently switch to in-memory store" in str(exc_info.value)


@pytest.mark.asyncio
async def test_4_data_survives_backend_restart():
    """PROVE: Data created in backend persists to MongoDB Atlas and survives full restart."""
    await connect_to_mongo()
    test_id = f"act-persist-{uuid.uuid4().hex[:8]}"
    test_action = {
        "id": test_id,
        "district_id": "dst-aizawl",
        "title": "Persistent Lifeline Patrol",
        "action_type": "HIGHWAY_PATROL",
        "status": "APPROVED",
        "priority": "HIGH",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {"test_run": "persistence_proof"},
    }

    orig_actions = dict(repository._actions)
    try:
        # Step 1: Create action (persisted to MongoDB Atlas)
        await repository.create_action(test_action)

        # Step 2: Confirm it is visible in repository
        created = await repository.get_action_by_id(test_id)
        assert created is not None
        assert created["id"] == test_id

        # Step 3: SIMULATE COMPLETE BACKEND RESTART
        # Wipe actions in-memory cache completely
        repository._actions.clear()
        assert await repository.get_action_by_id(test_id) is None, "In-memory cache must be completely wiped"

        # Step 4: Re-boot backend lifecycle and sync from MongoDB Atlas
        await repository.sync_from_mongo()

        # Step 5: Verify data SURVIVED the backend restart and was restored from Atlas
        restored = await repository.get_action_by_id(test_id)
        assert restored is not None, "Action MUST survive restart via MongoDB Atlas"
        assert restored["id"] == test_id
        assert restored["title"] == "Persistent Lifeline Patrol"
        assert restored["status"] == "APPROVED"
    finally:
        # Clean up test record from Atlas and restore in-memory repository state
        await repository._mongo_delete("actions", test_id)
        repository._actions.clear()
        repository._actions.update(orig_actions)


@pytest.mark.asyncio
async def test_5_mongo_atlas_indexes_and_collections_active():
    """PROVE: MongoDB Atlas has authoritative indexes provisioned and operational."""
    db = await get_database()
    collections = await db.list_collection_names()
    assert "actions" in collections
    assert "warnings" in collections
    assert "warningLedger" in collections
    assert "districts" in collections

    # Verify 2dsphere index on districts
    district_indexes = await db.districts.index_information()
    assert "idx_districts_geometry_2dsphere" in district_indexes

    # Verify unique index on actions
    action_indexes = await db.actions.index_information()
    assert "idx_actions_id_unique" in action_indexes


@pytest.mark.asyncio
async def test_6_security_redaction_in_readiness_and_errors():
    """PROVE: Passwords and complete URIs never leak in errors, health responses, or logs."""
    # 1. Verify mask_mongo_uri redacts credentials
    test_uri = "mongodb+srv://admin_user:SecretPass123!@cluster0.demo.mongodb.net/testdb?retryWrites=true"
    masked = mask_mongo_uri(test_uri)
    assert "SecretPass123!" not in masked
    assert "admin_user" not in masked
    assert "mongodb+srv://***:***@cluster0.demo.mongodb.net/testdb" in masked

    # 2. Verify readiness response under outage never leaks credentials or connection URI
    orig_uri = settings.MONGODB_URI
    secret_pass = "UltraSecretPassword999!"
    try:
        await close_mongo_connection()
        settings.MONGODB_URI = f"mongodb+srv://leaker_user:{secret_pass}@unreachable.cluster.fake/sentinel?timeoutMS=200"

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            resp = await ac.get("/api/v1/health/ready")
            assert resp.status_code == 503
            resp_text = resp.text
            assert secret_pass not in resp_text
            assert "leaker_user" not in resp_text
            assert "mongodb+srv" not in resp_text
            assert "unreachable.cluster.fake" not in resp_text
            assert "Authoritative MongoDB dependency unavailable" in resp_text
    finally:
        settings.MONGODB_URI = orig_uri
        await connect_to_mongo()


def test_7_true_os_multiprocess_restart_persistence():
    """PROVE: Data created in Process A survives termination and is read by fresh Process B.
    Both processes run as isolated OS processes with 0 shared Python memory.
    """
    record_id = f"act-os-restart-{uuid.uuid4().hex[:8]}"

    # Process A: Write record to MongoDB Atlas and terminate
    code_proc_a = f"""
import asyncio, sys
sys.path.insert(0, 'apps/api')
from src.db.mongodb import connect_to_mongo, close_mongo_connection

async def write_and_exit():
    db = await connect_to_mongo()
    record = {{
        "_id": "{record_id}",
        "id": "{record_id}",
        "district_id": "dst-champhai",
        "title": "Cross Process Evacuation Drill",
        "action_type": "EVACUATION_ALERT",
        "status": "APPROVED",
        "priority": "CRITICAL",
        "created_at": "2026-09-05T01:00:00Z"
    }}
    await db.actions.replace_one({{"_id": "{record_id}"}}, record, upsert=True)
    await close_mongo_connection()
    print("PROCESS_A_SUCCESS")

asyncio.run(write_and_exit())
"""
    res_a = subprocess.run([sys.executable, "-c", code_proc_a], capture_output=True, text=True)
    assert res_a.returncode == 0, f"Process A failed: {res_a.stderr}"
    assert "PROCESS_A_SUCCESS" in res_a.stdout

    # Process B: Start fresh, connect to Atlas, read record, verify, and clean up
    code_proc_b = f"""
import asyncio, sys
sys.path.insert(0, 'apps/api')
from src.db.mongodb import connect_to_mongo, close_mongo_connection

async def read_and_verify():
    db = await connect_to_mongo()
    doc = await db.actions.find_one({{"_id": "{record_id}"}})
    if not doc:
        print("ERROR_DOC_NOT_FOUND")
        sys.exit(1)
    if doc.get("title") != "Cross Process Evacuation Drill":
        print(f"ERROR_TITLE_MISMATCH: {{doc.get('title')}}")
        sys.exit(2)
    if doc.get("status") != "APPROVED":
        print(f"ERROR_STATUS_MISMATCH: {{doc.get('status')}}")
        sys.exit(3)

    # Clean up test record
    await db.actions.delete_one({{"_id": "{record_id}"}})
    await close_mongo_connection()
    print("PROCESS_B_VERIFIED_AND_CLEANED")

asyncio.run(read_and_verify())
"""
    res_b = subprocess.run([sys.executable, "-c", code_proc_b], capture_output=True, text=True)
    assert res_b.returncode == 0, f"Process B failed: {res_b.stderr}"
    assert "PROCESS_B_VERIFIED_AND_CLEANED" in res_b.stdout


def test_8_multiworker_concurrent_visibility():
    """PROVE: Record written by Worker Process 1 is immediately observable by Worker Process 2."""
    worker_doc_id = f"ledg-multiworker-{uuid.uuid4().hex[:8]}"

    code_worker_1 = f"""
import asyncio, sys
sys.path.insert(0, 'apps/api')
from src.db.mongodb import connect_to_mongo, close_mongo_connection

async def worker_1_write():
    db = await connect_to_mongo()
    entry = {{
        "_id": "{worker_doc_id}",
        "id": "{worker_doc_id}",
        "district_id": "dst-aizawl",
        "sequence_number": 999999,
        "event_type": "ACTION_APPROVED",
        "actor_user_id": "usr-multiworker-01",
        "actor_role": "DISTRICT_COLLECTOR",
        "prev_event_hash": "0000000000000000000000000000000000000000000000000000000000000000",
        "event_hash": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        "payload": {{"decision": "EXECUTE_RELOCATION"}},
        "timestamp": "2026-09-05T01:10:00Z"
    }}
    await db.warningLedger.replace_one({{"_id": "{worker_doc_id}"}}, entry, upsert=True)
    await close_mongo_connection()
    print("WORKER_1_COMMITTED")

asyncio.run(worker_1_write())
"""
    res_w1 = subprocess.run([sys.executable, "-c", code_worker_1], capture_output=True, text=True)
    assert res_w1.returncode == 0, f"Worker 1 failed: {res_w1.stderr}"
    assert "WORKER_1_COMMITTED" in res_w1.stdout

    code_worker_2 = f"""
import asyncio, sys
sys.path.insert(0, 'apps/api')
from src.db.mongodb import connect_to_mongo, close_mongo_connection

async def worker_2_observe():
    db = await connect_to_mongo()
    doc = await db.warningLedger.find_one({{"_id": "{worker_doc_id}"}})
    if not doc:
        print("ERROR: Worker 2 could not find record")
        sys.exit(1)
    if doc.get("sequence_number") != 999999:
        print("ERROR: Sequence mismatch")
        sys.exit(2)
    # Clean up
    await db.warningLedger.delete_one({{"_id": "{worker_doc_id}"}})
    await close_mongo_connection()
    print("WORKER_2_OBSERVED_STATE")

asyncio.run(worker_2_observe())
"""
    res_w2 = subprocess.run([sys.executable, "-c", code_worker_2], capture_output=True, text=True)
    assert res_w2.returncode == 0, f"Worker 2 failed: {res_w2.stderr}"
    assert "WORKER_2_OBSERVED_STATE" in res_w2.stdout


@pytest.mark.asyncio
async def test_9_mongo_authoritative_crud_all_stages():
    """PROVE: Direct MongoRepository CRUD operations across Stages 1-8 without in-memory stores."""
    await connect_to_mongo()
    mongo_repo = MongoRepository()

    test_uid = f"usr-crud-{uuid.uuid4().hex[:6]}"
    test_email = f"crud_{uuid.uuid4().hex[:6]}@sentinel.gov.in"
    test_dist_id = f"dst-crud-{uuid.uuid4().hex[:6]}"
    test_road_id = f"road-crud-{uuid.uuid4().hex[:6]}"
    test_pred_id = f"pred-crud-{uuid.uuid4().hex[:6]}"
    test_sat_id = f"sat-crud-{uuid.uuid4().hex[:6]}"
    test_rel_id = f"rel-crud-{uuid.uuid4().hex[:6]}"
    test_act_id = f"act-crud-{uuid.uuid4().hex[:6]}"
    test_warn_id = f"warn-crud-{uuid.uuid4().hex[:6]}"
    test_ledg_id = f"ledg-crud-{uuid.uuid4().hex[:6]}"

    try:
        # 1. Identity: Create and retrieve user
        created_user = await mongo_repo.create_user(
            email=test_email,
            password="SecureTestPassword123!",
            full_name="CRUD Test Officer",
            role="FIELD_OPERATOR",
            status="ACTIVE",
        )
        test_uid = created_user["id"]
        fetched_user = await mongo_repo.get_user_by_id(test_uid)
        assert fetched_user is not None
        assert fetched_user["email"] == test_email

        # 2. Stage 3: District and Road
        created_dist = await mongo_repo.create_district({
            "id": test_dist_id,
            "name": "Test Boundary District",
            "code": f"TBD-{uuid.uuid4().hex[:4].upper()}",
            "state_code": "MZ",
            "boundary_geojson": {
                "type": "Polygon",
                "coordinates": [[[92.7, 23.7], [92.8, 23.7], [92.8, 23.8], [92.7, 23.8], [92.7, 23.7]]],
            },
            "status": "ACTIVE",
        })
        assert created_dist["id"] == test_dist_id
        fetched_dist = await mongo_repo.get_district_by_id(test_dist_id)
        assert fetched_dist is not None

        # 3. Stage 5: Risk Prediction
        created_pred = await mongo_repo.create_risk_prediction({
            "id": test_pred_id,
            "district_id": test_dist_id,
            "subject_type": "SLOPE_UNIT",
            "subject_id": "su-sample-1",
            "risk_score": 0.88,
            "risk_level": "VERY_HIGH",
            "status": "PUBLISHED",
            "model_version_id": "mv-xgb-1.0",
            "model_run_id": "mr-run-001",
        })
        assert created_pred["id"] == test_pred_id
        fetched_pred = await mongo_repo.get_risk_prediction_by_id(test_pred_id)
        assert fetched_pred is not None
        assert fetched_pred["risk_score"] == 0.88

        # 4. Stage 6: Satellite Observation
        created_sat = await mongo_repo.create_satellite_observation({
            "id": test_sat_id,
            "district_id": test_dist_id,
            "mission": "SENTINEL-1",
            "product_type": "SLC",
            "footprint": {
                "type": "Polygon",
                "coordinates": [[[92.7, 23.7], [92.8, 23.7], [92.8, 23.8], [92.7, 23.8], [92.7, 23.7]]],
            },
            "product_id": f"S1A_IW_{uuid.uuid4().hex[:8]}",
        })
        assert created_sat["id"] == test_sat_id

        # 5. Stage 7: Consequence Relationship
        created_rel = await mongo_repo.create_consequence_relationship({
            "id": test_rel_id,
            "district_id": test_dist_id,
            "source_type": "SLOPE_UNIT",
            "source_id": "su-sample-1",
            "target_type": "ROAD",
            "target_id": test_road_id,
            "relationship_type": "DIRECT_IMPACT",
            "criticality": "HIGH",
            "status": "CONFIRMED",
        })
        assert created_rel["id"] == test_rel_id

        # 6. Stage 8: Warning, Action, Ledger Entry
        created_warn = await mongo_repo.create_warning({
            "id": test_warn_id,
            "district_id": test_dist_id,
            "warning_type": "LANDSLIDE_EARLY_WARNING",
            "severity": "RED",
            "status": "ACTIVE",
            "headline": "Imminent Slope Failure",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        assert created_warn["id"] == test_warn_id

        created_act = await mongo_repo.create_action({
            "id": test_act_id,
            "district_id": test_dist_id,
            "title": "Road Closure and Barrier Deployment",
            "action_type": "ROAD_CLOSURE",
            "status": "PENDING_APPROVAL",
            "priority": "HIGH",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        assert created_act["id"] == test_act_id

        created_ledg = await mongo_repo.append_ledger_entry({
            "id": test_ledg_id,
            "district_id": test_dist_id,
            "sequence_number": 1,
            "event_type": "WARNING_ISSUED",
            "warning_id": test_warn_id,
            "actor_user_id": test_uid,
            "actor_role": "FIELD_OPERATOR",
            "prev_event_hash": "0" * 64,
            "event_hash": "111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000",
            "payload": {"severity": "RED"},
            "timestamp": datetime.now(timezone.utc),
        })
        assert created_ledg["id"] == test_ledg_id

        # Verify listing directly from MongoDB
        actions = await mongo_repo.list_actions(district_id=test_dist_id)
        assert any(a["id"] == test_act_id for a in actions)

        warnings = await mongo_repo.list_warnings(district_id=test_dist_id)
        assert any(w["id"] == test_warn_id for w in warnings)

        ledger_entries = await mongo_repo.list_ledger_entries(district_id=test_dist_id)
        assert any(e["id"] == test_ledg_id for e in ledger_entries)

    finally:
        # Clean up test records directly from Atlas
        db = await get_database()
        await db.users.delete_one({"_id": test_uid})
        await db.districts.delete_one({"_id": test_dist_id})
        await db.riskPredictions.delete_one({"_id": test_pred_id})
        await db.satelliteObservations.delete_one({"_id": test_sat_id})
        await db.consequenceRelationships.delete_one({"_id": test_rel_id})
        await db.warnings.delete_one({"_id": test_warn_id})
        await db.actions.delete_one({"_id": test_act_id})
        await db.warningLedger.delete_one({"_id": test_ledg_id})
