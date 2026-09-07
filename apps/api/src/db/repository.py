"""
Sentinel NER — Authoritative Identity & Security Repository
Manages Users, Organizations, Memberships, and Security Audit Events.
Provides dual-mode persistence (MongoDB Atlas when available, in-memory for isolated test environments).
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from src.core.config import settings
from src.core.errors import ConflictException, ValidationException
from src.core.security.crypto import hash_password
from src.core.spatial_utils import (
    distance_point_to_geometry,
    geometry_intersects_bbox,
    point_in_geojson_geometry,
)
from src.schemas.identity import (
    MembershipStatus,
    OrganizationType,
    UserStatus,
)


def _safe_sort_dt(val: Any) -> datetime:
    """Safely converts string or datetime into comparable timezone-aware datetime."""
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            pass
    return datetime.min.replace(tzinfo=timezone.utc)


class InMemoryRepository:
    def __init__(self):
        # In-memory stores: key -> dict
        self._users: Dict[str, Dict[str, Any]] = {}
        self._users_by_email: Dict[str, str] = {}  # email -> user_id
        self._organizations: Dict[str, Dict[str, Any]] = {}
        self._orgs_by_code: Dict[str, str] = {}  # code -> org_id
        self._memberships: Dict[str, Dict[str, Any]] = {}  # membership_id -> dict
        self._revoked_tokens: Dict[str, Dict[str, Any]] = {}  # jti -> dict
        self._refresh_tokens: Dict[str, Dict[str, Any]] = {}  # jti -> dict
        self._security_events: List[Dict[str, Any]] = []

        # Stage 3 Domain Stores
        self._districts: Dict[str, Dict[str, Any]] = {}  # district_id -> dict
        self._districts_by_code: Dict[str, str] = {}  # code -> district_id
        self._slope_units: Dict[str, Dict[str, Any]] = {}  # slope_unit_id -> dict
        self._slope_units_by_code: Dict[str, str] = {}  # code -> slope_unit_id
        self._roads: Dict[str, Dict[str, Any]] = {}  # road_id -> dict
        self._roads_by_code: Dict[str, str] = {}  # road_code -> road_id
        self._road_chainages: Dict[str, Dict[str, Any]] = {}  # chainage_id -> dict
        self._chainages_by_road_and_km: Dict[Tuple[str, float], str] = {}  # (road_id, km) -> id
        self._villages: Dict[str, Dict[str, Any]] = {}  # village_id -> dict
        self._assets: Dict[str, Dict[str, Any]] = {}  # asset_id -> dict
        self._landslide_events: Dict[str, Dict[str, Any]] = {}  # event_id -> dict
        self._events_by_ref: Dict[str, str] = {}  # event_reference -> event_id

        # Stage 5 Risk Engine Stores
        self._risk_predictions: Dict[str, Dict[str, Any]] = {}  # prediction_id -> dict
        self._risk_feature_snapshots: Dict[str, Dict[str, Any]] = {}  # snapshot_id -> dict
        self._model_runs: Dict[str, Dict[str, Any]] = {}  # run_id -> dict
        self._prediction_explanations: Dict[str, Dict[str, Any]] = {}  # expl_id -> dict
        self._prediction_explanations_by_pred_id: Dict[str, str] = {}  # pred_id -> expl_id
        self._risk_evidence: Dict[str, Dict[str, Any]] = {}  # evid_id -> dict
        self._risk_evidence_by_pred_id: Dict[str, List[str]] = {}  # pred_id -> [evid_id, ...]

        # Stage 6 Satellite & InSAR Stores
        self._satellite_observations: Dict[str, Dict[str, Any]] = {}  # obs_id -> dict
        self._insar_observations: Dict[str, Dict[str, Any]] = {}  # obs_id -> dict
        self._satellite_processing_runs: Dict[str, Dict[str, Any]] = {}  # run_id -> dict

        # Stage 7 Consequence Intelligence Stores
        self._consequence_relationships: Dict[str, Dict[str, Any]] = {}  # rel_id -> dict
        self._consequence_runs: Dict[str, Dict[str, Any]] = {}  # run_id -> dict

        # Stage 8 Operational Control Stores
        self._actions: Dict[str, Dict[str, Any]] = {}  # action_id -> dict
        self._warnings: Dict[str, Dict[str, Any]] = {}  # warning_id -> dict
        self._warning_ledger: Dict[str, Dict[str, Any]] = {}  # entry_id -> dict
        self._warning_ledger_by_district: Dict[str, List[str]] = {}  # district_id -> [entry_id, ...]
        self._playbooks: Dict[str, Dict[str, Any]] = {}  # playbook_id -> dict
        self._playbooks_by_code: Dict[str, str] = {}  # playbook_code -> playbook_id

        # Stage 9 Alerting & Degraded Connectivity Stores
        self._alerts: Dict[str, Dict[str, Any]] = {}  # alert_id -> dict
        self._alerts_by_idempotency_key: Dict[str, str] = {}  # key -> alert_id
        self._delivery_jobs: Dict[str, Dict[str, Any]] = {}  # job_id -> dict
        self._alert_acknowledgements: Dict[str, Dict[str, Any]] = {}  # ack_id -> dict
        self._alert_acks_by_alert: Dict[str, List[str]] = {}  # alert_id -> [ack_id, ...]

        # Stage 10 Community Intelligence & Field Sensor Stores
        self._citizen_reports: Dict[str, Dict[str, Any]] = {}  # report_id -> dict
        self._community_clusters: Dict[str, Dict[str, Any]] = {}  # cluster_id -> dict
        self._community_moderation_events: Dict[str, Dict[str, Any]] = {}  # event_id -> dict
        self._sensors: Dict[str, Dict[str, Any]] = {}  # sensor_id -> dict
        self._sensors_by_code: Dict[str, str] = {}  # sensor_code -> sensor_id
        self._sensor_observations: Dict[str, Dict[str, Any]] = {}  # obs_id -> dict

        self._lock = asyncio.Lock()
        self._seeded = False
        self._seed_sync()

    def enforce_persistence_policy(self):
        """Guarantees that production environments cannot operate on in-memory persistence."""
        if settings.APP_ENV in ("production", "staging"):
            from src.db.mongodb import client, db
            if client is None or db is None:
                raise RuntimeError(
                    "CRITICAL SAFETY VIOLATION: Production cannot use in-memory persistence. "
                    "Authoritative MongoDB Atlas connection is mandatory."
                )

    async def _mongo_persist(self, collection_name: str, doc: Dict[str, Any]):
        """Persists document to MongoDB if connected, strictly failing fast on outage rather than falling back."""
        self.enforce_persistence_policy()
        from src.db.mongodb import get_database
        try:
            db = await get_database()
        except Exception as exc:
            if settings.APP_ENV in ("production", "staging"):
                raise RuntimeError(
                    f"CRITICAL: MongoDB outage in {settings.APP_ENV} during write to '{collection_name}'. Error: {exc}"
                ) from exc
            return

        if db is not None:
            try:
                doc_to_save = dict(doc)
                doc_id = doc_to_save.get("id") or doc_to_save.get("_id")
                if doc_id:
                    doc_to_save["_id"] = str(doc_id)
                if "idempotency_key" in doc_to_save and not doc_to_save["idempotency_key"]:
                    doc_to_save.pop("idempotency_key", None)
                await db[collection_name].replace_one(
                    {"_id": doc_to_save["_id"]}, doc_to_save, upsert=True
                )
            except Exception as exc:
                if collection_name == "alerts" and "duplicate key" in str(exc).lower() and doc_to_save.get("idempotency_key"):
                    existing = await db.alerts.find_one({"idempotency_key": doc_to_save["idempotency_key"]})
                    if existing:
                        clean = dict(existing)
                        clean.pop("_id", None)
                        self._alerts[clean["id"]] = clean
                        self._alerts_by_idempotency_key[doc_to_save["idempotency_key"]] = clean["id"]
                        return
                raise RuntimeError(
                    f"CRITICAL: MongoDB outage detected during write to '{collection_name}'. "
                    f"Repository cannot silently switch to in-memory store. Error: {exc}"
                ) from exc

    async def _mongo_delete(self, collection_name: str, doc_id: str):
        """Deletes document from MongoDB if connected, failing fast on outage."""
        self.enforce_persistence_policy()
        from src.db.mongodb import get_database
        try:
            db = await get_database()
        except Exception as exc:
            if settings.APP_ENV in ("production", "staging"):
                raise RuntimeError(
                    f"CRITICAL: MongoDB outage in {settings.APP_ENV} during delete from '{collection_name}'. Error: {exc}"
                ) from exc
            return

        if db is not None:
            try:
                await db[collection_name].delete_one({"_id": str(doc_id)})
            except Exception as exc:
                raise RuntimeError(
                    f"CRITICAL: MongoDB outage detected during delete from '{collection_name}'. "
                    f"Repository cannot silently switch to in-memory store. Error: {exc}"
                ) from exc

    async def sync_from_mongo(self):
        """Loads all persisted entities from MongoDB Atlas to ensure data survives backend restarts."""
        from src.db.mongodb import get_database
        try:
            db = await get_database()
        except Exception:
            return

        async with self._lock:
            # 1. Users
            async for doc in db.users.find({}):
                uid = doc.get("id") or str(doc.get("_id"))
                doc["id"] = uid
                self._users[uid] = doc
                if "email" in doc:
                    self._users_by_email[doc["email"].lower()] = uid

            # 2. Organizations
            async for doc in db.organizations.find({}):
                oid = doc.get("id") or str(doc.get("_id"))
                doc["id"] = oid
                self._organizations[oid] = doc
                if "code" in doc:
                    self._orgs_by_code[doc["code"]] = oid

            # 3. Districts
            async for doc in db.districts.find({}):
                did = doc.get("id") or str(doc.get("_id"))
                doc["id"] = did
                self._districts[did] = doc
                if "code" in doc:
                    self._districts_by_code[doc["code"]] = did

            # 4. Actions
            async for doc in db.actions.find({}):
                aid = doc.get("id") or str(doc.get("_id"))
                doc["id"] = aid
                self._actions[aid] = doc

            # 5. Warnings
            async for doc in db.warnings.find({}):
                wid = doc.get("id") or str(doc.get("_id"))
                doc["id"] = wid
                self._warnings[wid] = doc

            # 6. Warning Ledger
            async for doc in db.warningLedger.find({}).sort("sequence_number", 1):
                lid = doc.get("id") or str(doc.get("_id"))
                doc["id"] = lid
                self._warning_ledger[lid] = doc
                dist_id = doc.get("district_id")
                if dist_id:
                    if dist_id not in self._warning_ledger_by_district:
                        self._warning_ledger_by_district[dist_id] = []
                    if lid not in self._warning_ledger_by_district[dist_id]:
                        self._warning_ledger_by_district[dist_id].append(lid)

            # 7. Revoked Tokens
            async for doc in db.revokedTokens.find({}):
                jti = doc.get("jti") or doc.get("id") or str(doc.get("_id"))
                self._revoked_tokens[jti] = doc

    def _seed_sync(self):
        """Synchronously seeds standard development/test organizations, users, and operational fixtures."""
        if self._seeded or len(self._users) > 0:
            return

        if not getattr(settings, "ENABLE_DEV_FIXTURES", True) or settings.APP_ENV == "production":
            return

        if True:
            now = datetime.now(timezone.utc)

            # 1. Seed Organizations
            sdma = {
                "id": "org-sdma-mizoram",
                "code": "SDMA-MIZORAM",
                "name": "Mizoram State Disaster Management Authority",
                "type": OrganizationType.STATE_AUTHORITY.value,
                "state": "Mizoram",
                "state_code": "MZ",
                "district": None,
                "jurisdiction_scope": "STATE",
                "created_at": now,
                "updated_at": now,
            }
            aizawl_ddma = {
                "id": "org-ddma-aizawl",
                "code": "DDMA-AIZAWL",
                "name": "Aizawl District Disaster Management Authority",
                "type": OrganizationType.DISTRICT_AUTHORITY.value,
                "state": "Mizoram",
                "state_code": "MZ",
                "district": "dst-aizawl",
                "district_id": "dst-aizawl",
                "jurisdiction_scope": "DISTRICT",
                "created_at": now,
                "updated_at": now,
            }
            bro = {
                "id": "org-bro-pushpak",
                "code": "BRO-PUSHPAK",
                "name": "Border Roads Organisation - Project Pushpak",
                "type": OrganizationType.INFRASTRUCTURE.value,
                "state": "Mizoram",
                "state_code": "MZ",
                "district": "dst-aizawl",
                "district_id": "dst-aizawl",
                "jurisdiction_scope": "ORGANIZATION",
                "created_at": now,
                "updated_at": now,
            }

            pwd_org = {
                "id": "org-pwd-mz",
                "code": "ORG-PWD-MZ",
                "name": "Mizoram Public Works Department",
                "type": OrganizationType.INFRASTRUCTURE.value,
                "state": "Mizoram",
                "state_code": "MZ",
                "district": "dst-aizawl",
                "district_id": "dst-aizawl",
                "jurisdiction_scope": "ORGANIZATION",
                "created_at": now,
                "updated_at": now,
            }
            kolasib_ddma = {
                "id": "org-ddma-kolasib",
                "code": "DDMA-KOLASIB",
                "name": "Kolasib District Disaster Management Authority",
                "type": OrganizationType.DISTRICT_AUTHORITY.value,
                "state": "Mizoram",
                "state_code": "MZ",
                "district": "dst-kolasib",
                "district_id": "dst-kolasib",
                "jurisdiction_scope": "DISTRICT",
                "created_at": now,
                "updated_at": now,
            }

            for org in [sdma, aizawl_ddma, bro, pwd_org, kolasib_ddma]:
                self._organizations[org["id"]] = org
                self._orgs_by_code[org["code"]] = org["id"]

            # 2. Seed Users
            users_data = [
                ("usr-admin-1", "admin@sentinel.ner.internal", "Sentinel Platform Administrator", "SentinelAdmin@2026!", "PLATFORM_ADMIN", "org-sdma-mizoram"),
                ("usr-state-1", "state.mizoram@sentinel.ner.internal", "Dr. L. Ralte (State Commissioner)", "SentinelState@2026!", "STATE_AUTHORITY", "org-sdma-mizoram"),
                ("usr-ddma-1", "ddma.aizawl@sentinel.ner.internal", "K. Lalhmingliana (DDMA Incident Commander)", "SentinelDdma@2026!", "DDMA", "org-ddma-aizawl"),
                ("usr-field-1", "field.kolasib@sentinel.ner.internal", "R. Zoramthanga (Highway Patrol Officer)", "SentinelField@2026!", "FIELD_OFFICER", "org-ddma-aizawl"),
                ("usr-field-kolasib", "field.kolasib.district@sentinel.ner.internal", "R. Zoramthanga (Kolasib Officer)", "SentinelField@2026!", "FIELD_OFFICER", "org-ddma-kolasib"),
                ("usr-auditor-1", "auditor.ne@sentinel.ner.internal", "V. Chhetri (Independent Safety Auditor)", "SentinelAuditor@2026!", "OBSERVER_AUDITOR", "org-sdma-mizoram"),
                ("usr-auditor-2", "observer@sentinel.ner.internal", "Sentinel Observer Auditor", "SentinelObserver@2026!", "OBSERVER_AUDITOR", "org-sdma-mizoram"),
                ("usr-citizen-1", "citizen@sentinel.ner.internal", "Lalthanpuia (Citizen Reporter)", "SentinelCitizen@2026!", "CITIZEN_REPORTER", "org-ddma-aizawl"),
            ]

            for uid, email, name, pwd, role, org_id in users_data:
                u_dict = {
                    "id": uid,
                    "email": email.lower(),
                    "password_hash": hash_password(pwd),
                    "full_name": name,
                    "role": role,
                    "organization_id": org_id,
                    "status": UserStatus.ACTIVE.value,
                    "is_demo_fixture": True,
                    "created_at": now,
                    "updated_at": now,
                }
                self._users[uid] = u_dict
                self._users_by_email[email.lower()] = uid

                # Link membership
                m_id = f"mem-{uid}-{org_id}"
                self._memberships[m_id] = {
                    "id": m_id,
                    "user_id": uid,
                    "organization_id": org_id,
                    "role": role,
                    "status": MembershipStatus.ACTIVE.value,
                    "created_at": now,
                    "updated_at": now,
                }

            # 3. Seed Stage 3 Authoritative North East Region (NER) Operational Districts
            ner_districts = [
                # --- MIZORAM (MZ) ---
                {
                    "id": "dst-aizawl",
                    "name": "Aizawl",
                    "code": "MZ-AIZ",
                    "state_code": "MZ",
                    "state_name": "Mizoram",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.65, 23.65], [92.80, 23.65], [92.80, 23.80], [92.65, 23.80], [92.65, 23.65]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Aizawl", "is_synthetic_fixture": True, "terrain": "Steep Hill Ridges"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-kolasib",
                    "name": "Kolasib",
                    "code": "MZ-KOL",
                    "state_code": "MZ",
                    "state_name": "Mizoram",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.60, 24.15], [92.75, 24.15], [92.75, 24.30], [92.60, 24.30], [92.60, 24.15]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Kolasib", "is_synthetic_fixture": True, "terrain": "Corridor Ridge"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-lunglei",
                    "name": "Lunglei",
                    "code": "MZ-LUN",
                    "state_code": "MZ",
                    "state_name": "Mizoram",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.65, 22.80], [92.85, 22.80], [92.85, 23.00], [92.65, 23.00], [92.65, 22.80]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Lunglei", "is_synthetic_fixture": True, "terrain": "Southern Hill Slopes"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-champhai",
                    "name": "Champhai",
                    "code": "MZ-CHA",
                    "state_code": "MZ",
                    "state_name": "Mizoram",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.20, 23.40], [93.40, 23.40], [93.40, 23.60], [93.20, 23.60], [93.20, 23.40]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Champhai", "is_synthetic_fixture": True, "terrain": "Eastern Valley Ridge"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-serchhip",
                    "name": "Serchhip",
                    "code": "MZ-SER",
                    "state_code": "MZ",
                    "state_name": "Mizoram",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.75, 23.25], [92.95, 23.25], [92.95, 23.45], [92.75, 23.45], [92.75, 23.25]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Serchhip", "is_synthetic_fixture": True, "terrain": "Central Valley Escarpment"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                # --- ASSAM (AS) ---
                {
                    "id": "dst-dima-hasao",
                    "name": "Dima Hasao",
                    "code": "AS-DH",
                    "state_code": "AS",
                    "state_name": "Assam",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.80, 25.00], [93.25, 25.00], [93.25, 25.35], [92.80, 25.35], [92.80, 25.00]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Haflong", "is_synthetic_fixture": True, "terrain": "Barail Range / Critical Rail-Road Sinking Corridor"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-kamrup-metro",
                    "name": "Kamrup Metropolitan",
                    "code": "AS-KM",
                    "state_code": "AS",
                    "state_name": "Assam",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[91.60, 26.05], [91.95, 26.05], [91.95, 26.25], [91.60, 26.25], [91.60, 26.05]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Guwahati", "is_synthetic_fixture": True, "terrain": "Brahmaputra Valley Escarpment"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-cachar",
                    "name": "Cachar",
                    "code": "AS-CA",
                    "state_code": "AS",
                    "state_name": "Assam",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.60, 24.60], [93.00, 24.60], [93.00, 25.00], [92.60, 25.00], [92.60, 24.60]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Silchar", "is_synthetic_fixture": True, "terrain": "Barak Valley Gateway"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                # --- MEGHALAYA (ML) ---
                {
                    "id": "dst-east-khasi-hills",
                    "name": "East Khasi Hills",
                    "code": "ML-EKH",
                    "state_code": "ML",
                    "state_name": "Meghalaya",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[91.70, 25.20], [92.10, 25.20], [92.10, 25.65], [91.70, 25.65], [91.70, 25.20]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Shillong", "is_synthetic_fixture": True, "terrain": "Cherrapunji High-Precipitation Plateau Slopes"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-west-jaintia-hills",
                    "name": "West Jaintia Hills",
                    "code": "ML-WJH",
                    "state_code": "ML",
                    "state_name": "Meghalaya",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.05, 25.30], [92.40, 25.30], [92.40, 25.65], [92.05, 25.65], [92.05, 25.30]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Jowai", "is_synthetic_fixture": True, "terrain": "Karst & Sandstone Slope Corridors"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                # --- ARUNACHAL PRADESH (AR) ---
                {
                    "id": "dst-papum-pare",
                    "name": "Papum Pare",
                    "code": "AR-PP",
                    "state_code": "AR",
                    "state_name": "Arunachal Pradesh",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.40, 26.95], [93.85, 26.95], [93.85, 27.25], [93.40, 27.25], [93.40, 26.95]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Yupia", "is_synthetic_fixture": True, "terrain": "Sub-Himalayan Foothills"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-west-kameng",
                    "name": "West Kameng",
                    "code": "AR-WK",
                    "state_code": "AR",
                    "state_name": "Arunachal Pradesh",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.20, 27.05], [92.65, 27.05], [92.65, 27.45], [92.20, 27.45], [92.20, 27.05]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Bomdila", "is_synthetic_fixture": True, "terrain": "Lesser Himalayan Strategic Highway"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-tawang",
                    "name": "Tawang",
                    "code": "AR-TW",
                    "state_code": "AR",
                    "state_name": "Arunachal Pradesh",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[91.70, 27.45], [92.10, 27.45], [92.10, 27.80], [91.70, 27.80], [91.70, 27.45]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Tawang", "is_synthetic_fixture": True, "terrain": "High Altitude Glacial & Rockfall Valley"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                # --- MANIPUR (MN) ---
                {
                    "id": "dst-imphal-west",
                    "name": "Imphal West",
                    "code": "MN-IW",
                    "state_code": "MN",
                    "state_name": "Manipur",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.80, 24.70], [94.05, 24.70], [94.05, 24.95], [93.80, 24.95], [93.80, 24.70]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Lamphelpat", "is_synthetic_fixture": True, "terrain": "Central Valley Boundary"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-noney",
                    "name": "Noney",
                    "code": "MN-NN",
                    "state_code": "MN",
                    "state_name": "Manipur",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.45, 24.65], [93.80, 24.65], [93.80, 24.95], [93.45, 24.95], [93.45, 24.65]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Longmai", "is_synthetic_fixture": True, "terrain": "Tupul Railway Corridor Major Debris Flow Zone"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-churachandpur",
                    "name": "Churachandpur",
                    "code": "MN-CC",
                    "state_code": "MN",
                    "state_name": "Manipur",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.50, 24.15], [93.85, 24.15], [93.85, 24.50], [93.50, 24.50], [93.50, 24.15]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Churachandpur", "is_synthetic_fixture": True, "terrain": "Southern Hill Sector"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                # --- NAGALAND (NL) ---
                {
                    "id": "dst-kohima",
                    "name": "Kohima",
                    "code": "NL-KO",
                    "state_code": "NL",
                    "state_name": "Nagaland",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.95, 25.50], [94.30, 25.50], [94.30, 25.85], [93.95, 25.85], [93.95, 25.50]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Kohima", "is_synthetic_fixture": True, "terrain": "Naga Hills NH-29 Active Sinking Corridor"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-dimapur",
                    "name": "Dimapur",
                    "code": "NL-DI",
                    "state_code": "NL",
                    "state_name": "Nagaland",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.60, 25.75], [93.90, 25.75], [93.90, 26.05], [93.60, 26.05], [93.60, 25.75]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Dimapur", "is_synthetic_fixture": True, "terrain": "Gateway Plains Foothills"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-mokokchung",
                    "name": "Mokokchung",
                    "code": "NL-MK",
                    "state_code": "NL",
                    "state_name": "Nagaland",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[94.35, 26.15], [94.70, 26.15], [94.70, 26.50], [94.35, 26.50], [94.35, 26.15]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Mokokchung", "is_synthetic_fixture": True, "terrain": "Northern Hill Ridge"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                # --- SIKKIM (SK) ---
                {
                    "id": "dst-gangtok",
                    "name": "Gangtok",
                    "code": "SK-GT",
                    "state_code": "SK",
                    "state_name": "Sikkim",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[88.50, 27.20], [88.75, 27.20], [88.75, 27.45], [88.50, 27.45], [88.50, 27.20]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Gangtok", "is_synthetic_fixture": True, "terrain": "Teesta River Valley High Vulnerability"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-namchi",
                    "name": "Namchi",
                    "code": "SK-NM",
                    "state_code": "SK",
                    "state_name": "Sikkim",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[88.20, 27.05], [88.45, 27.05], [88.45, 27.30], [88.20, 27.30], [88.20, 27.05]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Namchi", "is_synthetic_fixture": True, "terrain": "South Sikkim Hill Slopes"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-mangan",
                    "name": "Mangan",
                    "code": "SK-MG",
                    "state_code": "SK",
                    "state_name": "Sikkim",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[88.40, 27.40], [88.70, 27.40], [88.70, 27.75], [88.40, 27.75], [88.40, 27.40]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Mangan", "is_synthetic_fixture": True, "terrain": "North Sikkim High Himalayan Landslide Basin"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                # --- TRIPURA (TR) ---
                {
                    "id": "dst-west-tripura",
                    "name": "West Tripura",
                    "code": "TR-WT",
                    "state_code": "TR",
                    "state_name": "Tripura",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[91.15, 23.70], [91.45, 23.70], [91.45, 24.00], [91.15, 24.00], [91.15, 23.70]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Agartala", "is_synthetic_fixture": True, "terrain": "Alluvial Valley and Hillocks"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "dst-dhalai",
                    "name": "Dhalai",
                    "code": "TR-DH",
                    "state_code": "TR",
                    "state_name": "Tripura",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[91.70, 23.75], [92.05, 23.75], [92.05, 24.15], [91.70, 24.15], [91.70, 23.75]]],
                    },
                    "status": "ACTIVE",
                    "metadata": {"hq": "Ambassa", "is_synthetic_fixture": True, "terrain": "Longtharai & Atharamura Hill Ranges"},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
            ]
            for d in ner_districts:
                self._districts[d["id"]] = d
                self._districts_by_code[d["code"]] = d["id"]


            su_1 = {
                "id": "su-aizawl-001",
                "code": "SU-MZ-AIZ-00101",
                "name": "Durtlang Ridge Sector 1",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [92.71, 23.72],
                            [92.74, 23.72],
                            [92.74, 23.75],
                            [92.71, 23.75],
                            [92.71, 23.72],
                        ]
                    ],
                },
                "area_sqkm": 2.4,
                "status": "ACTIVE",
                "metadata": {"slope_aspect": "NW", "is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._slope_units[su_1["id"]] = su_1
            self._slope_units_by_code[su_1["code"]] = su_1["id"]

            ner_slope_units = [
                {
                    "id": "su-dima-hasao-001",
                    "code": "SU-AS-DH-00101",
                    "name": "Jatinga Ridge Sector 1",
                    "district_id": "dst-dima-hasao",
                    "state_code": "AS",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[92.98, 25.12], [93.06, 25.12], [93.06, 25.20], [92.98, 25.20], [92.98, 25.12]]],
                    },
                    "area_sqkm": 3.2,
                    "status": "ACTIVE",
                    "metadata": {"slope_aspect": "SW", "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "su-shillong-001",
                    "code": "SU-ML-EKH-00101",
                    "name": "Mawkdok Valley Sector 1",
                    "district_id": "dst-east-khasi-hills",
                    "state_code": "ML",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[91.80, 25.35], [91.88, 25.35], [91.88, 25.45], [91.80, 25.45], [91.80, 25.35]]],
                    },
                    "area_sqkm": 4.1,
                    "status": "ACTIVE",
                    "metadata": {"slope_aspect": "S", "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "su-gangtok-001",
                    "code": "SU-SK-GT-00101",
                    "name": "Burtuk Cliff Sector 1",
                    "district_id": "dst-gangtok",
                    "state_code": "SK",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[88.58, 27.30], [88.64, 27.30], [88.64, 27.36], [88.58, 27.36], [88.58, 27.30]]],
                    },
                    "area_sqkm": 1.8,
                    "status": "ACTIVE",
                    "metadata": {"slope_aspect": "E", "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "su-kohima-001",
                    "code": "SU-NL-KO-00101",
                    "name": "Dzükou North Slope Sector 1",
                    "district_id": "dst-kohima",
                    "state_code": "NL",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[94.05, 25.62], [94.14, 25.62], [94.14, 25.70], [94.05, 25.70], [94.05, 25.62]]],
                    },
                    "area_sqkm": 2.9,
                    "status": "ACTIVE",
                    "metadata": {"slope_aspect": "NE", "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "su-itanagar-001",
                    "code": "SU-AR-PP-00101",
                    "name": "Jully Ridge Sector 1",
                    "district_id": "dst-papum-pare",
                    "state_code": "AR",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.58, 27.06], [93.66, 27.06], [93.66, 27.14], [93.58, 27.14], [93.58, 27.06]]],
                    },
                    "area_sqkm": 2.2,
                    "status": "ACTIVE",
                    "metadata": {"slope_aspect": "SE", "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "su-noney-001",
                    "code": "SU-MN-NN-00101",
                    "name": "Tupul Railway Debris Slope 1",
                    "district_id": "dst-noney",
                    "state_code": "MN",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[93.55, 24.74], [93.64, 24.74], [93.64, 24.82], [93.55, 24.82], [93.55, 24.74]]],
                    },
                    "area_sqkm": 3.7,
                    "status": "ACTIVE",
                    "metadata": {"slope_aspect": "NW", "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "su-agartala-001",
                    "code": "SU-TR-WT-00101",
                    "name": "Baramura Ridge Escarpment 1",
                    "district_id": "dst-west-tripura",
                    "state_code": "TR",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[91.24, 23.80], [91.32, 23.80], [91.32, 23.88], [91.24, 23.88], [91.24, 23.80]]],
                    },
                    "area_sqkm": 1.9,
                    "status": "ACTIVE",
                    "metadata": {"slope_aspect": "W", "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
            ]
            for su in ner_slope_units:
                self._slope_units[su["id"]] = su
                self._slope_units_by_code[su["code"]] = su["id"]

            nh54 = {
                "id": "road-nh54-aizawl",
                "name": "NH-54 (Aizawl - Lunglei Corridor)",
                "road_code": "NH-54-MZ",
                "road_type": "NATIONAL_HIGHWAY",
                "authority_organization_id": "org-bro-pushpak",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [92.715, 23.718],
                        [92.720, 23.725],
                        [92.730, 23.738],
                        [92.745, 23.750],
                    ],
                },
                "operational_status": "OPERATIONAL",
                "metadata": {"lanes": 2, "is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._roads[nh54["id"]] = nh54
            self._roads_by_code[nh54["road_code"]] = nh54["id"]

            # NER Regional High-Priority Corridors
            ner_roads = [
                {
                    "id": "road-nh27-haflong",
                    "name": "NH-27 (Barail Hill Expressway)",
                    "road_code": "NH-27-AS",
                    "road_type": "NATIONAL_HIGHWAY",
                    "authority_organization_id": "org-pwd-assam",
                    "district_id": "dst-dima-hasao",
                    "state_code": "AS",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[92.95, 25.10], [93.02, 25.18], [93.15, 25.25]],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"lanes": 4, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "road-nh106-shillong",
                    "name": "NH-106 (Shillong - Cherrapunji Lifeline)",
                    "road_code": "NH-106-ML",
                    "road_type": "NATIONAL_HIGHWAY",
                    "authority_organization_id": "org-pwd-meghalaya",
                    "district_id": "dst-east-khasi-hills",
                    "state_code": "ML",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[91.85, 25.55], [91.88, 25.40], [91.73, 25.28]],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"lanes": 2, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "road-nh10-gangtok",
                    "name": "NH-10 (Teesta River Highway)",
                    "road_code": "NH-10-SK",
                    "road_type": "NATIONAL_HIGHWAY",
                    "authority_organization_id": "org-pwd-sikkim",
                    "district_id": "dst-gangtok",
                    "state_code": "SK",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[88.55, 27.25], [88.61, 27.33], [88.65, 27.38]],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"lanes": 2, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "road-nh29-kohima",
                    "name": "NH-29 (Kohima - Dimapur Strategic Highway)",
                    "road_code": "NH-29-NL",
                    "road_type": "NATIONAL_HIGHWAY",
                    "authority_organization_id": "org-pwd-nagaland",
                    "district_id": "dst-kohima",
                    "state_code": "NL",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[93.80, 25.85], [94.02, 25.72], [94.11, 25.67]],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"lanes": 2, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "road-nh415-itanagar",
                    "name": "NH-415 (Itanagar - Naharlagun Highway)",
                    "road_code": "NH-415-AR",
                    "road_type": "NATIONAL_HIGHWAY",
                    "authority_organization_id": "org-pwd-arunachal",
                    "district_id": "dst-papum-pare",
                    "state_code": "AR",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[93.55, 27.05], [93.62, 27.10], [93.70, 27.12]],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"lanes": 4, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "road-nh37-noney",
                    "name": "NH-37 (Imphal - Jiribam Highway)",
                    "road_code": "NH-37-MN",
                    "road_type": "NATIONAL_HIGHWAY",
                    "authority_organization_id": "org-pwd-manipur",
                    "district_id": "dst-noney",
                    "state_code": "MN",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[93.50, 24.75], [93.60, 24.78], [93.72, 24.80]],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"lanes": 2, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "road-nh8-agartala",
                    "name": "NH-8 (Tripura National Corridor)",
                    "road_code": "NH-8-TR",
                    "road_type": "NATIONAL_HIGHWAY",
                    "authority_organization_id": "org-pwd-tripura",
                    "district_id": "dst-west-tripura",
                    "state_code": "TR",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[91.20, 23.78], [91.28, 23.83], [91.38, 23.90]],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"lanes": 2, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
            ]
            for r in ner_roads:
                self._roads[r["id"]] = r
                self._roads_by_code[r["road_code"]] = r["id"]

            ch_1 = {
                "id": "ch-nh54-12km",
                "road_id": "road-nh54-aizawl",
                "chainage_km": 12.5,
                "geometry": {
                    "type": "Point",
                    "coordinates": [92.720, 23.725],
                },
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "metadata": {"marker_type": "KILOMETER_POST", "is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._road_chainages[ch_1["id"]] = ch_1
            self._chainages_by_road_and_km[(ch_1["road_id"], ch_1["chainage_km"])] = ch_1["id"]

            vil_1 = {
                "id": "vil-durtlang",
                "name": "Durtlang North",
                "village_code": "VIL-MZ-DUR-01",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {
                    "type": "Point",
                    "coordinates": [92.725, 23.735],
                },
                "population": 12400,
                "status": "ACTIVE",
                "metadata": {"is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._villages[vil_1["id"]] = vil_1

            ast_1 = {
                "id": "ast-tuirial-bridge",
                "name": "Tuirial Major Bridge No. 4",
                "asset_type": "BRIDGE",
                "organization_id": "org-bro-pushpak",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {
                    "type": "Point",
                    "coordinates": [92.720, 23.725],
                },
                "operational_status": "OPERATIONAL",
                "metadata": {"span_m": 85.0, "is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._assets[ast_1["id"]] = ast_1

            hosp_aizawl = {
                "id": "asset-hosp-aizawl",
                "name": "Aizawl Civil Hospital",
                "asset_type": "HEALTH",
                "organization_id": "org-ddma-aizawl",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {
                    "type": "Point",
                    "coordinates": [92.7176, 23.7271],
                },
                "operational_status": "OPERATIONAL",
                "metadata": {"beds": 250, "is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._assets[hosp_aizawl["id"]] = hosp_aizawl

            ast_kolasib = {
                "id": "ast-kolasib-chc",
                "name": "Kolasib Community Health Centre",
                "asset_type": "HEALTH",
                "organization_id": "org-ddma-kolasib",
                "district_id": "dst-kolasib",
                "state_code": "MZ",
                "geometry": {
                    "type": "Point",
                    "coordinates": [92.678, 24.225],
                },
                "operational_status": "OPERATIONAL",
                "metadata": {"beds": 50, "is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._assets[ast_kolasib["id"]] = ast_kolasib

            ner_assets = [
                {
                    "id": "ast-haflong-station",
                    "name": "New Haflong Railway Station & Depot",
                    "asset_type": "RAILWAY_STATION",
                    "organization_id": "org-railways",
                    "district_id": "dst-dima-hasao",
                    "state_code": "AS",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [93.024, 25.182],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"platforms": 3, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "ast-shillong-civil-hosp",
                    "name": "Shillong Civil Hospital",
                    "asset_type": "HEALTH",
                    "organization_id": "org-pwd-meghalaya",
                    "district_id": "dst-east-khasi-hills",
                    "state_code": "ML",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [91.884, 25.571],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"beds": 350, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "ast-stnm-hospital",
                    "name": "STNM Multi-Specialty Hospital Gangtok",
                    "asset_type": "HEALTH",
                    "organization_id": "org-pwd-sikkim",
                    "district_id": "dst-gangtok",
                    "state_code": "SK",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [88.612, 27.329],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"beds": 500, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "ast-naga-hospital",
                    "name": "Naga Hospital Authority Kohima",
                    "asset_type": "HEALTH",
                    "organization_id": "org-pwd-nagaland",
                    "district_id": "dst-kohima",
                    "state_code": "NL",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [94.108, 25.674],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"beds": 200, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "ast-tomo-riba-hosp",
                    "name": "Tomo Riba Institute Health Sciences Naharlagun",
                    "asset_type": "HEALTH",
                    "organization_id": "org-pwd-arunachal",
                    "district_id": "dst-papum-pare",
                    "state_code": "AR",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [93.695, 27.108],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"beds": 300, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "ast-tupul-station",
                    "name": "Tupul Railway Yard Lifeline Asset",
                    "asset_type": "RAILWAY_STATION",
                    "organization_id": "org-railways",
                    "district_id": "dst-noney",
                    "state_code": "MN",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [93.612, 24.782],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"track_lines": 4, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
                {
                    "id": "ast-agartala-mc",
                    "name": "Agartala Government Medical College & Hospital",
                    "asset_type": "HEALTH",
                    "organization_id": "org-pwd-tripura",
                    "district_id": "dst-west-tripura",
                    "state_code": "TR",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [91.288, 23.842],
                    },
                    "operational_status": "OPERATIONAL",
                    "metadata": {"beds": 600, "is_synthetic_fixture": True},
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "usr-admin-1",
                    "updated_by": "usr-admin-1",
                },
            ]
            for a in ner_assets:
                self._assets[a["id"]] = a

            evt_1 = {
                "id": "evt-ls-2026-001",
                "event_reference": "LS-2026-MZ-001",
                "event_time": datetime(2026, 6, 12, 9, 30, tzinfo=timezone.utc),
                "detected_time": datetime(2026, 6, 12, 9, 45, tzinfo=timezone.utc),
                "reported_time": datetime(2026, 6, 12, 10, 0, tzinfo=timezone.utc),
                "geometry": {
                    "type": "Point",
                    "coordinates": [92.721, 23.726],
                },
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "source": "OFFICIAL_RECORD",
                "source_reference": "DDMA-AIZ-LOG-442",
                "status": "VERIFIED",
                "description": "Historical debris slide along NH-54 chainage 12.5km blocking single lane.",
                "evidence_references": ["https://storage.sentinel-ner.gov.in/evidence/ls-2026-001-img1.jpg"],
                "metadata": {"volume_est_m3": 450, "is_synthetic_fixture": True},
                "created_at": now,
                "updated_at": now,
                "created_by": "usr-admin-1",
                "updated_by": "usr-admin-1",
            }
            self._landslide_events[evt_1["id"]] = evt_1
            self._events_by_ref[evt_1["event_reference"]] = evt_1["id"]

            # 5. Seed Stage 6 Satellite & InSAR Deterministic Test Fixtures
            try:
                from src.core.satellite.lineage import get_deterministic_test_fixtures
                fixtures = get_deterministic_test_fixtures()
                for obs in fixtures["observations"]:
                    self._satellite_observations[obs.id] = obs.model_dump()
                for insar in fixtures["insar_observations"]:
                    self._insar_observations[insar.id] = insar.model_dump()
            except Exception:
                pass

            # 6. Seed Stage 7 Consequence Intelligence Deterministic Fixtures
            try:
                from src.core.consequence.engine import consequence_engine
                initial_rels = consequence_engine.execute_consequence_analysis(
                    district_id="dst-aizawl",
                    slope_units=list(self._slope_units.values()),
                    roads=list(self._roads.values()),
                    chainages=list(self._road_chainages.values()),
                    assets=list(self._assets.values()),
                    villages=list(self._villages.values()),
                    risk_predictions=list(self._risk_predictions.values()),
                    insar_observations=list(self._insar_observations.values()),
                )
                for r in initial_rels:
                    self._consequence_relationships[r.id] = r.model_dump()

                # Seed an initial completed consequence run for Aizawl
                seed_run = {
                    "id": "run-csq-aizawl-demo",
                    "district_id": "dst-aizawl",
                    "algorithm_version": "sentinel-consequence-v1.0.0",
                    "status": "COMPLETE",
                    "candidate_count": len(self._slope_units) * (len(self._roads) + len(self._assets) + len(self._villages)),
                    "relationship_count": len(initial_rels),
                    "start_time": now,
                    "end_time": now,
                    "duration_seconds": 0.08,
                    "retry_count": 0,
                    "correlation_id": "demo-seed-aizawl",
                    "created_by": "usr-admin-1",
                    "created_at": now,
                }
                self._consequence_runs[seed_run["id"]] = seed_run
            except Exception:
                pass

            # 8. Seed Stage 8 Playbooks, Action Recommendations, and Warnings
            try:
                pb_road = {
                    "id": "pbk-road-exp-v1",
                    "playbook_code": "PB-ROAD-EXPOSURE",
                    "name": "Potential Road Exposure Standard Operating Procedure",
                    "version": "1.0.0",
                    "trigger_criteria": "POTENTIAL_ROAD_EXPOSURE",
                    "applicable_consequence_types": ["ROAD_EXPOSURE", "CHAINAGE_ATTRIBUTION"],
                    "required_authority_role": "DDMA",
                    "description": "Standard operating procedure for evaluating potential road exposure from destabilized slope units without automated road closure.",
                    "steps": [
                        {
                            "step_number": 1,
                            "title": "Review Consequence & InSAR Evidence",
                            "description": "Verify LOS velocity and slope proximity for target road chainages.",
                            "required_role": "PWD",
                            "permitted_action_types": ["ENGINEERING_REVIEW"],
                            "prohibited_actions": ["AUTOMATIC_ROAD_CLOSURE", "AUTOMATIC_EVACUATION", "UNVETTED_PUBLIC_BROADCAST"],
                            "guidance_notes": "Cross-reference chainage with recent monsoon rain gauge reports.",
                        },
                        {
                            "step_number": 2,
                            "title": "Conduct Ground Chainage Inspection",
                            "description": "Inspect road shoulder, culverts, cracks, and toe support.",
                            "required_role": "FIELD_OFFICER",
                            "permitted_action_types": ["ROAD_ASSESSMENT", "FIELD_INSPECTION"],
                            "prohibited_actions": ["AUTOMATIC_ROAD_CLOSURE"],
                            "guidance_notes": "Deploy highway patrol unit with geotagged photographic verification.",
                        },
                        {
                            "step_number": 3,
                            "title": "Submit Engineering Assessment",
                            "description": "Submit structural mitigation or monitoring recommendation.",
                            "required_role": "PWD",
                            "permitted_action_types": ["ROAD_ASSESSMENT"],
                            "prohibited_actions": [],
                            "guidance_notes": "Include pavement distress index and culvert blockage percentage.",
                        },
                        {
                            "step_number": 4,
                            "title": "Civil Defense Advisory Authorization",
                            "description": "Authorize public or agency road advisory if physical risk confirmed.",
                            "required_role": "DDMA",
                            "permitted_action_types": ["AUTHORITY_REVIEW", "PUBLIC_WARNING_REVIEW"],
                            "prohibited_actions": ["AUTOMATIC_ROAD_CLOSURE"],
                            "guidance_notes": "Requires joint sign-off by DDMA Incident Commander.",
                        },
                    ],
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                }
                pb_asset = {
                    "id": "pbk-asset-exp-v1",
                    "playbook_code": "PB-CRITICAL-ASSET",
                    "name": "Critical Asset Proximity Response Protocol",
                    "version": "1.0.0",
                    "trigger_criteria": "CRITICAL_ASSET_PROXIMITY",
                    "applicable_consequence_types": ["ASSET_EXPOSURE"],
                    "required_authority_role": "DDMA",
                    "description": "Procedure for evaluating critical facilities (bridges, power substations, hospitals) exposed to active geomorphic hazard units.",
                    "steps": [
                        {
                            "step_number": 1,
                            "title": "Facility Perimeter Buffer Inspection",
                            "description": "Assess slope toe distances and retaining structures around critical asset.",
                            "required_role": "FIELD_OFFICER",
                            "permitted_action_types": ["ASSET_INSPECTION"],
                            "prohibited_actions": ["AUTOMATIC_EVACUATION"],
                            "guidance_notes": "Focus on foundation soil saturation and slope creep.",
                        },
                        {
                            "step_number": 2,
                            "title": "Structural Engineering Integrity Review",
                            "description": "Evaluate foundation stability and load-bearing soil conditions.",
                            "required_role": "PWD",
                            "permitted_action_types": ["ENGINEERING_REVIEW"],
                            "prohibited_actions": [],
                            "guidance_notes": "Request geotechnical boring data if historical movement exists.",
                        },
                    ],
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                }
                pb_village = {
                    "id": "pbk-village-exp-v1",
                    "playbook_code": "PB-VILLAGE-PROXIMITY",
                    "name": "Village Spatial Exposure Civil Protection Protocol",
                    "version": "1.0.0",
                    "trigger_criteria": "VILLAGE_SPATIAL_EXPOSURE",
                    "applicable_consequence_types": ["VILLAGE_SPATIAL_EXPOSURE"],
                    "required_authority_role": "STATE_AUTHORITY",
                    "description": "Human-directed procedure for engaging community leaders and issuing verified advisory notices.",
                    "steps": [
                        {
                            "step_number": 1,
                            "title": "Local Authority Briefing",
                            "description": "Notify Village Council President regarding elevated runoff/slope hazard.",
                            "required_role": "DDMA",
                            "permitted_action_types": ["AUTHORITY_REVIEW"],
                            "prohibited_actions": ["AUTOMATIC_EVACUATION"],
                            "guidance_notes": "Strictly non-alarmist communication preserving uncertainty.",
                        },
                        {
                            "step_number": 2,
                            "title": "Vulnerability Survey",
                            "description": "Survey hillside drainage channels above habitations.",
                            "required_role": "FIELD_OFFICER",
                            "permitted_action_types": ["FIELD_INSPECTION"],
                            "prohibited_actions": [],
                            "guidance_notes": "Report ground tension cracks or spring flow turbidities.",
                        },
                    ],
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                }
                for pb in [pb_road, pb_asset, pb_village]:
                    self._playbooks[pb["id"]] = pb
                    self._playbooks_by_code[pb["playbook_code"]] = pb["id"]

                # Seed Demo Action Recommendation for Aizawl
                demo_action = {
                    "id": "act-aizawl-nh54-demo",
                    "title": "Road Assessment: NH-54 Chainage km 14.5",
                    "action_type": "ROAD_ASSESSMENT",
                    "priority": "URGENT",
                    "status": "RECOMMENDED",
                    "district_id": "dst-aizawl",
                    "state_id": "IN-MZ",
                    "target_entity_type": "ROAD",
                    "target_entity_id": "road-nh54-aizawl",
                    "target_entity_name": "NH-54 (Aizawl-Silchar Highway)",
                    "recommended_agency_id": "PWD",
                    "recommendation_rationale": "Consequence relationship analysis indicates road 'NH-54' is potentially spatially exposed to slope unit su-aizawl-0128 with estimated HIGH criticality. Verified ground inspection by PWD is recommended to verify drainage, slope stabilization, and physical integrity prior to any civil defense intervention.",
                    "evidence": {
                        "consequence_relationship_id": "csq-demo-aizawl-nh54",
                        "slope_unit_id": "su-aizawl-0128",
                        "road_id": "road-nh54-aizawl",
                        "road_chainage_id": "ch-nh54-14k5",
                        "asset_id": None,
                        "village_id": None,
                        "risk_prediction_id": "pred-aizawl-0128-demo",
                        "risk_level": "HIGH",
                        "satellite_observation_id": "sat-s1-aizawl-demo-1",
                        "insar_displacement_mm": -18.4,
                        "evidence_timestamps": [now],
                        "uncertainty_level": "MEDIUM",
                        "evidence_summary": "Multi-stage evidence: Consequence rel csq-demo-aizawl-nh54, Criticality=HIGH, InSAR velocity=-18.4mm/yr.",
                    },
                    "authorization": None,
                    "execution": None,
                    "outcome": None,
                    "playbook_id": "PB-ROAD-EXPOSURE",
                    "idempotency_key": "idemp-seed-act-1",
                    "created_by": "system:consequence-engine",
                    "created_at": now,
                    "updated_at": now,
                    "effective_from": now,
                    "expires_at": now + timedelta(hours=72),
                    "disclaimer": "NON-AUTONOMOUS CONTROL PRINCIPLE: Operational actions are decision-support recommendations only. The system does NOT automatically dispatch personnel, close roads, or order evacuations. All interventions require explicit review and authorization by an authenticated official within their statutory jurisdiction.",
                }
                self._actions[demo_action["id"]] = demo_action

                # Seed Demo Warning Draft for Aizawl
                demo_warning = {
                    "id": "wrn-aizawl-nh54-demo",
                    "warning_type": "ROAD_HAZARD_ADVISORY",
                    "status": "DRAFT",
                    "headline": "Road Hazard Advisory: Potential Rockfall Watch on NH-54",
                    "body": "Field inspection recommended along NH-54 chainage km 14.5 following continuous precipitation and elevated slope hazard index. Commuters advised to exercise caution and heed official PWD notices.",
                    "mizo_translation": "NH-54 km 14.5 ah lung tla thei dinhmun a awm avangin fimkhur a ngai.",
                    "hindi_translation": "NH-54 किमी 14.5 पर संभावित भूस्खलन को देखते हुए यात्रियों को सावधानी बरतने की सलाह दी जाती है।",
                    "district_id": "dst-aizawl",
                    "state_id": "IN-MZ",
                    "affected_entity_type": "ROAD",
                    "affected_entity_id": "road-nh54-aizawl",
                    "affected_entity_name": "NH-54 (Aizawl-Silchar Highway)",
                    "evidence_ids": ["csq-demo-aizawl-nh54", "pred-aizawl-0128-demo", "sat-s1-aizawl-demo-1"],
                    "risk_prediction_id": "pred-aizawl-0128-demo",
                    "consequence_relationship_id": "csq-demo-aizawl-nh54",
                    "uncertainty_level": "MEDIUM",
                    "issuing_authority_id": "DDMA-AIZAWL",
                    "authorized_by": None,
                    "authorized_at": None,
                    "authorization_comment": None,
                    "recipients": [
                        {
                            "recipient_id": "rcp-pwd-patrol",
                            "recipient_name": "PWD Highway Patrol",
                            "agency_or_community": "PWD",
                            "contact_channel": "WEB_NOTIFICATION",
                            "contact_target": "ops.pwd.aizawl@sentinel.ner.internal",
                            "role": "FIELD_OFFICER",
                            "district_id": "dst-aizawl",
                        },
                        {
                            "recipient_id": "rcp-aizawl-control",
                            "recipient_name": "Aizawl Control Room",
                            "agency_or_community": "DDMA",
                            "contact_channel": "SMS",
                            "contact_target": "+91-98765-XXXX1",
                            "role": "DDMA",
                            "district_id": "dst-aizawl",
                        },
                    ],
                    "deliveries": [],
                    "acknowledgements": [],
                    "escalations": [],
                    "idempotency_key": "idemp-seed-wrn-1",
                    "created_by": "usr-ddma-1",
                    "created_at": now,
                    "updated_at": now,
                    "effective_from": now,
                    "expires_at": now + timedelta(hours=48),
                    "disclaimer": "NON-AUTONOMOUS WARNING PRINCIPLE: Warnings are controlled official communications created under human authorization. Predictions and sensor anomalies do NOT automatically publish public warnings or emergency evacuation orders. Every warning requires statutory civil defense authorization before dispatch.",
                }
                self._warnings[demo_warning["id"]] = demo_warning

                # Seed genesis entry in warning ledger for dst-aizawl
                import hashlib
                import json
                genesis_hash = "0" * 64
                payload = {
                    "action_id": demo_action["id"],
                    "title": demo_action["title"],
                    "action_type": demo_action["action_type"],
                    "priority": demo_action["priority"],
                    "target_entity": demo_action["target_entity_name"],
                    "status": demo_action["status"],
                }
                canon_json = json.dumps(payload, sort_keys=True, default=str)
                payload_h = hashlib.sha256(canon_json.encode("utf-8")).hexdigest()
                raw_block = f"1|{now.isoformat()}|ACTION_CREATED|system:consequence-engine|{genesis_hash}|{payload_h}"
                event_h = hashlib.sha256(raw_block.encode("utf-8")).hexdigest()

                seed_ledger = {
                    "id": "ledg-seed-aizawl-genesis",
                    "sequence_number": 1,
                    "timestamp": now,
                    "event_type": "ACTION_CREATED",
                    "district_id": "dst-aizawl",
                    "warning_id": None,
                    "action_id": demo_action["id"],
                    "actor_user_id": "system:consequence-engine",
                    "actor_role": "SYSTEM",
                    "payload": payload,
                    "prev_event_hash": genesis_hash,
                    "event_hash": event_h,
                }
                self._warning_ledger[seed_ledger["id"]] = seed_ledger
                self._warning_ledger_by_district["dst-aizawl"] = [seed_ledger["id"]]
            except Exception:
                pass

            self._seeded = True

    async def seed_dev_data_if_empty(self):
        """Seeds standard development/test organizations and users."""
        self.enforce_persistence_policy()
        async with self._lock:
            self._seed_sync()

    # ----------------- User Methods -----------------

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self._users.get(user_id)

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        uid = self._users_by_email.get(email.lower().strip())
        return self._users.get(uid) if uid else None

    async def create_user(
        self,
        email: str,
        password: str,
        full_name: str,
        role: str,
        organization_id: Optional[str] = None,
        status: str = UserStatus.ACTIVE.value,
    ) -> Dict[str, Any]:
        async with self._lock:
            norm_email = email.lower().strip()
            if norm_email in self._users_by_email:
                raise ValueError(f"User with email '{norm_email}' already exists.")

            user_id = f"usr-{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)
            user_doc = {
                "id": user_id,
                "email": norm_email,
                "password_hash": hash_password(password),
                "full_name": full_name,
                "role": role,
                "organization_id": organization_id,
                "status": status,
                "created_at": now,
                "updated_at": now,
            }
            self._users[user_id] = user_doc
            self._users_by_email[norm_email] = user_id

            if organization_id:
                m_id = f"mem-{user_id}-{organization_id}"
                self._memberships[m_id] = {
                    "id": m_id,
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "role": role,
                    "status": MembershipStatus.ACTIVE.value,
                    "created_at": now,
                    "updated_at": now,
                }

            return user_doc

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            user = self._users.get(user_id)
            if not user:
                return None
            for k, v in updates.items():
                if v is not None:
                    user[k] = v
            user["updated_at"] = datetime.now(timezone.utc)
            return user

    async def disable_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.update_user(user_id, {"status": UserStatus.DISABLED.value})

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 50,
        organization_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        all_users = list(self._users.values())
        if organization_id:
            all_users = [u for u in all_users if u.get("organization_id") == organization_id]
        if status:
            all_users = [u for u in all_users if u.get("status") == status]
        total = len(all_users)
        paged = all_users[skip : skip + limit]
        return paged, total

    # ----------------- Organization Methods -----------------

    async def get_organization(self, org_id: str) -> Optional[Dict[str, Any]]:
        return self._organizations.get(org_id)

    async def get_organization_by_id(self, org_id: str) -> Optional[Dict[str, Any]]:
        return self._organizations.get(org_id)

    async def get_organization_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        oid = self._orgs_by_code.get(code.upper().strip())
        return self._organizations.get(oid) if oid else None

    async def create_organization(
        self,
        code: str,
        name: str,
        org_type: str,
        state: str = "Mizoram",
        district: Optional[str] = None,
        jurisdiction_scope: str = "DISTRICT",
    ) -> Dict[str, Any]:
        async with self._lock:
            norm_code = code.upper().strip()
            if norm_code in self._orgs_by_code:
                raise ValueError(f"Organization with code '{norm_code}' already exists.")

            org_id = f"org-{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc)
            org_doc = {
                "id": org_id,
                "code": norm_code,
                "name": name,
                "type": org_type,
                "state": state,
                "district": district,
                "jurisdiction_scope": jurisdiction_scope,
                "created_at": now,
                "updated_at": now,
            }
            self._organizations[org_id] = org_doc
            self._orgs_by_code[norm_code] = org_id
            return org_doc

    async def list_organizations(
        self,
        skip: int = 0,
        limit: int = 50,
        org_type: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        all_orgs = list(self._organizations.values())
        if org_type:
            all_orgs = [o for o in all_orgs if o.get("type") == org_type]
        total = len(all_orgs)
        return all_orgs[skip : skip + limit], total

    # ----------------- Membership Methods -----------------

    async def get_membership(self, user_id: str, organization_id: str) -> Optional[Dict[str, Any]]:
        m_id = f"mem-{user_id}-{organization_id}"
        return self._memberships.get(m_id)

    async def create_or_update_membership(
        self,
        user_id: str,
        organization_id: str,
        role: str,
        status: str = MembershipStatus.ACTIVE.value,
    ) -> Dict[str, Any]:
        async with self._lock:
            m_id = f"mem-{user_id}-{organization_id}"
            now = datetime.now(timezone.utc)
            if m_id in self._memberships:
                mem = self._memberships[m_id]
                mem["role"] = role
                mem["status"] = status
                mem["updated_at"] = now
                return mem

            mem = {
                "id": m_id,
                "user_id": user_id,
                "organization_id": organization_id,
                "role": role,
                "status": status,
                "created_at": now,
                "updated_at": now,
            }
            self._memberships[m_id] = mem
            return mem

    async def list_organization_members(
        self,
        organization_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        mems = [m for m in self._memberships.values() if m["organization_id"] == organization_id]
        total = len(mems)
        return mems[skip : skip + limit], total

    async def list_user_memberships(self, user_id: str) -> List[Dict[str, Any]]:
        return [m for m in self._memberships.values() if m["user_id"] == user_id]

    # ----------------- Security Audit Methods -----------------

    async def record_security_event(
        self,
        event_type: str,
        resource: str,
        action: str,
        result: str,
        correlation_id: str,
        actor_user_id: Optional[str] = None,
        actor_role: Optional[str] = None,
        organization_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        async with self._lock:
            event_id = f"evt-{uuid.uuid4().hex}"
            event = {
                "id": event_id,
                "timestamp": datetime.now(timezone.utc),
                "event_type": event_type,
                "actor_user_id": actor_user_id,
                "actor_role": actor_role,
                "organization_id": organization_id,
                "resource": resource,
                "action": action,
                "result": result,
                "correlation_id": correlation_id,
                "client_ip": client_ip,
                "details": details or {},
            }
            self._security_events.append(event)
            return event

    async def list_security_events(
        self,
        skip: int = 0,
        limit: int = 50,
        actor_user_id: Optional[str] = None,
        event_type: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        events = list(reversed(self._security_events))
        if actor_user_id:
            events = [e for e in events if e.get("actor_user_id") == actor_user_id]
        if event_type:
            events = [e for e in events if e.get("event_type") == event_type]
        total = len(events)
        return events[skip : skip + limit], total

    # ==================== TOKEN REVOCATION & SESSION ROTATION ====================

    async def revoke_token(
        self,
        jti: str,
        user_id: Optional[str] = None,
        reason: str = "logout",
        expires_at: Optional[int] = None,
    ) -> None:
        """Persists a revoked token JTI to prevent reuse across all server instances."""
        doc = {
            "jti": jti,
            "id": jti,
            "_id": jti,
            "user_id": user_id,
            "reason": reason,
            "revoked_at": datetime.now(timezone.utc),
            "expires_at": expires_at,
        }
        async with self._lock:
            self._revoked_tokens[jti] = doc
            if jti in self._refresh_tokens:
                self._refresh_tokens[jti]["revoked"] = True
        await self._mongo_persist("revokedTokens", doc)

    async def is_token_revoked(self, jti: str) -> bool:
        """Authoritatively checks if a token JTI has been revoked across all workers."""
        if jti in self._revoked_tokens:
            return True
        from src.db.mongodb import get_database
        try:
            db = await get_database()
            if db is not None:
                found = await db.revokedTokens.find_one({"$or": [{"_id": jti}, {"jti": jti}]})
                if found:
                    async with self._lock:
                        self._revoked_tokens[jti] = found
                    return True
        except Exception:
            pass
        return False

    async def register_refresh_token(
        self,
        jti: str,
        user_id: str,
        family_id: str,
        expires_at: int,
    ) -> None:
        """Registers an issued refresh token under a specific token family."""
        async with self._lock:
            self._refresh_tokens[jti] = {
                "jti": jti,
                "user_id": user_id,
                "family_id": family_id,
                "expires_at": expires_at,
                "revoked": False,
                "replaced_by": None,
                "created_at": datetime.now(timezone.utc),
            }

    async def verify_and_rotate_refresh_token(
        self,
        jti: str,
        user_id: str,
        new_jti: str,
        new_expires_at: int,
    ) -> Tuple[str, Optional[str]]:
        """
        Rotates a refresh token and detects token reuse (RFC 6749 BCP).
        Returns:
            ("VALID", family_id): Rotation successful, new token registered.
            ("REUSED", family_id): Previously rotated token reused! Family invalidated.
            ("INVALID", None): Unknown, expired, or invalid token.
        """
        async with self._lock:
            rec = self._refresh_tokens.get(jti)
            if not rec:
                return ("INVALID", None)

            family_id = rec["family_id"]

            # If the token was revoked due to family compromise, it is rejected as invalid/revoked
            if rec.get("family_compromised"):
                return ("INVALID", family_id)

            # Token Reuse Detection: token was previously rotated to a replacement token!
            if rec.get("replaced_by"):
                # Compromise detected! Invalidate the entire token family.
                for t_jti, t_rec in self._refresh_tokens.items():
                    if t_rec.get("family_id") == family_id:
                        t_rec["revoked"] = True
                        t_rec["family_compromised"] = True
                        self._revoked_tokens[t_jti] = {
                            "jti": t_jti,
                            "user_id": user_id,
                            "reason": "family_compromise_reuse",
                            "revoked_at": datetime.now(timezone.utc),
                            "expires_at": t_rec.get("expires_at"),
                        }
                return ("REUSED", family_id)

            if rec.get("revoked") or jti in self._revoked_tokens:
                return ("INVALID", family_id)

            # Valid rotation
            rec["revoked"] = True
            rec["replaced_by"] = new_jti
            self._revoked_tokens[jti] = {
                "jti": jti,
                "user_id": user_id,
                "reason": "rotated",
                "revoked_at": datetime.now(timezone.utc),
                "expires_at": rec.get("expires_at"),
            }

            # Register replacement token under the same family
            self._refresh_tokens[new_jti] = {
                "jti": new_jti,
                "user_id": user_id,
                "family_id": family_id,
                "expires_at": new_expires_at,
                "revoked": False,
                "replaced_by": None,
                "created_at": datetime.now(timezone.utc),
            }
            return ("VALID", family_id)

    async def invalidate_token_family(self, family_id: str, user_id: Optional[str] = None) -> None:
        """Invalidates all tokens belonging to a session/token family."""
        async with self._lock:
            for jti, rec in self._refresh_tokens.items():
                if rec.get("family_id") == family_id:
                    rec["revoked"] = True
                    rec["family_compromised"] = True
                    self._revoked_tokens[jti] = {
                        "jti": jti,
                        "user_id": user_id or rec.get("user_id"),
                        "reason": "family_invalidation",
                        "revoked_at": datetime.now(timezone.utc),
                        "expires_at": rec.get("expires_at"),
                    }

    # =========================================================================
    # STAGE 3: DOMAIN REPOSITORY METHODS (Dual-Mode In-Memory & Parity)
    # =========================================================================

    # ----------------- 1. Districts -----------------

    async def create_district(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            code = data.get("code", "").strip().upper()
            if code in self._districts_by_code:
                raise ConflictException(f"District with code '{code}' already exists.")

            now = datetime.now(timezone.utc)
            d_id = data.get("id") or f"dst-{uuid.uuid4().hex[:8]}"
            district = {
                **data,
                "id": d_id,
                "code": code,
                "created_at": now,
                "updated_at": now,
                "created_by": actor_id,
                "updated_by": actor_id,
            }
            self._districts[d_id] = district
            self._districts_by_code[code] = d_id
            return district

    DISTRICT_ID_ALIASES = {
        "d-miz-aizawl": "dst-aizawl",
        "d-miz-kolasib": "dst-kolasib",
        "d-miz-lunglei": "dst-lunglei",
        "d-miz-champhai": "dst-champhai",
        "d-miz-serchhip": "dst-serchhip",
    }

    async def get_district(self, district_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if not district_id:
                return None
            doc = self._districts.get(district_id)
            if not doc:
                alias = self.DISTRICT_ID_ALIASES.get(district_id.strip().lower())
                if alias:
                    doc = self._districts.get(alias)
            return doc

    get_district_by_id = get_district

    async def get_district_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if not code:
                return None
            d_id = self._districts_by_code.get(code.strip().upper())
            if not d_id:
                alias = self.DISTRICT_ID_ALIASES.get(code.strip().lower())
                if alias:
                    return self._districts.get(alias)
            return self._districts.get(d_id) if d_id else None

    async def list_districts(
        self,
        skip: int = 0,
        limit: int = 50,
        state_code: Optional[str] = None,
        status: Optional[str] = None,
        containing_point: Optional[List[float]] = None,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        async with self._lock:
            items = list(self._districts.values())
            if state_code:
                items = [d for d in items if d.get("state_code", "").upper() == state_code.strip().upper()]
            if status:
                items = [d for d in items if d.get("status") == status]
            if containing_point:
                items = [d for d in items if point_in_geojson_geometry(containing_point, d.get("geometry", {}))]
            if bbox:
                items = [d for d in items if geometry_intersects_bbox(d.get("geometry", {}), *bbox)]

            items.sort(key=lambda x: x.get("name", ""))
            total = len(items)
            return items[skip : skip + limit], total

    async def update_district(
        self, district_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            d = self._districts.get(district_id)
            if not d:
                return None
            now = datetime.now(timezone.utc)
            for k, v in updates.items():
                if v is not None and k not in ("id", "code", "created_at", "created_by"):
                    d[k] = v
            d["updated_at"] = now
            d["updated_by"] = actor_id
            return d

    # ----------------- 2. Slope Units -----------------

    async def create_slope_unit(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            code = data.get("code", "").strip().upper()
            if code in self._slope_units_by_code:
                raise ConflictException(f"SlopeUnit with code '{code}' already exists.")

            # Foreign key validation: district_id must exist
            district_id = data.get("district_id")
            if not district_id or district_id not in self._districts:
                raise ValidationException(f"Referenced district '{district_id}' does not exist.")

            now = datetime.now(timezone.utc)
            su_id = data.get("id") or f"su-{uuid.uuid4().hex[:8]}"
            su = {
                **data,
                "id": su_id,
                "code": code,
                "created_at": now,
                "updated_at": now,
                "created_by": actor_id,
                "updated_by": actor_id,
            }
            self._slope_units[su_id] = su
            self._slope_units_by_code[code] = su_id
            return su

    async def get_slope_unit(self, slope_unit_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._slope_units.get(slope_unit_id)

    async def get_slope_unit_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            su_id = self._slope_units_by_code.get(code.strip().upper())
            return self._slope_units.get(su_id) if su_id else None

    async def list_slope_units(
        self,
        skip: int = 0,
        limit: int = 50,
        district_id: Optional[str] = None,
        state_code: Optional[str] = None,
        status: Optional[str] = None,
        containing_point: Optional[List[float]] = None,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        async with self._lock:
            items = list(self._slope_units.values())
            if district_id:
                items = [u for u in items if u.get("district_id") == district_id]
            if state_code:
                items = [u for u in items if u.get("state_code", "").upper() == state_code.strip().upper()]
            if status:
                items = [u for u in items if u.get("status") == status]
            if containing_point:
                items = [u for u in items if point_in_geojson_geometry(containing_point, u.get("geometry", {}))]
            if bbox:
                items = [u for u in items if geometry_intersects_bbox(u.get("geometry", {}), *bbox)]

            items.sort(key=lambda x: x.get("code", ""))
            total = len(items)
            return items[skip : skip + limit], total

    async def update_slope_unit(
        self, slope_unit_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            su = self._slope_units.get(slope_unit_id)
            if not su:
                return None
            now = datetime.now(timezone.utc)
            for k, v in updates.items():
                if v is not None and k not in ("id", "code", "created_at", "created_by"):
                    su[k] = v
            su["updated_at"] = now
            su["updated_by"] = actor_id
            return su

    # ----------------- 3. Roads -----------------

    async def create_road(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            code = data.get("road_code", "").strip().upper()
            if code in self._roads_by_code:
                raise ConflictException(f"Road with code '{code}' already exists.")

            # Foreign key checks
            district_id = data.get("district_id")
            if not district_id or district_id not in self._districts:
                raise ValidationException(f"Referenced district '{district_id}' does not exist.")

            auth_org_id = data.get("authority_organization_id")
            if not auth_org_id or auth_org_id not in self._organizations:
                raise ValidationException(f"Referenced authority organization '{auth_org_id}' does not exist.")

            now = datetime.now(timezone.utc)
            r_id = data.get("id") or f"road-{uuid.uuid4().hex[:8]}"
            road = {
                **data,
                "id": r_id,
                "road_code": code,
                "created_at": now,
                "updated_at": now,
                "created_by": actor_id,
                "updated_by": actor_id,
            }
            self._roads[r_id] = road
            self._roads_by_code[code] = r_id
            return road

    async def get_road(self, road_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._roads.get(road_id)

    async def get_road_by_code(self, road_code: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            r_id = self._roads_by_code.get(road_code.strip().upper())
            return self._roads.get(r_id) if r_id else None

    async def list_roads(
        self,
        skip: int = 0,
        limit: int = 50,
        district_id: Optional[str] = None,
        state_code: Optional[str] = None,
        road_type: Optional[str] = None,
        authority_organization_id: Optional[str] = None,
        operational_status: Optional[str] = None,
        nearby_point: Optional[List[float]] = None,
        max_radius_m: float = 5000.0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        async with self._lock:
            items = list(self._roads.values())
            if district_id:
                items = [r for r in items if r.get("district_id") == district_id]
            if state_code:
                items = [r for r in items if r.get("state_code", "").upper() == state_code.strip().upper()]
            if road_type:
                items = [r for r in items if r.get("road_type") == road_type]
            if authority_organization_id:
                items = [r for r in items if r.get("authority_organization_id") == authority_organization_id]
            if operational_status:
                items = [r for r in items if r.get("operational_status") == operational_status]
            if nearby_point:
                items = [
                    r for r in items
                    if distance_point_to_geometry(nearby_point, r.get("geometry", {})) <= max_radius_m
                ]

            items.sort(key=lambda x: x.get("name", ""))
            total = len(items)
            return items[skip : skip + limit], total

    async def update_road(
        self, road_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            r = self._roads.get(road_id)
            if not r:
                return None
            now = datetime.now(timezone.utc)
            for k, v in updates.items():
                if v is not None and k not in ("id", "road_code", "created_at", "created_by"):
                    r[k] = v
            r["updated_at"] = now
            r["updated_by"] = actor_id
            return r

    # ----------------- 4. Road Chainages -----------------

    async def create_road_chainage(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            road_id = data.get("road_id")
            if not road_id or road_id not in self._roads:
                raise ValidationException(f"Referenced road '{road_id}' does not exist.")

            chainage_km = float(data.get("chainage_km", 0.0))
            if chainage_km < 0:
                raise ValidationException("Chainage must be a non-negative value.")

            key = (road_id, round(chainage_km, 4))
            if key in self._chainages_by_road_and_km:
                raise ConflictException(f"Chainage marker at {chainage_km}km on road '{road_id}' already exists.")

            now = datetime.now(timezone.utc)
            ch_id = data.get("id") or f"ch-{uuid.uuid4().hex[:8]}"
            chainage = {
                **data,
                "id": ch_id,
                "chainage_km": chainage_km,
                "created_at": now,
                "updated_at": now,
                "created_by": actor_id,
                "updated_by": actor_id,
            }
            self._road_chainages[ch_id] = chainage
            self._chainages_by_road_and_km[key] = ch_id
            return chainage

    async def get_road_chainage(self, chainage_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._road_chainages.get(chainage_id)

    async def list_road_chainages(
        self,
        skip: int = 0,
        limit: int = 50,
        road_id: Optional[str] = None,
        district_id: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        async with self._lock:
            items = list(self._road_chainages.values())
            if road_id:
                items = [c for c in items if c.get("road_id") == road_id]
            if district_id:
                items = [c for c in items if c.get("district_id") == district_id]

            items.sort(key=lambda x: (x.get("road_id", ""), x.get("chainage_km", 0.0)))
            total = len(items)
            return items[skip : skip + limit], total

    async def update_road_chainage(
        self, chainage_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            ch = self._road_chainages.get(chainage_id)
            if not ch:
                return None
            now = datetime.now(timezone.utc)
            for k, v in updates.items():
                if v is not None and k not in ("id", "road_id", "created_at", "created_by"):
                    ch[k] = v
            ch["updated_at"] = now
            ch["updated_by"] = actor_id
            return ch

    # ----------------- 5. Villages -----------------

    async def create_village(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            district_id = data.get("district_id")
            if not district_id or district_id not in self._districts:
                raise ValidationException(f"Referenced district '{district_id}' does not exist.")

            now = datetime.now(timezone.utc)
            v_id = data.get("id") or f"vil-{uuid.uuid4().hex[:8]}"
            village = {
                **data,
                "id": v_id,
                "created_at": now,
                "updated_at": now,
                "created_by": actor_id,
                "updated_by": actor_id,
            }
            self._villages[v_id] = village
            return village

    async def get_village(self, village_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._villages.get(village_id)

    async def list_villages(
        self,
        skip: int = 0,
        limit: int = 50,
        district_id: Optional[str] = None,
        state_code: Optional[str] = None,
        status: Optional[str] = None,
        nearby_point: Optional[List[float]] = None,
        max_radius_m: float = 5000.0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        async with self._lock:
            items = list(self._villages.values())
            if district_id:
                items = [v for v in items if v.get("district_id") == district_id]
            if state_code:
                items = [v for v in items if v.get("state_code", "").upper() == state_code.strip().upper()]
            if status:
                items = [v for v in items if v.get("status") == status]
            if nearby_point:
                items = [
                    v for v in items
                    if distance_point_to_geometry(nearby_point, v.get("geometry", {})) <= max_radius_m
                ]

            items.sort(key=lambda x: x.get("name", ""))
            total = len(items)
            return items[skip : skip + limit], total

    async def update_village(
        self, village_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            vil = self._villages.get(village_id)
            if not vil:
                return None
            now = datetime.now(timezone.utc)
            for k, v in updates.items():
                if v is not None and k not in ("id", "created_at", "created_by"):
                    vil[k] = v
            vil["updated_at"] = now
            vil["updated_by"] = actor_id
            return vil

    # ----------------- 6. Assets -----------------

    async def create_asset(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            org_id = data.get("organization_id")
            if not org_id or org_id not in self._organizations:
                raise ValidationException(f"Referenced organization '{org_id}' does not exist.")

            district_id = data.get("district_id")
            if not district_id or district_id not in self._districts:
                raise ValidationException(f"Referenced district '{district_id}' does not exist.")

            now = datetime.now(timezone.utc)
            a_id = data.get("id") or f"ast-{uuid.uuid4().hex[:8]}"
            asset = {
                **data,
                "id": a_id,
                "created_at": now,
                "updated_at": now,
                "created_by": actor_id,
                "updated_by": actor_id,
            }
            self._assets[a_id] = asset
            return asset

    async def get_asset(self, asset_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._assets.get(asset_id)

    async def list_assets(
        self,
        skip: int = 0,
        limit: int = 50,
        organization_id: Optional[str] = None,
        district_id: Optional[str] = None,
        state_code: Optional[str] = None,
        asset_type: Optional[str] = None,
        operational_status: Optional[str] = None,
        nearby_point: Optional[List[float]] = None,
        max_radius_m: float = 5000.0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        async with self._lock:
            items = list(self._assets.values())
            if organization_id:
                items = [a for a in items if a.get("organization_id") == organization_id]
            if district_id:
                items = [a for a in items if a.get("district_id") == district_id]
            if state_code:
                items = [a for a in items if a.get("state_code", "").upper() == state_code.strip().upper()]
            if asset_type:
                items = [a for a in items if a.get("asset_type") == asset_type]
            if operational_status:
                items = [a for a in items if a.get("operational_status") == operational_status]
            if nearby_point:
                items = [
                    a for a in items
                    if distance_point_to_geometry(nearby_point, a.get("geometry", {})) <= max_radius_m
                ]

            items.sort(key=lambda x: x.get("name", ""))
            total = len(items)
            return items[skip : skip + limit], total

    async def update_asset(
        self, asset_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            ast = self._assets.get(asset_id)
            if not ast:
                return None
            now = datetime.now(timezone.utc)
            for k, v in updates.items():
                if v is not None and k not in ("id", "created_at", "created_by"):
                    ast[k] = v
            ast["updated_at"] = now
            ast["updated_by"] = actor_id
            return ast

    # ----------------- 7. Landslide Events -----------------

    async def create_landslide_event(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            ref = data.get("event_reference", "").strip()
            if ref in self._events_by_ref:
                raise ConflictException(f"Landslide event with reference '{ref}' already exists.")

            district_id = data.get("district_id")
            if not district_id or district_id not in self._districts:
                raise ValidationException(f"Referenced district '{district_id}' does not exist.")

            now = datetime.now(timezone.utc)
            e_id = data.get("id") or f"evt-{uuid.uuid4().hex[:8]}"
            event = {
                **data,
                "id": e_id,
                "event_reference": ref,
                "created_at": now,
                "updated_at": now,
                "created_by": actor_id,
                "updated_by": actor_id,
            }
            self._landslide_events[e_id] = event
            self._events_by_ref[ref] = e_id
            return event

    async def get_landslide_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._landslide_events.get(event_id)

    async def get_landslide_event_by_ref(self, ref: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            e_id = self._events_by_ref.get(ref.strip())
            return self._landslide_events.get(e_id) if e_id else None

    async def list_landslide_events(
        self,
        skip: int = 0,
        limit: int = 50,
        district_id: Optional[str] = None,
        state_code: Optional[str] = None,
        source: Optional[str] = None,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        nearby_point: Optional[List[float]] = None,
        max_radius_m: float = 5000.0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        async with self._lock:
            items = list(self._landslide_events.values())
            if district_id:
                items = [e for e in items if e.get("district_id") == district_id]
            if state_code:
                items = [e for e in items if e.get("state_code", "").upper() == state_code.strip().upper()]
            if source:
                items = [e for e in items if e.get("source") == source]
            if status:
                items = [e for e in items if e.get("status") == status]
            if from_date:
                items = [e for e in items if e.get("event_time") and e["event_time"] >= from_date]
            if to_date:
                items = [e for e in items if e.get("event_time") and e["event_time"] <= to_date]
            if nearby_point:
                items = [
                    e for e in items
                    if distance_point_to_geometry(nearby_point, e.get("geometry", {})) <= max_radius_m
                ]

            items.sort(key=lambda x: _safe_sort_dt(x.get("event_time")), reverse=True)
            total = len(items)
            return items[skip : skip + limit], total

    async def update_landslide_event(
        self, event_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            evt = self._landslide_events.get(event_id)
            if not evt:
                return None
            now = datetime.now(timezone.utc)
            for k, v in updates.items():
                if v is not None and k not in ("id", "event_reference", "created_at", "created_by"):
                    evt[k] = v
            evt["updated_at"] = now
            evt["updated_by"] = actor_id
            return evt

    # ----------------- 8. Unified Spatial Primitives -----------------

    async def find_spatial_entities(
        self,
        entity_types: List[str],
        nearby_point: Optional[List[float]] = None,
        radius_m: float = 5000.0,
        containing_point: Optional[List[float]] = None,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        limit: int = 50,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Foundational spatial query engine across domain entity stores."""
        normalized_types = set()
        for t in entity_types:
            t_norm = t.strip().lower()
            if t_norm in ("district", "districts"):
                normalized_types.add("districts")
            elif t_norm in ("slope_unit", "slope-unit", "slopeunits", "slope_units"):
                normalized_types.add("slope_units")
            elif t_norm in ("road", "roads"):
                normalized_types.add("roads")
            elif t_norm in ("village", "villages"):
                normalized_types.add("villages")
            elif t_norm in ("asset", "assets"):
                normalized_types.add("assets")
            elif t_norm in ("landslide_event", "landslide-event", "landslideevents", "landslide_events"):
                normalized_types.add("landslide_events")
            else:
                normalized_types.add(t_norm)

        async with self._lock:
            results: Dict[str, List[Dict[str, Any]]] = {}

            if "districts" in normalized_types:
                d_matches = []
                for d in self._districts.values():
                    geom = d.get("geometry", {})
                    if containing_point and point_in_geojson_geometry(containing_point, geom):
                        d_matches.append(d)
                    elif bbox and geometry_intersects_bbox(geom, *bbox):
                        d_matches.append(d)
                    elif nearby_point and distance_point_to_geometry(nearby_point, geom) <= radius_m:
                        d_matches.append(d)
                results["districts"] = d_matches[:limit]

            if "slope_units" in normalized_types:
                su_matches = []
                for su in self._slope_units.values():
                    geom = su.get("geometry", {})
                    if containing_point and point_in_geojson_geometry(containing_point, geom):
                        su_matches.append(su)
                    elif bbox and geometry_intersects_bbox(geom, *bbox):
                        su_matches.append(su)
                    elif nearby_point and distance_point_to_geometry(nearby_point, geom) <= radius_m:
                        su_matches.append(su)
                results["slope_units"] = su_matches[:limit]

            if "roads" in normalized_types:
                r_matches = []
                for r in self._roads.values():
                    geom = r.get("geometry", {})
                    if nearby_point and distance_point_to_geometry(nearby_point, geom) <= radius_m:
                        r_matches.append(r)
                    elif bbox and geometry_intersects_bbox(geom, *bbox):
                        r_matches.append(r)
                results["roads"] = r_matches[:limit]

            if "villages" in normalized_types:
                v_matches = []
                for v in self._villages.values():
                    geom = v.get("geometry", {})
                    if nearby_point and distance_point_to_geometry(nearby_point, geom) <= radius_m:
                        v_matches.append(v)
                    elif bbox and geometry_intersects_bbox(geom, *bbox):
                        v_matches.append(v)
                results["villages"] = v_matches[:limit]

            if "assets" in normalized_types:
                a_matches = []
                for a in self._assets.values():
                    geom = a.get("geometry", {})
                    if nearby_point and distance_point_to_geometry(nearby_point, geom) <= radius_m:
                        a_matches.append(a)
                    elif bbox and geometry_intersects_bbox(geom, *bbox):
                        a_matches.append(a)
                results["assets"] = a_matches[:limit]

            if "landslide_events" in normalized_types:
                e_matches = []
                for e in self._landslide_events.values():
                    geom = e.get("geometry", {})
                    if nearby_point and distance_point_to_geometry(nearby_point, geom) <= radius_m:
                        e_matches.append(e)
                    elif bbox and geometry_intersects_bbox(geom, *bbox):
                        e_matches.append(e)
                results["landslide_events"] = e_matches[:limit]

            return results

    # =========================================================================
    # STAGE 5 — RISK ENGINE METHODS
    # =========================================================================

    async def create_risk_feature_snapshot(self, snapshot_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            snap_id = snapshot_dict["id"]
            self._risk_feature_snapshots[snap_id] = snapshot_dict
            return snapshot_dict

    async def get_risk_feature_snapshot_by_id(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._risk_feature_snapshots.get(snapshot_id)

    async def create_risk_prediction(self, prediction_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            pred_id = prediction_dict["id"]
            self._risk_predictions[pred_id] = prediction_dict
            return prediction_dict

    async def get_risk_prediction_by_id(self, prediction_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._risk_predictions.get(prediction_id)

    async def list_risk_predictions(
        self,
        subject_type: Optional[str] = None,
        subject_id: Optional[str] = None,
        district_id: Optional[str] = None,
        state_code: Optional[str] = None,
        model_version_id: Optional[str] = None,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = max(1, min(limit, 100))
        async with self._lock:
            filtered = list(self._risk_predictions.values())

            if subject_type:
                filtered = [p for p in filtered if str(p.get("subject_type", "")).upper() == subject_type.upper()]
            if subject_id:
                filtered = [p for p in filtered if p.get("subject_id") == subject_id]
            if district_id:
                filtered = [p for p in filtered if p.get("district_id") == district_id]
            if state_code:
                filtered = [p for p in filtered if p.get("state_code") == state_code]
            if model_version_id:
                filtered = [p for p in filtered if p.get("model_version_id") == model_version_id]
            if risk_level:
                filtered = [p for p in filtered if str(p.get("risk_level", "")).upper() == risk_level.upper()]
            if status:
                filtered = [p for p in filtered if str(p.get("status", "")).upper() == status.upper()]

            filtered.sort(key=lambda p: _safe_sort_dt(p.get("generated_at")), reverse=True)
            total = len(filtered)
            start = (page - 1) * limit
            items = filtered[start : start + limit]
            return items, total

    async def create_prediction_explanation(self, explanation_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            expl_id = explanation_dict["id"]
            pred_id = explanation_dict["prediction_id"]
            self._prediction_explanations[expl_id] = explanation_dict
            self._prediction_explanations_by_pred_id[pred_id] = expl_id
            return explanation_dict

    async def get_prediction_explanation_by_id(self, expl_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._prediction_explanations.get(expl_id)

    async def get_prediction_explanation_by_prediction_id(self, prediction_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            expl_id = self._prediction_explanations_by_pred_id.get(prediction_id)
            if expl_id:
                return self._prediction_explanations.get(expl_id)
            for expl in self._prediction_explanations.values():
                if expl.get("prediction_id") == prediction_id:
                    return expl
            return None

    async def create_risk_evidence(self, evidence_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            evid_id = evidence_dict["id"]
            pred_id = evidence_dict["prediction_id"]
            self._risk_evidence[evid_id] = evidence_dict
            if pred_id not in self._risk_evidence_by_pred_id:
                self._risk_evidence_by_pred_id[pred_id] = []
            self._risk_evidence_by_pred_id[pred_id].append(evid_id)
            return evidence_dict

    async def get_risk_evidence_by_prediction_id(self, prediction_id: str) -> List[Dict[str, Any]]:
        async with self._lock:
            evid_ids = self._risk_evidence_by_pred_id.get(prediction_id, [])
            results = []
            for eid in evid_ids:
                if eid in self._risk_evidence:
                    results.append(self._risk_evidence[eid])
            if not results:
                for ev in self._risk_evidence.values():
                    if ev.get("prediction_id") == prediction_id:
                        results.append(ev)
            return results

    async def create_model_run(self, run_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            run_id = run_dict["id"]
            self._model_runs[run_id] = run_dict
            return run_dict

    async def get_model_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._model_runs.get(run_id)

    async def list_model_runs(
        self,
        model_version_id: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = max(1, min(limit, 100))
        async with self._lock:
            filtered = list(self._model_runs.values())
            if model_version_id:
                filtered = [r for r in filtered if r.get("model_version_id") == model_version_id]
            filtered.sort(key=lambda r: _safe_sort_dt(r.get("execution_time")), reverse=True)
            total = len(filtered)
            start = (page - 1) * limit
            items = filtered[start : start + limit]
            return items, total

    async def update_model_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if run_id not in self._model_runs:
                return None
            self._model_runs[run_id].update(updates)
            return self._model_runs[run_id]

    # =========================================================================
    # STAGE 6 — SATELLITE & INSAR CHANGE INTELLIGENCE METHODS
    # =========================================================================

    async def create_satellite_observation(self, obs_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            obs_id = obs_dict["id"]
            self._satellite_observations[obs_id] = obs_dict
            return obs_dict

    async def get_satellite_observation_by_id(self, obs_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._satellite_observations.get(obs_id)

    async def list_satellite_observations(
        self,
        bbox: Optional[List[float]] = None,
        mission: Optional[str] = None,
        product_type: Optional[str] = None,
        district_id: Optional[str] = None,
        quality_state: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = max(1, min(limit, 100))
        async with self._lock:
            filtered = list(self._satellite_observations.values())

            if mission:
                filtered = [o for o in filtered if str(o.get("mission", "")).upper() == mission.upper()]
            if product_type:
                filtered = [o for o in filtered if str(o.get("product_type", "")).upper() == product_type.upper()]
            if district_id:
                filtered = [o for o in filtered if o.get("district_id") == district_id]
            if quality_state:
                filtered = [o for o in filtered if str(o.get("quality_state", "")).upper() == quality_state.upper()]
            if bbox and len(bbox) == 4:
                filtered = [
                    o for o in filtered
                    if geometry_intersects_bbox(o.get("footprint", {}), bbox[0], bbox[1], bbox[2], bbox[3])
                ]

            filtered.sort(key=lambda o: _safe_sort_dt(o.get("acquisition_time")), reverse=True)
            total = len(filtered)
            start = (page - 1) * limit
            items = filtered[start : start + limit]
            return items, total

    async def create_insar_observation(self, insar_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            insar_id = insar_dict["id"]
            self._insar_observations[insar_id] = insar_dict
            return insar_dict

    async def get_insar_observation_by_id(self, insar_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._insar_observations.get(insar_id)

    async def list_insar_observations(
        self,
        bbox: Optional[List[float]] = None,
        district_id: Optional[str] = None,
        quality_state: Optional[str] = None,
        min_coherence: Optional[float] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = max(1, min(limit, 100))
        async with self._lock:
            filtered = list(self._insar_observations.values())

            if district_id:
                filtered = [i for i in filtered if i.get("district_id") == district_id]
            if quality_state:
                filtered = [i for i in filtered if str(i.get("quality_state", "")).upper() == quality_state.upper()]
            if min_coherence is not None:
                filtered = [i for i in filtered if (i.get("coherence_mean") or 0.0) >= min_coherence]
            if bbox and len(bbox) == 4:
                filtered = [
                    i for i in filtered
                    if geometry_intersects_bbox(i.get("deformation_geometry", {}), bbox[0], bbox[1], bbox[2], bbox[3])
                ]

            filtered.sort(key=lambda i: _safe_sort_dt(i.get("acquisition_end")), reverse=True)
            total = len(filtered)
            start = (page - 1) * limit
            items = filtered[start : start + limit]
            return items, total

    async def create_satellite_processing_run(self, run_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            run_id = run_dict["id"]
            self._satellite_processing_runs[run_id] = run_dict
            return run_dict

    async def get_satellite_processing_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._satellite_processing_runs.get(run_id)

    async def list_satellite_processing_runs(
        self,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = max(1, min(limit, 100))
        async with self._lock:
            filtered = list(self._satellite_processing_runs.values())
            if status:
                filtered = [r for r in filtered if str(r.get("status", "")).upper() == status.upper()]
            filtered.sort(key=lambda r: _safe_sort_dt(r.get("start_time")), reverse=True)
            total = len(filtered)
            start = (page - 1) * limit
            items = filtered[start : start + limit]
            return items, total

    async def update_satellite_processing_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if run_id not in self._satellite_processing_runs:
                return None
            self._satellite_processing_runs[run_id].update(updates)
            return self._satellite_processing_runs[run_id]

    # --------------------------------------------------------------------------
    # Stage 7 Consequence Intelligence Methods
    # --------------------------------------------------------------------------
    async def create_consequence_relationship(self, rel_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            rel_id = rel_dict["id"]
            self._consequence_relationships[rel_id] = rel_dict
            return rel_dict

    async def get_consequence_relationship_by_id(self, rel_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._consequence_relationships.get(rel_id)

    async def list_consequence_relationships(
        self,
        district_id: Optional[str] = None,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        relationship_type: Optional[str] = None,
        spatial_relation: Optional[str] = None,
        criticality: Optional[str] = None,
        organization_id: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = max(1, min(limit, 100))
        async with self._lock:
            filtered = list(self._consequence_relationships.values())

            if district_id:
                filtered = [r for r in filtered if r.get("district_id") == district_id]
            if source_type:
                filtered = [r for r in filtered if str(r.get("source_type", "")).upper() == source_type.upper()]
            if source_id:
                filtered = [r for r in filtered if r.get("source_id") == source_id]
            if target_type:
                filtered = [r for r in filtered if str(r.get("target_type", "")).upper() == target_type.upper()]
            if target_id:
                filtered = [r for r in filtered if r.get("target_id") == target_id]
            if relationship_type:
                filtered = [r for r in filtered if str(r.get("relationship_type", "")).upper() == relationship_type.upper()]
            if spatial_relation:
                filtered = [r for r in filtered if str(r.get("spatial_relation", "")).upper() == spatial_relation.upper()]
            if criticality:
                filtered = [r for r in filtered if str(r.get("criticality", "")).upper() == criticality.upper()]
            if organization_id:
                filtered = [r for r in filtered if r.get("organization_id") == organization_id]
            if status:
                filtered = [r for r in filtered if str(r.get("status", "")).upper() == status.upper()]

            filtered.sort(
                key=lambda r: _safe_sort_dt(r.get("generated_at")),
                reverse=True,
            )

            total = len(filtered)
            start = (page - 1) * limit
            items = filtered[start : start + limit]
            return items, total

    async def create_consequence_run(self, run_dict: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            run_id = run_dict["id"]
            self._consequence_runs[run_id] = run_dict
            return run_dict

    async def get_consequence_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._consequence_runs.get(run_id)

    async def list_consequence_runs(
        self,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        limit = max(1, min(limit, 100))
        async with self._lock:
            filtered = list(self._consequence_runs.values())
            if district_id:
                filtered = [r for r in filtered if r.get("district_id") == district_id]
            if status:
                filtered = [r for r in filtered if str(r.get("status", "")).upper() == status.upper()]

            filtered.sort(key=lambda r: _safe_sort_dt(r.get("start_time")), reverse=True)
            total = len(filtered)
            start = (page - 1) * limit
            items = filtered[start : start + limit]
            return items, total

    async def update_consequence_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if run_id not in self._consequence_runs:
                return None
            self._consequence_runs[run_id].update(updates)
            return self._consequence_runs[run_id]

    async def get_consequence_summary(self, district_id: str) -> Dict[str, Any]:
        async with self._lock:
            rels = [r for r in self._consequence_relationships.values() if r.get("district_id") == district_id]
            road_ids = {r.get("target_id") for r in rels if r.get("target_type") == "ROAD"}
            chainages_count = sum(1 for r in rels if r.get("chainage_km") is not None)
            asset_rels = [r for r in rels if r.get("target_type") == "ASSET"]
            crit_assets_count = sum(1 for r in asset_rels if str(r.get("criticality", "")).upper() in ("HIGH", "CRITICAL"))
            village_ids = {r.get("target_id") for r in rels if r.get("target_type") == "VILLAGE"}

            return {
                "district_id": district_id,
                "total_relationships": len(rels),
                "potentially_affected_roads_count": len(road_ids),
                "linked_chainages_count": chainages_count,
                "exposed_assets_count": len(asset_rels),
                "critical_assets_count": crit_assets_count,
                "nearby_villages_count": len(village_ids),
                "generated_at": datetime.now(timezone.utc),
                "disclaimer": "Stage 7 Consequence Intelligence denotes potential spatial exposure and infrastructure proximity only. It does NOT automatically order road closures, evacuations, dispatch personnel, or broadcast public alerts. All operational interventions require authoritative human decision-maker review.",
            }

    # ----------------- Stage 8 Action Methods -----------------

    async def get_action_by_id(self, action_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._actions.get(action_id)

    async def list_actions(
        self,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        action_type: Optional[str] = None,
        target_entity_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._actions.values())
            if district_id:
                items = [a for a in items if a.get("district_id") == district_id]
            if status:
                items = [a for a in items if a.get("status") == status]
            if priority:
                items = [a for a in items if a.get("priority") == priority]
            if action_type:
                items = [a for a in items if a.get("action_type") == action_type]
            if target_entity_type:
                items = [a for a in items if a.get("target_entity_type") == target_entity_type]

            # Sort newest first
            items.sort(key=lambda x: _safe_sort_dt(x.get("created_at")), reverse=True)
            return items[skip : skip + limit]

    async def create_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            aid = action_data.get("id") or f"act-{uuid.uuid4().hex[:12]}"
            action_data["id"] = aid
            self._actions[aid] = action_data
            await self._mongo_persist("actions", action_data)
            return action_data

    async def update_action(self, action_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if action_id not in self._actions:
                return None
            updates["updated_at"] = datetime.now(timezone.utc)
            self._actions[action_id].update(updates)
            await self._mongo_persist("actions", self._actions[action_id])
            return self._actions[action_id]

    async def get_action_summary(self, district_id: str) -> Dict[str, Any]:
        async with self._lock:
            acts = [a for a in self._actions.values() if a.get("district_id") == district_id]
            return {
                "total_actions": len(acts),
                "recommended_count": sum(1 for a in acts if a.get("status") == "RECOMMENDED"),
                "pending_review_count": sum(1 for a in acts if a.get("status") == "PENDING_REVIEW"),
                "approved_count": sum(1 for a in acts if a.get("status") == "APPROVED"),
                "in_progress_count": sum(1 for a in acts if a.get("status") == "IN_PROGRESS"),
                "completed_count": sum(1 for a in acts if a.get("status") == "COMPLETED"),
                "rejected_count": sum(1 for a in acts if a.get("status") == "REJECTED"),
                "district_id": district_id,
                "generated_at": datetime.now(timezone.utc),
            }

    # ----------------- Stage 8 Warning Methods -----------------

    async def get_warning_by_id(self, warning_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._warnings.get(warning_id)

    async def list_warnings(
        self,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        warning_type: Optional[str] = None,
        affected_entity_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._warnings.values())
            if district_id:
                items = [w for w in items if w.get("district_id") == district_id]
            if status:
                items = [w for w in items if w.get("status") == status]
            if warning_type:
                items = [w for w in items if w.get("warning_type") == warning_type]
            if affected_entity_type:
                items = [w for w in items if w.get("affected_entity_type") == affected_entity_type]

            # Sort newest first
            items.sort(key=lambda x: _safe_sort_dt(x.get("created_at")), reverse=True)
            return items[skip : skip + limit]

    async def create_warning(self, warning_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            wid = warning_data.get("id") or f"wrn-{uuid.uuid4().hex[:12]}"
            warning_data["id"] = wid
            self._warnings[wid] = warning_data
            await self._mongo_persist("warnings", warning_data)
            return warning_data

    async def update_warning(self, warning_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            if warning_id not in self._warnings:
                return None
            updates["updated_at"] = datetime.now(timezone.utc)
            self._warnings[warning_id].update(updates)
            await self._mongo_persist("warnings", self._warnings[warning_id])
            return self._warnings[warning_id]

    async def get_warning_summary(self, district_id: str) -> Dict[str, Any]:
        async with self._lock:
            wrns = [w for w in self._warnings.values() if w.get("district_id") == district_id]
            return {
                "total_warnings": len(wrns),
                "active_count": sum(1 for w in wrns if w.get("status") in ("AUTHORIZED", "DISPATCHING", "DISPATCHED", "PARTIALLY_ACKNOWLEDGED")),
                "draft_count": sum(1 for w in wrns if w.get("status") == "DRAFT"),
                "review_count": sum(1 for w in wrns if w.get("status") == "REVIEW"),
                "dispatched_count": sum(1 for w in wrns if w.get("status") == "DISPATCHED"),
                "acknowledged_count": sum(1 for w in wrns if w.get("status") == "ACKNOWLEDGED"),
                "district_id": district_id,
                "generated_at": datetime.now(timezone.utc),
            }

    # ----------------- Stage 8 Warning Ledger Methods -----------------

    async def get_ledger_entry_by_id(self, entry_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._warning_ledger.get(entry_id)

    async def list_ledger_entries(
        self,
        district_id: Optional[str] = None,
        warning_id: Optional[str] = None,
        action_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._warning_ledger.values())
            if district_id:
                items = [e for e in items if e.get("district_id") == district_id]
            if warning_id:
                items = [e for e in items if e.get("warning_id") == warning_id]
            if action_id:
                items = [e for e in items if e.get("action_id") == action_id]

            items.sort(key=lambda x: x.get("sequence_number", 0), reverse=True)
            return items[skip : skip + limit]

    async def list_all_ledger_entries_for_district(self, district_id: str) -> List[Dict[str, Any]]:
        async with self._lock:
            entry_ids = self._warning_ledger_by_district.get(district_id, [])
            entries = [self._warning_ledger[eid] for eid in entry_ids if eid in self._warning_ledger]
            entries.sort(key=lambda x: x.get("sequence_number", 0))
            return entries

    async def get_latest_ledger_entry(self, district_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            entry_ids = self._warning_ledger_by_district.get(district_id, [])
            if not entry_ids:
                return None
            latest_id = entry_ids[-1]
            return self._warning_ledger.get(latest_id)

    async def append_ledger_entry(self, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            eid = entry_data["id"]
            district_id = entry_data["district_id"]
            self._warning_ledger[eid] = entry_data
            if district_id not in self._warning_ledger_by_district:
                self._warning_ledger_by_district[district_id] = []
            self._warning_ledger_by_district[district_id].append(eid)
            return entry_data

    # ----------------- Stage 8 Playbook Methods -----------------

    async def get_playbook_by_id(self, playbook_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self._playbooks.get(playbook_id)

    async def get_playbook_by_code(self, playbook_code: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            pid = self._playbooks_by_code.get(playbook_code)
            return self._playbooks.get(pid) if pid else None

    async def list_playbooks(self, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._playbooks.values())
            if is_active is not None:
                items = [p for p in items if p.get("is_active") == is_active]
            items.sort(key=lambda x: x.get("playbook_code", ""))
            return items

    async def create_playbook(self, playbook_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            pid = playbook_data.get("id") or f"pbk-{uuid.uuid4().hex[:8]}"
            playbook_data["id"] = pid
            code = playbook_data.get("playbook_code")
            self._playbooks[pid] = playbook_data
            if code:
                self._playbooks_by_code[code] = pid
            return playbook_data

    # ----------------- Stage 9: Alerts & Delivery Jobs -----------------

    async def get_alert_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            doc = self._alerts.get(alert_id)
            return dict(doc) if doc else None

    async def get_alert_by_idempotency_key(self, key: str) -> Optional[Dict[str, Any]]:
        if not key:
            return None
        async with self._lock:
            aid = self._alerts_by_idempotency_key.get(key)
            if aid:
                doc = self._alerts.get(aid)
                if doc:
                    return dict(doc)
            from src.db.mongodb import get_database
            try:
                db = await get_database()
                if db is not None:
                    found = await db.alerts.find_one({"idempotency_key": key})
                    if found:
                        clean = dict(found)
                        clean.pop("_id", None)
                        self._alerts[clean["id"]] = clean
                        self._alerts_by_idempotency_key[key] = clean["id"]
                        return dict(clean)
            except Exception:
                pass
            return None

    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            aid = alert_data.get("id") or f"alt-{uuid.uuid4().hex[:12]}"
            alert_data["id"] = aid
            self._alerts[aid] = alert_data
            idem = alert_data.get("idempotency_key")
            if idem:
                self._alerts_by_idempotency_key[idem] = aid
            await self._mongo_persist("alerts", alert_data)
            return dict(alert_data)

    async def update_alert(self, alert_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            existing = self._alerts.get(alert_id)
            if not existing:
                return None
            existing.update(updates)
            await self._mongo_persist("alerts", existing)
            return dict(existing)

    async def list_alerts(
        self,
        district_id: Optional[str] = None,
        warning_id: Optional[str] = None,
        status: Optional[str] = None,
        recipient_id: Optional[str] = None,
        channel: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._alerts.values())
            if district_id:
                items = [a for a in items if a.get("district_id") == district_id]
            if warning_id:
                items = [a for a in items if a.get("warning_id") == warning_id]
            if status:
                items = [a for a in items if a.get("status") == status]
            if recipient_id:
                items = [a for a in items if a.get("recipient_id") == recipient_id]
            if channel:
                items = [a for a in items if a.get("channel") == channel]
            items.sort(key=lambda x: _safe_sort_dt(x.get("created_at")), reverse=True)
            return [dict(a) for a in items[skip : skip + limit]]

    async def get_alerts_summary(self, district_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            alerts = list(self._alerts.values())
            if district_id:
                alerts = [a for a in alerts if a.get("district_id") == district_id]
            return {
                "total_alerts": len(alerts),
                "queued_count": sum(1 for a in alerts if a.get("status") == "QUEUED"),
                "dispatching_count": sum(1 for a in alerts if a.get("status") == "DISPATCHING"),
                "dispatched_count": sum(1 for a in alerts if a.get("status") == "DISPATCHED"),
                "delivered_count": sum(1 for a in alerts if a.get("status") == "DELIVERED"),
                "acknowledged_count": sum(1 for a in alerts if a.get("status") == "ACKNOWLEDGED"),
                "failed_count": sum(1 for a in alerts if a.get("status") in ("FAILED", "DELIVERY_FAILED")),
                "expired_count": sum(1 for a in alerts if a.get("status") == "EXPIRED"),
                "district_id": district_id,
                "generated_at": datetime.now(timezone.utc),
            }

    # ----------------- Stage 9: Delivery Jobs -----------------

    async def create_delivery_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            jid = job_data.get("job_id") or f"job-{uuid.uuid4().hex[:12]}"
            job_data["job_id"] = jid
            job_data["id"] = jid
            self._delivery_jobs[jid] = job_data
            await self._mongo_persist("deliveryJobs", job_data)
            return dict(job_data)

    async def get_delivery_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            doc = self._delivery_jobs.get(job_id)
            return dict(doc) if doc else None

    async def update_delivery_job(self, job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            existing = self._delivery_jobs.get(job_id)
            if not existing:
                return None
            existing.update(updates)
            await self._mongo_persist("deliveryJobs", existing)
            return dict(existing)

    async def list_pending_delivery_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        async with self._lock:
            pending = [j for j in self._delivery_jobs.values() if j.get("status") in ("QUEUED", "RETRYING")]
            pending.sort(key=lambda x: _safe_sort_dt(x.get("created_at")))
            return [dict(j) for j in pending[:limit]]

    # ----------------- Stage 9: Alert Acknowledgements -----------------

    async def create_alert_acknowledgement(self, ack_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            aid = ack_data.get("id") or f"ack-{uuid.uuid4().hex[:12]}"
            ack_data["id"] = aid
            self._alert_acknowledgements[aid] = ack_data
            alt_id = ack_data.get("alert_id")
            if alt_id:
                self._alert_acks_by_alert.setdefault(alt_id, []).append(aid)
            await self._mongo_persist("alertAcknowledgements", ack_data)
            return dict(ack_data)

    async def list_alert_acknowledgements(self, alert_id: str) -> List[Dict[str, Any]]:
        async with self._lock:
            ack_ids = self._alert_acks_by_alert.get(alert_id, [])
            docs = [self._alert_acknowledgements[i] for i in ack_ids if i in self._alert_acknowledgements]
            docs.sort(key=lambda x: _safe_sort_dt(x.get("acknowledged_at")), reverse=True)
            return [dict(d) for d in docs]

    # ----------------- Stage 10: Citizen Reports -----------------

    async def create_citizen_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            rid = data.get("id") or f"cr-{uuid.uuid4().hex[:12]}"
            data["id"] = rid
            self._citizen_reports[rid] = data
            await self._mongo_persist("citizenReports", data)
            return dict(data)

    async def get_citizen_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            doc = self._citizen_reports.get(report_id)
            return dict(doc) if doc else None

    async def update_citizen_report(self, report_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            existing = self._citizen_reports.get(report_id)
            if not existing:
                return None
            existing.update(updates)
            await self._mongo_persist("citizenReports", existing)
            return dict(existing)

    async def list_citizen_reports(
        self,
        district_id: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        moderation_state: Optional[str] = None,
        reporter_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._citizen_reports.values())
            if district_id:
                items = [r for r in items if r.get("district_id") == district_id]
            if category:
                items = [r for r in items if r.get("category") == category]
            if status:
                items = [r for r in items if r.get("status") == status]
            if moderation_state:
                items = [r for r in items if r.get("moderation_state") == moderation_state]
            if reporter_id:
                items = [r for r in items if r.get("reporter_id") == reporter_id]
            items.sort(key=lambda x: _safe_sort_dt(x.get("reported_at")), reverse=True)
            return [dict(r) for r in items[skip : skip + limit]]

    async def count_citizen_reports(
        self,
        district_id: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        moderation_state: Optional[str] = None,
    ) -> int:
        async with self._lock:
            items = list(self._citizen_reports.values())
            if district_id:
                items = [r for r in items if r.get("district_id") == district_id]
            if category:
                items = [r for r in items if r.get("category") == category]
            if status:
                items = [r for r in items if r.get("status") == status]
            if moderation_state:
                items = [r for r in items if r.get("moderation_state") == moderation_state]
            return len(items)

    async def get_community_summary(self, district_id: Optional[str] = None) -> Dict[str, Any]:
        async with self._lock:
            reports = list(self._citizen_reports.values())
            if district_id:
                reports = [r for r in reports if r.get("district_id") == district_id]
            clusters = list(self._community_clusters.values())
            if district_id:
                clusters = [c for c in clusters if c.get("district_id") == district_id]

            return {
                "total_reports": len(reports),
                "submitted_count": sum(1 for r in reports if r.get("status") == "SUBMITTED"),
                "unverified_count": sum(1 for r in reports if r.get("status") == "UNVERIFIED"),
                "probable_count": sum(1 for r in reports if r.get("status") == "PROBABLE"),
                "verified_count": sum(1 for r in reports if r.get("status") == "VERIFIED"),
                "rejected_count": sum(1 for r in reports if r.get("status") == "REJECTED"),
                "resolved_count": sum(1 for r in reports if r.get("status") == "RESOLVED"),
                "cluster_count": len(clusters),
                "district_id": district_id,
                "generated_at": datetime.now(timezone.utc),
            }

    # ----------------- Stage 10: Community Clusters -----------------

    async def create_community_cluster(self, data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            cid = data.get("id") or f"cls-{uuid.uuid4().hex[:12]}"
            data["id"] = cid
            self._community_clusters[cid] = data
            await self._mongo_persist("communityEventClusters", data)
            return dict(data)

    async def list_community_clusters(
        self,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._community_clusters.values())
            if district_id:
                items = [c for c in items if c.get("district_id") == district_id]
            if status:
                items = [c for c in items if c.get("status") == status]
            items.sort(key=lambda x: _safe_sort_dt(x.get("first_reported_at")), reverse=True)
            return [dict(c) for c in items[skip : skip + limit]]

    async def get_community_cluster_by_id(self, cluster_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            doc = self._community_clusters.get(cluster_id)
            return dict(doc) if doc else None

    async def clear_community_clusters(self, district_id: Optional[str] = None) -> None:
        async with self._lock:
            if district_id:
                to_remove = [cid for cid, c in self._community_clusters.items() if c.get("district_id") == district_id]
                for cid in to_remove:
                    self._community_clusters.pop(cid, None)
            else:
                self._community_clusters.clear()
            from src.db.mongodb import get_database
            try:
                db = await get_database()
                if db is not None:
                    q = {"district_id": district_id} if district_id else {}
                    await db.communityEventClusters.delete_many(q)
            except Exception:
                pass

    # ----------------- Stage 10: Moderation Events -----------------

    async def create_moderation_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            mid = data.get("id") or f"mod-{uuid.uuid4().hex[:12]}"
            data["id"] = mid
            self._community_moderation_events[mid] = data
            await self._mongo_persist("communityModerationEvents", data)
            return dict(data)

    async def list_moderation_events_by_report(self, report_id: str) -> List[Dict[str, Any]]:
        async with self._lock:
            items = [e for e in self._community_moderation_events.values() if e.get("report_id") == report_id]
            items.sort(key=lambda x: _safe_sort_dt(x.get("timestamp")), reverse=True)
            return [dict(e) for e in items]

    list_moderation_events_for_report = list_moderation_events_by_report

    # ----------------- Stage 10: Physical Sensors -----------------

    async def create_sensor(self, data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            sid = data.get("id") or f"sns-{uuid.uuid4().hex[:12]}"
            data["id"] = sid
            self._sensors[sid] = data
            code = data.get("sensor_code")
            if code:
                self._sensors_by_code[code] = sid
            await self._mongo_persist("sensors", data)
            return dict(data)

    async def get_sensor_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            doc = self._sensors.get(sensor_id)
            return dict(doc) if doc else None

    async def get_sensor_by_code(self, sensor_code: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            sid = self._sensors_by_code.get(sensor_code)
            if not sid:
                return None
            doc = self._sensors.get(sid)
            return dict(doc) if doc else None

    async def update_sensor(self, sensor_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            existing = self._sensors.get(sensor_id)
            if not existing:
                return None
            existing.update(updates)
            await self._mongo_persist("sensors", existing)
            return dict(existing)

    async def list_sensors(
        self,
        district_id: Optional[str] = None,
        sensor_type: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = list(self._sensors.values())
            if district_id:
                items = [s for s in items if s.get("district_id") == district_id]
            if sensor_type:
                items = [s for s in items if s.get("sensor_type") == sensor_type]
            if status:
                items = [s for s in items if s.get("status") == status]
            items.sort(key=lambda x: _safe_sort_dt(x.get("created_at")), reverse=True)
            return [dict(s) for s in items[skip : skip + limit]]

    async def get_sensors_summary(self, district_id: Optional[str] = None) -> Dict[str, Any]:
        from src.core.sensors.validator import SensorTelemetryValidator
        async with self._lock:
            sensors = list(self._sensors.values())
            if district_id:
                sensors = [s for s in sensors if s.get("district_id") == district_id]

            now = datetime.now(timezone.utc)
            freshness_counts = {"LIVE": 0, "RECENT": 0, "STALE": 0, "OFFLINE": 0}
            by_type: Dict[str, int] = {}

            for s in sensors:
                f = SensorTelemetryValidator.evaluate_freshness(s.get("last_seen_at"), now=now)
                freshness_counts[f.value] = freshness_counts.get(f.value, 0) + 1
                stype = s.get("sensor_type", "OTHER")
                by_type[stype] = by_type.get(stype, 0) + 1

            return {
                "total_sensors": len(sensors),
                "active_count": sum(1 for s in sensors if s.get("status") == "ACTIVE"),
                "live_count": freshness_counts.get("LIVE", 0),
                "recent_count": freshness_counts.get("RECENT", 0),
                "stale_count": freshness_counts.get("STALE", 0),
                "offline_count": freshness_counts.get("OFFLINE", 0),
                "calibration_required_count": sum(1 for s in sensors if s.get("status") == "CALIBRATION_REQUIRED"),
                "by_type": by_type,
                "district_id": district_id,
                "generated_at": now,
            }

    # ----------------- Stage 10: Sensor Observations -----------------

    async def create_sensor_observation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            oid = data.get("id") or f"obs-{uuid.uuid4().hex[:12]}"
            data["id"] = oid
            self._sensor_observations[oid] = data
            await self._mongo_persist("sensorObservations", data)
            return dict(data)

    async def list_sensor_observations(
        self,
        sensor_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        quality: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        async with self._lock:
            items = [o for o in self._sensor_observations.values() if o.get("sensor_id") == sensor_id]
            if start_time:
                items = [o for o in items if o.get("observed_at") and o["observed_at"] >= start_time]
            if end_time:
                items = [o for o in items if o.get("observed_at") and o["observed_at"] <= end_time]
            if quality:
                items = [o for o in items if o.get("quality") == quality]
            items.sort(key=lambda x: _safe_sort_dt(x.get("observed_at")), reverse=True)
            return [dict(o) for o in items[skip : skip + limit]]

    async def get_latest_observation_for_sensor(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            items = [o for o in self._sensor_observations.values() if o.get("sensor_id") == sensor_id]
            if not items:
                return None
            items.sort(key=lambda x: _safe_sort_dt(x.get("observed_at")), reverse=True)
            return dict(items[0])

    async def clear_all(self):
        """Clears all in-memory entities (for test suite isolation)."""
        async with self._lock:
            self._users.clear()
            self._users_by_email.clear()
            self._organizations.clear()
            self._orgs_by_code.clear()
            self._memberships.clear()
            self._revoked_tokens.clear()
            self._refresh_tokens.clear()
            self._security_events.clear()

            # Clear Stage 3 stores
            self._districts.clear()
            self._districts_by_code.clear()
            self._slope_units.clear()
            self._slope_units_by_code.clear()
            self._roads.clear()
            self._roads_by_code.clear()
            self._road_chainages.clear()
            self._chainages_by_road_and_km.clear()
            self._villages.clear()
            self._assets.clear()
            self._landslide_events.clear()
            self._events_by_ref.clear()

            # Clear Stage 5 stores
            self._risk_predictions.clear()
            self._risk_feature_snapshots.clear()
            self._model_runs.clear()
            self._prediction_explanations.clear()
            self._prediction_explanations_by_pred_id.clear()
            self._risk_evidence.clear()
            self._risk_evidence_by_pred_id.clear()

            # Clear Stage 6 stores
            self._satellite_observations.clear()
            self._insar_observations.clear()
            self._satellite_processing_runs.clear()

            # Clear Stage 7 stores
            self._consequence_relationships.clear()
            self._consequence_runs.clear()

            # Clear Stage 8 stores
            self._actions.clear()
            self._warnings.clear()
            self._warning_ledger.clear()
            self._warning_ledger_by_district.clear()
            self._playbooks.clear()
            self._playbooks_by_code.clear()

            # Clear Stage 9 stores
            self._alerts.clear()
            self._alerts_by_idempotency_key.clear()
            self._delivery_jobs.clear()
            self._alert_acknowledgements.clear()
            self._alert_acks_by_alert.clear()

            # Clear Stage 10 stores
            self._citizen_reports.clear()
            self._community_clusters.clear()
            self._community_moderation_events.clear()
            self._sensors.clear()
            self._sensors_by_code.clear()
            self._sensor_observations.clear()

            from src.db.mongodb import get_database
            try:
                db = await get_database()
                if db is not None:
                    await db.alerts.delete_many({})
                    await db.deliveryJobs.delete_many({})
                    await db.alertAcknowledgements.delete_many({})
                    await db.citizenReports.delete_many({})
                    await db.communityEventClusters.delete_many({})
                    await db.communityModerationEvents.delete_many({})
                    await db.sensors.delete_many({})
                    await db.sensorObservations.delete_many({})
            except Exception:
                pass

            self._seeded = False


class RepositoryProxy:
    """Dynamic repository proxy selecting between MongoRepository (authoritative for production/staging)
    and InMemoryRepository (strictly for isolated unit tests).
    """

    def __init__(self):
        from src.db.mongo_repository import MongoRepository
        self._in_memory = InMemoryRepository()
        self._mongo = MongoRepository()
        self._force_backend: Optional[str] = None

    def use_mongo(self):
        """Forces the active repository to use MongoDB Atlas."""
        self._force_backend = "mongodb"

    def use_in_memory(self):
        """Forces the active repository to use In-Memory stores (for isolated unit tests)."""
        self._force_backend = "in_memory"

    def reset_backend(self):
        """Resets forced backend to default configuration policy."""
        self._force_backend = None

    @property
    def active_backend(self) -> str:
        if self._force_backend:
            return self._force_backend
        return "mongodb" if settings.is_mongo_authoritative else "in_memory"

    @property
    def _active_repo(self):
        if self.active_backend == "mongodb":
            return self._mongo
        return self._in_memory

    def __getattr__(self, name: str):
        return getattr(self._active_repo, name)


IdentityRepository = InMemoryRepository

# Singleton instance shared across FastAPI dependencies
repository = RepositoryProxy()

