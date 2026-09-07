"""
Sentinel NER — Authoritative MongoDB Domain Repository
Direct Motor async CRUD repository for MongoDB Atlas as the authoritative system of record.
Provides complete Stage 1–8 persistent entity management without in-memory dependency.
"""

import uuid
from datetime import datetime, timezone
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


def _clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Normalizes MongoDB document ensuring id and _id consistency."""
    if not doc:
        return None
    d = dict(doc)
    doc_id = d.get("id") or str(d.get("_id"))
    d["id"] = doc_id
    d["_id"] = doc_id
    return d


def _prep_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Prepares document for MongoDB storage ensuring string _id."""
    d = dict(doc)
    doc_id = d.get("id") or d.get("_id")
    if doc_id:
        d["_id"] = str(doc_id)
        d["id"] = str(doc_id)
    if "idempotency_key" in d and not d["idempotency_key"]:
        d.pop("idempotency_key", None)
    return d


class MongoRepository:
    """Authoritative MongoDB Atlas repository implementing the complete Sentinel NER data contract.
    Directly queries MongoDB collections across all Stage 1–8 entities.
    Strictly fails on outage without silent in-memory fallback.
    """

    def __init__(self):
        # Explicitly no authoritative in-memory dictionary stores.
        pass

    async def _get_db(self):
        """Retrieves authoritative MongoDB database instance, failing fast on outage."""
        self.enforce_persistence_policy()
        from src.db.mongodb import get_database
        try:
            database = await get_database()
            if database is None:
                raise RuntimeError("Authoritative MongoDB dependency unavailable: client returned None database.")
            return database
        except Exception as exc:
            from src.db.mongodb import mask_mongo_uri
            safe_err = mask_mongo_uri(str(exc))
            raise RuntimeError(f"Authoritative MongoDB dependency unavailable: {safe_err}") from exc

    def _seed_sync(self):
        """No-op on MongoRepository: MongoDB Atlas is the authoritative system of record."""
        pass

    def enforce_persistence_policy(self):
        """Guarantees that production/staging environments cannot operate on in-memory persistence."""
        if settings.APP_ENV in ("production", "staging"):
            from src.db.mongodb import client, db
            if client is None or db is None:
                raise RuntimeError(
                    "CRITICAL SAFETY VIOLATION: Production cannot use in-memory persistence. "
                    "Authoritative MongoDB Atlas connection is mandatory."
                )

    async def sync_from_mongo(self):
        """Compatibility method. In MongoRepository, MongoDB is already authoritative."""
        # No-op: Database queries are issued on every read. Process-local hydration is unnecessary.
        return

    async def _mongo_persist(self, collection_name: str, doc: Dict[str, Any]):
        """Directly persists a document to MongoDB Atlas."""
        self.enforce_persistence_policy()
        db = await self._get_db()
        doc_to_save = _prep_doc(doc)
        await db[collection_name].replace_one({"_id": doc_to_save["_id"]}, doc_to_save, upsert=True)

    async def _mongo_delete(self, collection_name: str, doc_id: str):
        """Directly deletes a document from MongoDB Atlas."""
        db = await self._get_db()
        await db[collection_name].delete_one({"$or": [{"_id": str(doc_id)}, {"id": str(doc_id)}]})

    async def clear_all(self):
        """Clears all persistent collections in MongoDB (strictly for test isolation)."""
        db = await self._get_db()
        collections = [
            "users", "organizations", "organizationMemberships", "securityEvents",
            "revokedTokens", "refreshTokens", "districts", "slopeUnits", "roads",
            "roadChainages", "villages", "assets", "landslideEvents", "riskPredictions",
            "riskFeatureSnapshots", "modelVersions", "modelRuns", "predictionExplanations",
            "riskEvidence", "satelliteObservations", "insarObservations",
            "satelliteProcessingRuns", "consequenceRelationships", "consequenceRuns",
            "actions", "warnings", "warningLedger", "playbooks"
        ]
        for col in collections:
            await db[col].delete_many({})

    async def seed_dev_data_if_empty(self):
        """Seeds standard development/test organizations, users, and operational fixtures directly into MongoDB."""
        self.enforce_persistence_policy()
        if not getattr(settings, "ENABLE_DEV_FIXTURES", True) or settings.APP_ENV == "production":
            return

        db = await self._get_db()

        # Seed Stage 6 Satellite & InSAR Deterministic Test Fixtures if collection is empty
        sat_count = await db.satellite_observations.count_documents({})
        if sat_count == 0:
            try:
                from src.core.satellite.lineage import get_deterministic_test_fixtures
                fixtures = get_deterministic_test_fixtures()
                for obs in fixtures["observations"]:
                    await db.satellite_observations.replace_one(
                        {"_id": obs.id},
                        _prep_doc(obs.model_dump()),
                        upsert=True,
                    )
                for insar in fixtures["insar_observations"]:
                    await db.insar_observations.replace_one(
                        {"_id": insar.id},
                        _prep_doc(insar.model_dump()),
                        upsert=True,
                    )
            except Exception:
                pass

        user_count = await db.users.count_documents({})
        if user_count > 0:
            return

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
            await db.organizations.replace_one({"_id": org["id"]}, _prep_doc(org), upsert=True)

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
            await db.users.replace_one({"_id": uid}, _prep_doc(u_dict), upsert=True)
            m_id = f"mem-{uid}-{org_id}"
            mem_doc = {
                "id": m_id,
                "user_id": uid,
                "organization_id": org_id,
                "role": role,
                "status": MembershipStatus.ACTIVE.value,
                "created_at": now,
                "updated_at": now,
            }
            await db.organizationMemberships.replace_one({"_id": m_id}, _prep_doc(mem_doc), upsert=True)

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
            await db.districts.replace_one({"_id": d["id"]}, _prep_doc(d), upsert=True)

        su_1 = {
            "id": "su-aizawl-001",
            "code": "SU-MZ-AIZ-00101",
            "name": "Durtlang Ridge Sector 1",
            "district_id": "dst-aizawl",
            "state_code": "MZ",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[92.71, 23.72], [92.74, 23.72], [92.74, 23.75], [92.71, 23.75], [92.71, 23.72]]],
            },
            "area_sqkm": 2.4,
            "status": "ACTIVE",
            "metadata": {"slope_aspect": "NW", "is_synthetic_fixture": True},
            "created_at": now,
            "updated_at": now,
            "created_by": "usr-admin-1",
            "updated_by": "usr-admin-1",
        }
        await db.slopeUnits.replace_one({"_id": su_1["id"]}, _prep_doc(su_1), upsert=True)

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
            await db.slopeUnits.replace_one({"_id": su["id"]}, _prep_doc(su), upsert=True)

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
                "coordinates": [[92.715, 23.718], [92.720, 23.725], [92.730, 23.738], [92.745, 23.750]],
            },
            "operational_status": "OPERATIONAL",
            "metadata": {"lanes": 2, "is_synthetic_fixture": True},
            "created_at": now,
            "updated_at": now,
            "created_by": "usr-admin-1",
            "updated_by": "usr-admin-1",
        }
        await db.roads.replace_one({"_id": nh54["id"]}, _prep_doc(nh54), upsert=True)

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
            await db.roads.replace_one({"_id": r["id"]}, _prep_doc(r), upsert=True)

        # 4. Seed Stage 8 Playbooks
        pb_road = {
            "id": "pbk-road-exp-v1",
            "playbook_code": "PB-ROAD-EXPOSURE",
            "name": "Potential Road Exposure Standard Operating Procedure",
            "version": "1.0.0",
            "trigger_criteria": "POTENTIAL_ROAD_EXPOSURE",
            "applicable_consequence_types": ["ROAD_EXPOSURE", "CHAINAGE_ATTRIBUTION"],
            "required_authority_role": "DDMA",
            "description": "Standard operating procedure for evaluating potential road exposure.",
            "steps": [],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db.playbooks.replace_one({"_id": pb_road["id"]}, _prep_doc(pb_road), upsert=True)

    # ----------------- User Methods -----------------

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.users.find_one({"$or": [{"_id": user_id}, {"id": user_id}]})
        return _clean_doc(doc)

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.users.find_one({"email": email.lower().strip()})
        return _clean_doc(doc)

    async def create_user(
        self,
        email: str,
        password: str,
        full_name: str,
        role: str,
        organization_id: Optional[str] = None,
        status: str = UserStatus.ACTIVE.value,
    ) -> Dict[str, Any]:
        db = await self._get_db()
        norm_email = email.lower().strip()
        existing = await db.users.find_one({"email": norm_email})
        if existing:
            raise ValueError(f"User with email '{norm_email}' already exists.")

        user_id = f"usr-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        user_doc = {
            "id": user_id,
            "_id": user_id,
            "email": norm_email,
            "password_hash": hash_password(password),
            "full_name": full_name,
            "role": role,
            "organization_id": organization_id,
            "status": status,
            "created_at": now,
            "updated_at": now,
        }
        await db.users.insert_one(user_doc)

        if organization_id:
            m_id = f"mem-{user_id}-{organization_id}"
            mem_doc = {
                "id": m_id,
                "_id": m_id,
                "user_id": user_id,
                "organization_id": organization_id,
                "role": role,
                "status": MembershipStatus.ACTIVE.value,
                "created_at": now,
                "updated_at": now,
            }
            await db.organizationMemberships.replace_one({"_id": m_id}, mem_doc, upsert=True)

        return _clean_doc(user_doc)

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        result = await db.users.update_one(
            {"$or": [{"_id": user_id}, {"id": user_id}]},
            {"$set": clean_updates}
        )
        if result.matched_count == 0:
            return None
        return await self.get_user_by_id(user_id)

    async def disable_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.update_user(user_id, {"status": UserStatus.DISABLED.value})

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 50,
        organization_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if organization_id:
            q["organization_id"] = organization_id
        if status:
            q["status"] = status

        total = await db.users.count_documents(q)
        cursor = db.users.find(q).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    # ----------------- Organization Methods -----------------

    async def get_organization(self, org_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.organizations.find_one({"$or": [{"_id": org_id}, {"id": org_id}]})
        return _clean_doc(doc)

    async def get_organization_by_id(self, org_id: str) -> Optional[Dict[str, Any]]:
        return await self.get_organization(org_id)

    async def get_organization_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.organizations.find_one({"code": code.upper().strip()})
        return _clean_doc(doc)

    async def create_organization(
        self,
        code: str,
        name: str,
        org_type: str,
        state: str = "Mizoram",
        district: Optional[str] = None,
        jurisdiction_scope: str = "DISTRICT",
    ) -> Dict[str, Any]:
        db = await self._get_db()
        norm_code = code.upper().strip()
        existing = await db.organizations.find_one({"code": norm_code})
        if existing:
            raise ValueError(f"Organization with code '{norm_code}' already exists.")

        org_id = f"org-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        org_doc = {
            "id": org_id,
            "_id": org_id,
            "code": norm_code,
            "name": name,
            "type": org_type,
            "state": state,
            "district": district,
            "jurisdiction_scope": jurisdiction_scope,
            "created_at": now,
            "updated_at": now,
        }
        await db.organizations.insert_one(org_doc)
        return _clean_doc(org_doc)

    async def list_organizations(
        self,
        skip: int = 0,
        limit: int = 50,
        org_type: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if org_type:
            q["type"] = org_type
        total = await db.organizations.count_documents(q)
        cursor = db.organizations.find(q).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    # ----------------- Membership Methods -----------------

    async def get_membership(self, user_id: str, organization_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.organizationMemberships.find_one({"user_id": user_id, "organization_id": organization_id})
        return _clean_doc(doc)

    async def create_or_update_membership(
        self,
        user_id: str,
        organization_id: str,
        role: str,
        status: str = MembershipStatus.ACTIVE.value,
    ) -> Dict[str, Any]:
        db = await self._get_db()
        m_id = f"mem-{user_id}-{organization_id}"
        now = datetime.now(timezone.utc)
        mem_doc = {
            "id": m_id,
            "_id": m_id,
            "user_id": user_id,
            "organization_id": organization_id,
            "role": role,
            "status": status,
            "updated_at": now,
        }
        existing = await db.organizationMemberships.find_one({"_id": m_id})
        if not existing:
            mem_doc["created_at"] = now
        await db.organizationMemberships.replace_one({"_id": m_id}, mem_doc, upsert=True)
        return _clean_doc(mem_doc)

    async def list_organization_members(
        self,
        organization_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q = {"organization_id": organization_id}
        total = await db.organizationMemberships.count_documents(q)
        cursor = db.organizationMemberships.find(q).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    async def list_user_memberships(self, user_id: str) -> List[Dict[str, Any]]:
        db = await self._get_db()
        cursor = db.organizationMemberships.find({"user_id": user_id})
        docs = await cursor.to_list(100)
        return [_clean_doc(d) for d in docs]

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
        db = await self._get_db()
        event_id = f"evt-{uuid.uuid4().hex}"
        event = {
            "id": event_id,
            "_id": event_id,
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
        await db.securityEvents.insert_one(event)
        return _clean_doc(event)

    async def list_security_events(
        self,
        skip: int = 0,
        limit: int = 50,
        actor_user_id: Optional[str] = None,
        event_type: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if actor_user_id:
            q["actor_user_id"] = actor_user_id
        if event_type:
            q["event_type"] = event_type
        total = await db.securityEvents.count_documents(q)
        cursor = db.securityEvents.find(q).sort("timestamp", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    # ==================== TOKEN REVOCATION & SESSION ROTATION ====================

    async def revoke_token(
        self,
        jti: str,
        user_id: Optional[str] = None,
        reason: str = "logout",
        expires_at: Optional[int] = None,
    ) -> None:
        db = await self._get_db()
        doc = {
            "jti": jti,
            "_id": jti,
            "user_id": user_id,
            "reason": reason,
            "revoked_at": datetime.now(timezone.utc),
            "expires_at": expires_at,
        }
        await db.revokedTokens.replace_one({"_id": jti}, doc, upsert=True)
        await db.refreshTokens.update_one({"jti": jti}, {"$set": {"revoked": True}})

    async def is_token_revoked(self, jti: str) -> bool:
        db = await self._get_db()
        found = await db.revokedTokens.find_one({"$or": [{"_id": jti}, {"jti": jti}]})
        return found is not None

    async def register_refresh_token(
        self,
        jti: str,
        user_id: str,
        family_id: str,
        expires_at: int,
    ) -> None:
        db = await self._get_db()
        doc = {
            "jti": jti,
            "_id": jti,
            "user_id": user_id,
            "family_id": family_id,
            "expires_at": expires_at,
            "revoked": False,
            "replaced_by": None,
            "created_at": datetime.now(timezone.utc),
        }
        await db.refreshTokens.replace_one({"_id": jti}, doc, upsert=True)

    async def verify_and_rotate_refresh_token(
        self,
        jti: str,
        user_id: str,
        new_jti: str,
        new_expires_at: int,
    ) -> Tuple[str, Optional[str]]:
        db = await self._get_db()
        rec = await db.refreshTokens.find_one({"$or": [{"_id": jti}, {"jti": jti}]})
        if not rec:
            return ("INVALID", None)

        family_id = rec.get("family_id")
        if rec.get("family_compromised"):
            return ("INVALID", family_id)

        if rec.get("replaced_by"):
            # Compromise detected! Invalidate the entire token family.
            await db.refreshTokens.update_many(
                {"family_id": family_id},
                {"$set": {"revoked": True, "family_compromised": True}}
            )
            async for t_rec in db.refreshTokens.find({"family_id": family_id}):
                t_jti = t_rec["jti"]
                await self.revoke_token(
                    jti=t_jti,
                    user_id=user_id,
                    reason="family_compromise_reuse",
                    expires_at=t_rec.get("expires_at"),
                )
            return ("REUSED", family_id)

        if rec.get("revoked") or await self.is_token_revoked(jti):
            return ("INVALID", family_id)

        # Valid rotation
        await db.refreshTokens.update_one(
            {"_id": rec["_id"]},
            {"$set": {"revoked": True, "replaced_by": new_jti}}
        )
        await self.revoke_token(
            jti=jti,
            user_id=user_id,
            reason="rotated",
            expires_at=rec.get("expires_at"),
        )
        await self.register_refresh_token(
            jti=new_jti,
            user_id=user_id,
            family_id=family_id,
            expires_at=new_expires_at,
        )
        return ("VALID", family_id)

    async def invalidate_token_family(self, family_id: str, user_id: Optional[str] = None) -> None:
        db = await self._get_db()
        await db.refreshTokens.update_many(
            {"family_id": family_id},
            {"$set": {"revoked": True, "family_compromised": True}}
        )

    # ----------------- Stage 3: Districts -----------------

    async def create_district(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        code = data.get("code", "").strip().upper()
        existing = await db.districts.find_one({"code": code})
        if existing:
            raise ConflictException(f"District code '{code}' already exists")

        now = datetime.now(timezone.utc)
        d_id = data.get("id") or f"dst-{uuid.uuid4().hex[:8]}"
        district = {
            **data,
            "id": d_id,
            "_id": d_id,
            "code": code,
            "created_at": now,
            "updated_at": now,
            "created_by": actor_id,
            "updated_by": actor_id,
        }
        await db.districts.insert_one(district)
        return _clean_doc(district)

    DISTRICT_ID_ALIASES = {
        "d-miz-aizawl": "dst-aizawl",
        "d-miz-kolasib": "dst-kolasib",
        "d-miz-lunglei": "dst-lunglei",
        "d-miz-champhai": "dst-champhai",
        "d-miz-serchhip": "dst-serchhip",
    }

    async def get_district(self, district_id: str) -> Optional[Dict[str, Any]]:
        if not district_id:
            return None
        db = await self._get_db()
        norm = self.DISTRICT_ID_ALIASES.get(district_id.strip().lower(), district_id)
        doc = await db.districts.find_one({"$or": [{"_id": norm}, {"id": norm}, {"_id": district_id}, {"id": district_id}]})
        return _clean_doc(doc)

    get_district_by_id = get_district

    async def get_district_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        if not code:
            return None
        db = await self._get_db()
        doc = await db.districts.find_one({"code": code.strip().upper()})
        if not doc:
            alias = self.DISTRICT_ID_ALIASES.get(code.strip().lower())
            if alias:
                doc = await db.districts.find_one({"$or": [{"_id": alias}, {"id": alias}]})
        return _clean_doc(doc)

    async def list_districts(
        self,
        skip: int = 0,
        limit: int = 50,
        state_code: Optional[str] = None,
        status: Optional[str] = None,
        containing_point: Optional[List[float]] = None,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if state_code:
            q["state_code"] = state_code.strip().upper()
        if status:
            q["status"] = status

        cursor = db.districts.find(q)
        all_docs = await cursor.to_list(1000)
        items = [_clean_doc(d) for d in all_docs]

        if containing_point:
            items = [d for d in items if point_in_geojson_geometry(containing_point, d.get("geometry", {}))]
        if bbox:
            items = [d for d in items if geometry_intersects_bbox(d.get("geometry", {}), bbox)]

        items.sort(key=lambda x: x.get("name", ""))
        total = len(items)
        return items[skip : skip + limit], total

    async def update_district(
        self, district_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id", "code", "created_at", "created_by")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        clean_updates["updated_by"] = actor_id
        res = await db.districts.update_one(
            {"$or": [{"_id": district_id}, {"id": district_id}]},
            {"$set": clean_updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_district(district_id)

    # ----------------- Stage 3: Slope Units -----------------

    async def create_slope_unit(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        code = data.get("code", "").strip().upper()
        existing = await db.slopeUnits.find_one({"code": code})
        if existing:
            raise ConflictException(f"Slope unit with code '{code}' already exists.")

        district_id = data.get("district_id")
        dist = await self.get_district(district_id)
        if not district_id or not dist:
            raise ValidationException(f"Referenced district '{district_id}' does not exist.")

        now = datetime.now(timezone.utc)
        su_id = data.get("id") or f"su-{uuid.uuid4().hex[:8]}"
        slope_unit = {
            **data,
            "id": su_id,
            "_id": su_id,
            "code": code,
            "created_at": now,
            "updated_at": now,
            "created_by": actor_id,
            "updated_by": actor_id,
        }
        await db.slopeUnits.insert_one(slope_unit)
        return _clean_doc(slope_unit)

    async def get_slope_unit(self, slope_unit_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.slopeUnits.find_one({"$or": [{"_id": slope_unit_id}, {"id": slope_unit_id}]})
        return _clean_doc(doc)

    async def get_slope_unit_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.slopeUnits.find_one({"code": code.strip().upper()})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if state_code:
            q["state_code"] = state_code.strip().upper()
        if status:
            q["status"] = status

        cursor = db.slopeUnits.find(q)
        all_docs = await cursor.to_list(2000)
        items = [_clean_doc(d) for d in all_docs]

        if containing_point:
            items = [su for su in items if point_in_geojson_geometry(containing_point, su.get("geometry", {}))]
        if bbox:
            items = [su for su in items if geometry_intersects_bbox(su.get("geometry", {}), bbox)]

        items.sort(key=lambda x: x.get("code", ""))
        total = len(items)
        return items[skip : skip + limit], total

    async def update_slope_unit(
        self, slope_unit_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id", "code", "district_id", "created_at", "created_by")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        clean_updates["updated_by"] = actor_id
        res = await db.slopeUnits.update_one(
            {"$or": [{"_id": slope_unit_id}, {"id": slope_unit_id}]},
            {"$set": clean_updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_slope_unit(slope_unit_id)

    # ----------------- Stage 3: Roads -----------------

    async def create_road(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        road_code = data.get("road_code", "").strip().upper()
        existing = await db.roads.find_one({"road_code": road_code})
        if existing:
            raise ConflictException(f"Road with code '{road_code}' already exists.")

        district_id = data.get("district_id")
        dist = await self.get_district(district_id)
        if not district_id or not dist:
            raise ValidationException(f"Referenced district '{district_id}' does not exist.")

        now = datetime.now(timezone.utc)
        r_id = data.get("id") or f"road-{uuid.uuid4().hex[:8]}"
        road = {
            **data,
            "id": r_id,
            "_id": r_id,
            "road_code": road_code,
            "created_at": now,
            "updated_at": now,
            "created_by": actor_id,
            "updated_by": actor_id,
        }
        await db.roads.insert_one(road)
        return _clean_doc(road)

    async def get_road(self, road_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.roads.find_one({"$or": [{"_id": road_id}, {"id": road_id}]})
        return _clean_doc(doc)

    async def get_road_by_code(self, road_code: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.roads.find_one({"road_code": road_code.strip().upper()})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if state_code:
            q["state_code"] = state_code.strip().upper()
        if road_type:
            q["road_type"] = road_type
        if authority_organization_id:
            q["authority_organization_id"] = authority_organization_id
        if operational_status:
            q["operational_status"] = operational_status

        cursor = db.roads.find(q)
        all_docs = await cursor.to_list(1000)
        items = [_clean_doc(d) for d in all_docs]

        if nearby_point:
            items = [r for r in items if distance_point_to_geometry(nearby_point, r.get("geometry", {})) <= max_radius_m]

        items.sort(key=lambda x: x.get("road_code", ""))
        total = len(items)
        return items[skip : skip + limit], total

    async def update_road(
        self, road_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id", "road_code", "created_at", "created_by")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        clean_updates["updated_by"] = actor_id
        res = await db.roads.update_one(
            {"$or": [{"_id": road_id}, {"id": road_id}]},
            {"$set": clean_updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_road(road_id)

    # ----------------- Stage 3: Road Chainages -----------------

    async def create_road_chainage(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        road_id = data.get("road_id")
        road = await self.get_road(road_id)
        if not road_id or not road:
            raise ValidationException(f"Referenced road '{road_id}' does not exist.")

        km = float(data.get("chainage_km", 0.0))
        existing = await db.roadChainages.find_one({"road_id": road_id, "chainage_km": km})
        if existing:
            raise ConflictException(f"Chainage km {km} already exists for road '{road_id}'.")

        now = datetime.now(timezone.utc)
        ch_id = data.get("id") or f"ch-{uuid.uuid4().hex[:8]}"
        chainage = {
            **data,
            "id": ch_id,
            "_id": ch_id,
            "chainage_km": km,
            "district_id": road.get("district_id"),
            "created_at": now,
            "updated_at": now,
            "created_by": actor_id,
            "updated_by": actor_id,
        }
        await db.roadChainages.insert_one(chainage)
        return _clean_doc(chainage)

    async def get_road_chainage(self, chainage_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.roadChainages.find_one({"$or": [{"_id": chainage_id}, {"id": chainage_id}]})
        return _clean_doc(doc)

    async def list_road_chainages(
        self,
        skip: int = 0,
        limit: int = 50,
        road_id: Optional[str] = None,
        district_id: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if road_id:
            q["road_id"] = road_id
        if district_id:
            q["district_id"] = district_id
        total = await db.roadChainages.count_documents(q)
        cursor = db.roadChainages.find(q).sort([("road_id", 1), ("chainage_km", 1)]).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    async def update_road_chainage(
        self, chainage_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id", "road_id", "created_at", "created_by")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        clean_updates["updated_by"] = actor_id
        res = await db.roadChainages.update_one(
            {"$or": [{"_id": chainage_id}, {"id": chainage_id}]},
            {"$set": clean_updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_road_chainage(chainage_id)

    # ----------------- Stage 3: Villages -----------------

    async def create_village(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        district_id = data.get("district_id")
        dist = await self.get_district(district_id)
        if not district_id or not dist:
            raise ValidationException(f"Referenced district '{district_id}' does not exist.")

        now = datetime.now(timezone.utc)
        v_id = data.get("id") or f"vil-{uuid.uuid4().hex[:8]}"
        village = {
            **data,
            "id": v_id,
            "_id": v_id,
            "created_at": now,
            "updated_at": now,
            "created_by": actor_id,
            "updated_by": actor_id,
        }
        await db.villages.insert_one(village)
        return _clean_doc(village)

    async def get_village(self, village_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.villages.find_one({"$or": [{"_id": village_id}, {"id": village_id}]})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if state_code:
            q["state_code"] = state_code.strip().upper()
        if status:
            q["status"] = status

        cursor = db.villages.find(q)
        all_docs = await cursor.to_list(1000)
        items = [_clean_doc(d) for d in all_docs]

        if nearby_point:
            items = [v for v in items if distance_point_to_geometry(nearby_point, v.get("geometry", {})) <= max_radius_m]

        items.sort(key=lambda x: x.get("name", ""))
        total = len(items)
        return items[skip : skip + limit], total

    async def update_village(
        self, village_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id", "created_at", "created_by")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        clean_updates["updated_by"] = actor_id
        res = await db.villages.update_one(
            {"$or": [{"_id": village_id}, {"id": village_id}]},
            {"$set": clean_updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_village(village_id)

    # ----------------- Stage 3: Assets -----------------

    async def create_asset(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        district_id = data.get("district_id")
        dist = await self.get_district(district_id)
        if not district_id or not dist:
            raise ValidationException(f"Referenced district '{district_id}' does not exist.")

        now = datetime.now(timezone.utc)
        a_id = data.get("id") or f"ast-{uuid.uuid4().hex[:8]}"
        asset = {
            **data,
            "id": a_id,
            "_id": a_id,
            "created_at": now,
            "updated_at": now,
            "created_by": actor_id,
            "updated_by": actor_id,
        }
        await db.assets.insert_one(asset)
        return _clean_doc(asset)

    async def get_asset(self, asset_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.assets.find_one({"$or": [{"_id": asset_id}, {"id": asset_id}]})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if organization_id:
            q["organization_id"] = organization_id
        if district_id:
            q["district_id"] = district_id
        if state_code:
            q["state_code"] = state_code.strip().upper()
        if asset_type:
            q["asset_type"] = asset_type
        if operational_status:
            q["operational_status"] = operational_status

        cursor = db.assets.find(q)
        all_docs = await cursor.to_list(1000)
        items = [_clean_doc(d) for d in all_docs]

        if nearby_point:
            items = [a for a in items if distance_point_to_geometry(nearby_point, a.get("geometry", {})) <= max_radius_m]

        items.sort(key=lambda x: x.get("name", ""))
        total = len(items)
        return items[skip : skip + limit], total

    async def update_asset(
        self, asset_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id", "created_at", "created_by")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        clean_updates["updated_by"] = actor_id
        res = await db.assets.update_one(
            {"$or": [{"_id": asset_id}, {"id": asset_id}]},
            {"$set": clean_updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_asset(asset_id)

    # ----------------- Stage 3: Landslide Events -----------------

    async def create_landslide_event(self, data: Dict[str, Any], actor_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        ref = data.get("event_reference", "").strip()
        existing = await db.landslideEvents.find_one({"event_reference": ref})
        if existing:
            raise ConflictException(f"Landslide event with reference '{ref}' already exists.")

        district_id = data.get("district_id")
        dist = await self.get_district(district_id)
        if not district_id or not dist:
            raise ValidationException(f"Referenced district '{district_id}' does not exist.")

        now = datetime.now(timezone.utc)
        e_id = data.get("id") or f"evt-{uuid.uuid4().hex[:8]}"
        event = {
            **data,
            "id": e_id,
            "_id": e_id,
            "event_reference": ref,
            "created_at": now,
            "updated_at": now,
            "created_by": actor_id,
            "updated_by": actor_id,
        }
        await db.landslideEvents.insert_one(event)
        return _clean_doc(event)

    async def get_landslide_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.landslideEvents.find_one({"$or": [{"_id": event_id}, {"id": event_id}]})
        return _clean_doc(doc)

    async def get_landslide_event_by_ref(self, ref: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.landslideEvents.find_one({"event_reference": ref.strip()})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if state_code:
            q["state_code"] = state_code.strip().upper()
        if source:
            q["source"] = source
        if status:
            q["status"] = status
        if from_date or to_date:
            time_q = {}
            if from_date:
                time_q["$gte"] = from_date
            if to_date:
                time_q["$lte"] = to_date
            q["event_time"] = time_q

        cursor = db.landslideEvents.find(q)
        all_docs = await cursor.to_list(1000)
        items = [_clean_doc(d) for d in all_docs]

        if nearby_point:
            items = [e for e in items if distance_point_to_geometry(nearby_point, e.get("geometry", {})) <= max_radius_m]

        items.sort(key=lambda x: _safe_sort_dt(x.get("event_time")), reverse=True)
        total = len(items)
        return items[skip : skip + limit], total

    async def update_landslide_event(
        self, event_id: str, updates: Dict[str, Any], actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        clean_updates = {k: v for k, v in updates.items() if v is not None and k not in ("_id", "id", "event_reference", "created_at", "created_by")}
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        clean_updates["updated_by"] = actor_id
        res = await db.landslideEvents.update_one(
            {"$or": [{"_id": event_id}, {"id": event_id}]},
            {"$set": clean_updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_landslide_event(event_id)

    # ----------------- Stage 3: Unified Spatial Primitives -----------------

    async def find_spatial_entities(
        self,
        entity_types: List[str],
        nearby_point: Optional[List[float]] = None,
        radius_m: float = 5000.0,
        containing_point: Optional[List[float]] = None,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        limit: int = 50,
    ) -> Dict[str, List[Dict[str, Any]]]:
        db = await self._get_db()
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

        results: Dict[str, List[Dict[str, Any]]] = {}

        if "districts" in normalized_types:
            docs = await db.districts.find({}).to_list(500)
            d_matches = []
            for d in [_clean_doc(doc) for doc in docs]:
                geom = d.get("geometry", {})
                if containing_point and not point_in_geojson_geometry(containing_point, geom):
                    continue
                if bbox and not geometry_intersects_bbox(geom, bbox):
                    continue
                if nearby_point and distance_point_to_geometry(nearby_point, geom) > radius_m:
                    continue
                d_matches.append(d)
            results["districts"] = d_matches[:limit]

        if "slope_units" in normalized_types:
            docs = await db.slopeUnits.find({}).to_list(1000)
            su_matches = []
            for su in [_clean_doc(doc) for doc in docs]:
                geom = su.get("geometry", {})
                if containing_point and not point_in_geojson_geometry(containing_point, geom):
                    continue
                if bbox and not geometry_intersects_bbox(geom, bbox):
                    continue
                if nearby_point and distance_point_to_geometry(nearby_point, geom) > radius_m:
                    continue
                su_matches.append(su)
            results["slope_units"] = su_matches[:limit]

        if "roads" in normalized_types:
            docs = await db.roads.find({}).to_list(500)
            rd_matches = []
            for r in [_clean_doc(doc) for doc in docs]:
                geom = r.get("geometry", {})
                if nearby_point and distance_point_to_geometry(nearby_point, geom) > radius_m:
                    continue
                if bbox and not geometry_intersects_bbox(geom, bbox):
                    continue
                rd_matches.append(r)
            results["roads"] = rd_matches[:limit]

        if "villages" in normalized_types:
            docs = await db.villages.find({}).to_list(500)
            vil_matches = []
            for v in [_clean_doc(doc) for doc in docs]:
                geom = v.get("geometry", {})
                if nearby_point and distance_point_to_geometry(nearby_point, geom) > radius_m:
                    continue
                if bbox and not geometry_intersects_bbox(geom, bbox):
                    continue
                vil_matches.append(v)
            results["villages"] = vil_matches[:limit]

        if "assets" in normalized_types:
            docs = await db.assets.find({}).to_list(500)
            ast_matches = []
            for a in [_clean_doc(doc) for doc in docs]:
                geom = a.get("geometry", {})
                if nearby_point and distance_point_to_geometry(nearby_point, geom) > radius_m:
                    continue
                if bbox and not geometry_intersects_bbox(geom, bbox):
                    continue
                ast_matches.append(a)
            results["assets"] = ast_matches[:limit]

        if "landslide_events" in normalized_types:
            docs = await db.landslideEvents.find({}).to_list(500)
            evt_matches = []
            for e in [_clean_doc(doc) for doc in docs]:
                geom = e.get("geometry", {})
                if nearby_point and distance_point_to_geometry(nearby_point, geom) > radius_m:
                    continue
                if bbox and not geometry_intersects_bbox(geom, bbox):
                    continue
                evt_matches.append(e)
            results["landslide_events"] = evt_matches[:limit]

        return results

    # ----------------- Stage 5: Risk Engine -----------------

    async def create_risk_prediction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        p_id = data.get("id") or f"pred-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": p_id, "_id": p_id}
        await db.riskPredictions.replace_one({"_id": p_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_risk_prediction_by_id(self, prediction_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.riskPredictions.find_one({"$or": [{"_id": prediction_id}, {"id": prediction_id}]})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if subject_type:
            q["subject_type"] = subject_type
        if subject_id:
            q["subject_id"] = subject_id
        if district_id:
            q["district_id"] = district_id
        if state_code:
            q["state_code"] = state_code.strip().upper()
        if model_version_id:
            q["model_version_id"] = model_version_id
        if risk_level:
            q["risk_level"] = risk_level
        if status:
            q["status"] = status

        total = await db.riskPredictions.count_documents(q)
        skip = (page - 1) * limit
        cursor = db.riskPredictions.find(q).sort("generated_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    async def create_risk_feature_snapshot(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        s_id = data.get("id") or f"snap-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": s_id, "_id": s_id}
        await db.riskFeatureSnapshots.replace_one({"_id": s_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_risk_feature_snapshot_by_id(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.riskFeatureSnapshots.find_one({"$or": [{"_id": snapshot_id}, {"id": snapshot_id}]})
        return _clean_doc(doc)

    async def create_model_run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        r_id = data.get("id") or f"run-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": r_id, "_id": r_id}
        await db.modelRuns.replace_one({"_id": r_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_model_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.modelRuns.find_one({"$or": [{"_id": run_id}, {"id": run_id}]})
        return _clean_doc(doc)

    async def list_model_runs(
        self, model_version_id: Optional[str] = None, page: int = 1, limit: int = 50
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if model_version_id:
            q["model_version_id"] = model_version_id
        total = await db.modelRuns.count_documents(q)
        skip = (page - 1) * limit
        cursor = db.modelRuns.find(q).sort("execution_time", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    async def update_model_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        res = await db.modelRuns.update_one(
            {"$or": [{"_id": run_id}, {"id": run_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_model_run_by_id(run_id)

    async def create_prediction_explanation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        e_id = data.get("id") or f"expl-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": e_id, "_id": e_id}
        await db.predictionExplanations.replace_one({"_id": e_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_prediction_explanation_by_id(self, expl_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.predictionExplanations.find_one({"$or": [{"_id": expl_id}, {"id": expl_id}]})
        return _clean_doc(doc)

    async def get_prediction_explanation_by_prediction_id(self, pred_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.predictionExplanations.find_one({"prediction_id": pred_id})
        return _clean_doc(doc)

    async def create_risk_evidence(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        e_id = data.get("id") or f"evid-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": e_id, "_id": e_id}
        await db.riskEvidence.replace_one({"_id": e_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_risk_evidence_by_prediction_id(self, pred_id: str) -> List[Dict[str, Any]]:
        db = await self._get_db()
        cursor = db.riskEvidence.find({"prediction_id": pred_id})
        docs = await cursor.to_list(100)
        return [_clean_doc(d) for d in docs]

    # ----------------- Stage 6: Satellite & InSAR -----------------

    async def create_satellite_observation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        obs_id = data.get("id") or f"sat-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": obs_id, "_id": obs_id}
        await db.satelliteObservations.replace_one({"_id": obs_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_satellite_observation_by_id(self, obs_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.satelliteObservations.find_one({"$or": [{"_id": obs_id}, {"id": obs_id}]})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if mission:
            q["mission"] = mission
        if product_type:
            q["product_type"] = product_type
        if district_id:
            q["district_id"] = district_id
        if quality_state:
            q["quality_state"] = quality_state

        cursor = db.satelliteObservations.find(q)
        all_docs = await cursor.to_list(1000)
        items = [_clean_doc(d) for d in all_docs]

        if bbox:
            b_tuple = (bbox[0], bbox[1], bbox[2], bbox[3])
            items = [obs for obs in items if geometry_intersects_bbox(obs.get("footprint", {}), b_tuple)]

        items.sort(key=lambda x: _safe_sort_dt(x.get("acquisition_time")), reverse=True)
        total = len(items)
        skip = (page - 1) * limit
        return items[skip : skip + limit], total

    async def create_insar_observation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        obs_id = data.get("id") or f"insar-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": obs_id, "_id": obs_id}
        await db.insarObservations.replace_one({"_id": obs_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_insar_observation_by_id(self, obs_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.insarObservations.find_one({"$or": [{"_id": obs_id}, {"id": obs_id}]})
        return _clean_doc(doc)

    async def list_insar_observations(
        self,
        bbox: Optional[List[float]] = None,
        district_id: Optional[str] = None,
        quality_state: Optional[str] = None,
        min_coherence: Optional[float] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if quality_state:
            q["quality_state"] = quality_state
        if min_coherence is not None:
            q["coherence"] = {"$gte": min_coherence}

        cursor = db.insarObservations.find(q)
        all_docs = await cursor.to_list(1000)
        items = [_clean_doc(d) for d in all_docs]

        if bbox:
            b_tuple = (bbox[0], bbox[1], bbox[2], bbox[3])
            items = [obs for obs in items if geometry_intersects_bbox(obs.get("deformation_geometry", {}), b_tuple)]

        items.sort(key=lambda x: _safe_sort_dt(x.get("acquisition_end")), reverse=True)
        total = len(items)
        skip = (page - 1) * limit
        return items[skip : skip + limit], total

    async def create_satellite_processing_run(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        r_id = data.get("id") or f"satrun-{uuid.uuid4().hex[:12]}"
        doc = {**data, "id": r_id, "_id": r_id}
        await db.satelliteProcessingRuns.replace_one({"_id": r_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_satellite_processing_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.satelliteProcessingRuns.find_one({"$or": [{"_id": run_id}, {"id": run_id}]})
        return _clean_doc(doc)

    async def list_satellite_processing_runs(
        self, status: Optional[str] = None, page: int = 1, limit: int = 50
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if status:
            q["status"] = status
        total = await db.satelliteProcessingRuns.count_documents(q)
        skip = (page - 1) * limit
        cursor = db.satelliteProcessingRuns.find(q).sort("start_time", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    async def update_satellite_processing_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        res = await db.satelliteProcessingRuns.update_one(
            {"$or": [{"_id": run_id}, {"id": run_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_satellite_processing_run_by_id(run_id)

    # ----------------- Stage 7: Consequence Intelligence -----------------

    async def create_consequence_relationship(self, rel_dict: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        rel_id = rel_dict["id"]
        doc = {**rel_dict, "_id": rel_id}
        await db.consequenceRelationships.replace_one({"_id": rel_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_consequence_relationship_by_id(self, rel_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.consequenceRelationships.find_one({"$or": [{"_id": rel_id}, {"id": rel_id}]})
        return _clean_doc(doc)

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
        db = await self._get_db()
        limit = max(1, min(limit, 100))
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if source_type:
            q["source_type"] = {"$regex": f"^{source_type}$", "$options": "i"}
        if source_id:
            q["source_id"] = source_id
        if target_type:
            q["target_type"] = {"$regex": f"^{target_type}$", "$options": "i"}
        if target_id:
            q["target_id"] = target_id
        if relationship_type:
            q["relationship_type"] = {"$regex": f"^{relationship_type}$", "$options": "i"}
        if spatial_relation:
            q["spatial_relation"] = {"$regex": f"^{spatial_relation}$", "$options": "i"}
        if criticality:
            q["criticality"] = {"$regex": f"^{criticality}$", "$options": "i"}
        if organization_id:
            q["organization_id"] = organization_id
        if status:
            q["status"] = {"$regex": f"^{status}$", "$options": "i"}

        total = await db.consequenceRelationships.count_documents(q)
        skip = (page - 1) * limit
        cursor = db.consequenceRelationships.find(q).sort("generated_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    async def create_consequence_run(self, run_dict: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        run_id = run_dict["id"]
        doc = {**run_dict, "_id": run_id}
        await db.consequenceRuns.replace_one({"_id": run_id}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_consequence_run_by_id(self, run_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.consequenceRuns.find_one({"$or": [{"_id": run_id}, {"id": run_id}]})
        return _clean_doc(doc)

    async def list_consequence_runs(
        self,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[List[Dict[str, Any]], int]:
        db = await self._get_db()
        limit = max(1, min(limit, 100))
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if status:
            q["status"] = {"$regex": f"^{status}$", "$options": "i"}
        total = await db.consequenceRuns.count_documents(q)
        skip = (page - 1) * limit
        cursor = db.consequenceRuns.find(q).sort("start_time", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs], total

    async def update_consequence_run(self, run_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        res = await db.consequenceRuns.update_one(
            {"$or": [{"_id": run_id}, {"id": run_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_consequence_run_by_id(run_id)

    async def get_consequence_summary(self, district_id: str) -> Dict[str, Any]:
        db = await self._get_db()
        cursor = db.consequenceRelationships.find({"district_id": district_id})
        rels = [_clean_doc(d) for d in await cursor.to_list(1000)]
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

    # ----------------- Stage 8: Actions -----------------

    async def get_action_by_id(self, action_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.actions.find_one({"$or": [{"_id": action_id}, {"id": action_id}]})
        return _clean_doc(doc)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if status:
            q["status"] = status
        if priority:
            q["priority"] = priority
        if action_type:
            q["action_type"] = action_type
        if target_entity_type:
            q["target_entity_type"] = target_entity_type

        cursor = db.actions.find(q).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def create_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        aid = action_data.get("id") or f"act-{uuid.uuid4().hex[:12]}"
        action_data["id"] = aid
        doc = _prep_doc(action_data)
        await db.actions.replace_one({"_id": aid}, doc, upsert=True)
        return _clean_doc(doc)

    async def update_action(self, action_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        updates["updated_at"] = datetime.now(timezone.utc)
        res = await db.actions.update_one(
            {"$or": [{"_id": action_id}, {"id": action_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_action_by_id(action_id)

    async def get_action_summary(self, district_id: str) -> Dict[str, Any]:
        db = await self._get_db()
        cursor = db.actions.find({"district_id": district_id})
        acts = [_clean_doc(d) for d in await cursor.to_list(1000)]
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

    # ----------------- Stage 8: Warnings -----------------

    async def get_warning_by_id(self, warning_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.warnings.find_one({"$or": [{"_id": warning_id}, {"id": warning_id}]})
        return _clean_doc(doc)

    async def list_warnings(
        self,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        warning_type: Optional[str] = None,
        affected_entity_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if status:
            q["status"] = status
        if warning_type:
            q["warning_type"] = warning_type
        if affected_entity_type:
            q["affected_entity_type"] = affected_entity_type

        cursor = db.warnings.find(q).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def create_warning(self, warning_data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        wid = warning_data.get("id") or f"wrn-{uuid.uuid4().hex[:12]}"
        warning_data["id"] = wid
        doc = _prep_doc(warning_data)
        await db.warnings.replace_one({"_id": wid}, doc, upsert=True)
        return _clean_doc(doc)

    async def update_warning(self, warning_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        updates["updated_at"] = datetime.now(timezone.utc)
        res = await db.warnings.update_one(
            {"$or": [{"_id": warning_id}, {"id": warning_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_warning_by_id(warning_id)

    async def get_warning_summary(self, district_id: str) -> Dict[str, Any]:
        db = await self._get_db()
        cursor = db.warnings.find({"district_id": district_id})
        wrns = [_clean_doc(d) for d in await cursor.to_list(1000)]
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

    # ----------------- Stage 8: Warning Ledger -----------------

    async def get_ledger_entry_by_id(self, entry_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.warningLedger.find_one({"$or": [{"_id": entry_id}, {"id": entry_id}]})
        return _clean_doc(doc)

    async def list_ledger_entries(
        self,
        district_id: Optional[str] = None,
        warning_id: Optional[str] = None,
        action_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if warning_id:
            q["warning_id"] = warning_id
        if action_id:
            q["action_id"] = action_id

        cursor = db.warningLedger.find(q).sort("sequence_number", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def list_all_ledger_entries_for_district(self, district_id: str) -> List[Dict[str, Any]]:
        db = await self._get_db()
        cursor = db.warningLedger.find({"district_id": district_id}).sort("sequence_number", 1)
        docs = await cursor.to_list(1000)
        return [_clean_doc(d) for d in docs]

    async def get_latest_ledger_entry(self, district_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.warningLedger.find_one(
            {"district_id": district_id},
            sort=[("sequence_number", -1)]
        )
        return _clean_doc(doc)

    async def append_ledger_entry(self, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        doc = _prep_doc(entry_data)
        await db.warningLedger.insert_one(doc)
        return _clean_doc(doc)

    # ----------------- Stage 8: Playbooks -----------------

    async def get_playbook_by_id(self, playbook_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.playbooks.find_one({"$or": [{"_id": playbook_id}, {"id": playbook_id}]})
        return _clean_doc(doc)

    async def get_playbook_by_code(self, playbook_code: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.playbooks.find_one({"playbook_code": playbook_code.strip()})
        return _clean_doc(doc)

    async def list_playbooks(self, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if is_active is not None:
            q["is_active"] = is_active
        cursor = db.playbooks.find(q).sort("playbook_code", 1)
        docs = await cursor.to_list(100)
        return [_clean_doc(d) for d in docs]

    async def create_playbook(self, playbook_data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        pid = playbook_data.get("id") or f"pbk-{uuid.uuid4().hex[:8]}"
        playbook_data["id"] = pid
        doc = _prep_doc(playbook_data)
        await db.playbooks.replace_one({"_id": pid}, doc, upsert=True)
        return _clean_doc(doc)

    async def update_playbook(self, playbook_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        updates["updated_at"] = datetime.now(timezone.utc)
        res = await db.playbooks.update_one(
            {"$or": [{"_id": playbook_id}, {"id": playbook_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_playbook_by_id(playbook_id)

    # ----------------- Stage 9: Alerts & Delivery Jobs -----------------

    async def get_alert_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.alerts.find_one({"$or": [{"_id": alert_id}, {"id": alert_id}]})
        return _clean_doc(doc)

    async def get_alert_by_idempotency_key(self, key: str) -> Optional[Dict[str, Any]]:
        if not key:
            return None
        db = await self._get_db()
        doc = await db.alerts.find_one({"idempotency_key": key})
        return _clean_doc(doc)

    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        aid = alert_data.get("id") or f"alt-{uuid.uuid4().hex[:12]}"
        alert_data["id"] = aid
        doc = _prep_doc(alert_data)
        try:
            await db.alerts.replace_one({"_id": aid}, doc, upsert=True)
            return _clean_doc(doc)
        except Exception as exc:
            if "duplicate key" in str(exc).lower() and doc.get("idempotency_key"):
                existing = await db.alerts.find_one({"idempotency_key": doc["idempotency_key"]})
                if existing:
                    return _clean_doc(existing)
            raise

    async def update_alert(self, alert_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        res = await db.alerts.update_one(
            {"$or": [{"_id": alert_id}, {"id": alert_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_alert_by_id(alert_id)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if warning_id:
            q["warning_id"] = warning_id
        if status:
            q["status"] = status
        if recipient_id:
            q["recipient_id"] = recipient_id
        if channel:
            q["channel"] = channel

        cursor = db.alerts.find(q).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def get_alerts_summary(self, district_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        cursor = db.alerts.find(q)
        alerts = [_clean_doc(d) for d in await cursor.to_list(2000)]
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
        db = await self._get_db()
        jid = job_data.get("job_id") or f"job-{uuid.uuid4().hex[:12]}"
        job_data["job_id"] = jid
        job_data["id"] = jid
        doc = _prep_doc(job_data)
        await db.deliveryJobs.replace_one({"_id": jid}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_delivery_job_by_id(self, job_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.deliveryJobs.find_one({"$or": [{"_id": job_id}, {"job_id": job_id}, {"id": job_id}]})
        return _clean_doc(doc)

    async def update_delivery_job(self, job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        res = await db.deliveryJobs.update_one(
            {"$or": [{"_id": job_id}, {"job_id": job_id}, {"id": job_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_delivery_job_by_id(job_id)

    async def list_pending_delivery_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        db = await self._get_db()
        cursor = db.deliveryJobs.find(
            {"status": {"$in": ["QUEUED", "RETRYING"]}}
        ).sort("created_at", 1).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    # ----------------- Stage 9: Alert Acknowledgements -----------------

    async def create_alert_acknowledgement(self, ack_data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        aid = ack_data.get("id") or f"ack-{uuid.uuid4().hex[:12]}"
        ack_data["id"] = aid
        doc = _prep_doc(ack_data)
        await db.alertAcknowledgements.replace_one({"_id": aid}, doc, upsert=True)
        return _clean_doc(doc)

    async def list_alert_acknowledgements(self, alert_id: str) -> List[Dict[str, Any]]:
        db = await self._get_db()
        cursor = db.alertAcknowledgements.find({"alert_id": alert_id}).sort("acknowledged_at", -1)
        docs = await cursor.to_list(100)
        return [_clean_doc(d) for d in docs]

    # ----------------- Stage 10: Citizen Reports -----------------

    async def create_citizen_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        rid = data.get("id") or f"cr-{uuid.uuid4().hex[:12]}"
        data["id"] = rid
        doc = _prep_doc(data)
        await db.citizenReports.replace_one({"_id": rid}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_citizen_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.citizenReports.find_one({"$or": [{"_id": report_id}, {"id": report_id}]})
        return _clean_doc(doc)

    async def update_citizen_report(self, report_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        res = await db.citizenReports.update_one(
            {"$or": [{"_id": report_id}, {"id": report_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_citizen_report_by_id(report_id)

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
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if category:
            q["category"] = category
        if status:
            q["status"] = status
        if moderation_state:
            q["moderation_state"] = moderation_state
        if reporter_id:
            q["reporter_id"] = reporter_id

        cursor = db.citizenReports.find(q).sort("reported_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def count_citizen_reports(
        self,
        district_id: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        moderation_state: Optional[str] = None,
    ) -> int:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if category:
            q["category"] = category
        if status:
            q["status"] = status
        if moderation_state:
            q["moderation_state"] = moderation_state
        return await db.citizenReports.count_documents(q)

    async def get_community_summary(self, district_id: Optional[str] = None) -> Dict[str, Any]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        cursor = db.citizenReports.find(q)
        reports = [_clean_doc(d) for d in await cursor.to_list(2000)]
        clusters_cursor = db.communityEventClusters.find(q)
        clusters = [_clean_doc(d) for d in await clusters_cursor.to_list(500)]

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

    # ----------------- Stage 10: Community Event Clusters -----------------

    async def create_community_cluster(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        cid = data.get("id") or f"cls-{uuid.uuid4().hex[:12]}"
        data["id"] = cid
        doc = _prep_doc(data)
        await db.communityEventClusters.replace_one({"_id": cid}, doc, upsert=True)
        return _clean_doc(doc)

    async def list_community_clusters(
        self,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if status:
            q["status"] = status
        cursor = db.communityEventClusters.find(q).sort("first_reported_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def get_community_cluster_by_id(self, cluster_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.communityEventClusters.find_one({"$or": [{"_id": cluster_id}, {"id": cluster_id}]})
        return _clean_doc(doc)

    async def clear_community_clusters(self, district_id: Optional[str] = None) -> None:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        await db.communityEventClusters.delete_many(q)

    # ----------------- Stage 10: Community Moderation Events -----------------

    async def create_moderation_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        mid = data.get("id") or f"mod-{uuid.uuid4().hex[:12]}"
        data["id"] = mid
        doc = _prep_doc(data)
        await db.communityModerationEvents.replace_one({"_id": mid}, doc, upsert=True)
        return _clean_doc(doc)

    async def list_moderation_events_by_report(self, report_id: str) -> List[Dict[str, Any]]:
        db = await self._get_db()
        cursor = db.communityModerationEvents.find({"report_id": report_id}).sort("timestamp", -1)
        docs = await cursor.to_list(100)
        return [_clean_doc(d) for d in docs]

    list_moderation_events_for_report = list_moderation_events_by_report

    # ----------------- Stage 10: Physical Sensors -----------------

    async def create_sensor(self, data: Dict[str, Any]) -> Dict[str, Any]:
        db = await self._get_db()
        sid = data.get("id") or f"sns-{uuid.uuid4().hex[:12]}"
        data["id"] = sid
        doc = _prep_doc(data)
        await db.sensors.replace_one({"_id": sid}, doc, upsert=True)
        return _clean_doc(doc)

    async def get_sensor_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.sensors.find_one({"$or": [{"_id": sensor_id}, {"id": sensor_id}]})
        return _clean_doc(doc)

    async def get_sensor_by_code(self, sensor_code: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        doc = await db.sensors.find_one({"sensor_code": sensor_code})
        return _clean_doc(doc)

    async def update_sensor(self, sensor_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        res = await db.sensors.update_one(
            {"$or": [{"_id": sensor_id}, {"id": sensor_id}]},
            {"$set": updates}
        )
        if res.matched_count == 0:
            return None
        return await self.get_sensor_by_id(sensor_id)

    async def list_sensors(
        self,
        district_id: Optional[str] = None,
        sensor_type: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        if sensor_type:
            q["sensor_type"] = sensor_type
        if status:
            q["status"] = status
        cursor = db.sensors.find(q).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def get_sensors_summary(self, district_id: Optional[str] = None) -> Dict[str, Any]:
        from src.core.sensors.validator import SensorTelemetryValidator
        db = await self._get_db()
        q: Dict[str, Any] = {}
        if district_id:
            q["district_id"] = district_id
        cursor = db.sensors.find(q)
        sensors = [_clean_doc(d) for d in await cursor.to_list(2000)]

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
        db = await self._get_db()
        oid = data.get("id") or f"obs-{uuid.uuid4().hex[:12]}"
        data["id"] = oid
        doc = _prep_doc(data)
        await db.sensorObservations.replace_one({"_id": oid}, doc, upsert=True)
        return _clean_doc(doc)

    async def list_sensor_observations(
        self,
        sensor_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        quality: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        db = await self._get_db()
        q: Dict[str, Any] = {"sensor_id": sensor_id}
        if start_time or end_time:
            time_filter: Dict[str, Any] = {}
            if start_time:
                time_filter["$gte"] = start_time
            if end_time:
                time_filter["$lte"] = end_time
            q["observed_at"] = time_filter
        if quality:
            q["quality"] = quality

        cursor = db.sensorObservations.find(q).sort("observed_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(limit)
        return [_clean_doc(d) for d in docs]

    async def get_latest_observation_for_sensor(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        db = await self._get_db()
        cursor = db.sensorObservations.find({"sensor_id": sensor_id}).sort("observed_at", -1).limit(1)
        docs = await cursor.to_list(1)
        return _clean_doc(docs[0]) if docs else None

