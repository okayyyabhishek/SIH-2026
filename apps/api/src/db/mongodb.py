"""
Sentinel NER — MongoDB Atlas Database Connection & Index Management
Provides Motor async client and index initialization for collections.
"""

import asyncio
import re
import time
from typing import Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, GEOSPHERE, IndexModel

from src.core.config import settings
from src.core.logging import logger

client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None


def mask_mongo_uri(uri: str) -> str:
    """Masks credentials in MongoDB connection string or any error message containing credentials.
    Replaces username:password with ***:***, and scrubs configured secret passwords.
    """
    if not uri:
        return ""
    # Mask standard mongodb://user:pass@ and mongodb+srv://user:pass@
    masked = re.sub(r"(mongodb(?:\+srv)?://)([^:]+):([^@]+)@", r"\1***:***@", uri)
    try:
        from src.core.config import settings
        raw = getattr(settings, "MONGODB_URI", "")
        if raw and "@" in raw and "://" in raw:
            match = re.search(r"://([^:]+):([^@]+)@", raw)
            if match:
                pwd = match.group(2)
                if pwd and len(pwd) > 3 and pwd in masked:
                    masked = masked.replace(pwd, "***")
    except Exception:
        pass
    return masked


# Authoritative Stage 3 Index Definitions for Verification & Initialization
STAGE3_COLLECTION_INDEXES = {
    "districts": [
        IndexModel([("code", ASCENDING)], unique=True, name="idx_districts_code_unique"),
        IndexModel([("geometry", GEOSPHERE)], name="idx_districts_geometry_2dsphere"),
        IndexModel([("state_code", ASCENDING), ("status", ASCENDING)], name="idx_districts_state_status"),
    ],
    "slopeUnits": [
        IndexModel([("code", ASCENDING)], unique=True, name="idx_slope_units_code_unique"),
        IndexModel([("geometry", GEOSPHERE)], name="idx_slope_units_geometry_2dsphere"),
        IndexModel([("district_id", ASCENDING), ("status", ASCENDING)], name="idx_slope_units_district_status"),
        IndexModel([("state_code", ASCENDING)], name="idx_slope_units_state"),
    ],
    "roads": [
        IndexModel([("road_code", ASCENDING)], unique=True, name="idx_roads_code_unique"),
        IndexModel([("geometry", GEOSPHERE)], name="idx_roads_geometry_2dsphere"),
        IndexModel([("authority_organization_id", ASCENDING), ("operational_status", ASCENDING)], name="idx_roads_org_status"),
        IndexModel([("district_id", ASCENDING), ("road_type", ASCENDING)], name="idx_roads_district_type"),
    ],
    "roadChainages": [
        IndexModel([("road_id", ASCENDING), ("chainage_km", ASCENDING)], unique=True, name="idx_chainage_road_km_unique"),
        IndexModel([("geometry", GEOSPHERE)], name="idx_chainage_geometry_2dsphere"),
        IndexModel([("district_id", ASCENDING), ("road_id", ASCENDING)], name="idx_chainage_district_road"),
    ],
    "villages": [
        IndexModel([("geometry", GEOSPHERE)], name="idx_villages_geometry_2dsphere"),
        IndexModel([("district_id", ASCENDING), ("status", ASCENDING)], name="idx_villages_district_status"),
        IndexModel([("village_code", ASCENDING)], name="idx_villages_code"),
    ],
    "assets": [
        IndexModel([("geometry", GEOSPHERE)], name="idx_assets_geometry_2dsphere"),
        IndexModel([("organization_id", ASCENDING), ("operational_status", ASCENDING)], name="idx_assets_org_status"),
        IndexModel([("district_id", ASCENDING), ("asset_type", ASCENDING)], name="idx_assets_district_type"),
    ],
    "landslideEvents": [
        IndexModel([("event_reference", ASCENDING)], unique=True, name="idx_landslide_events_ref_unique"),
        IndexModel([("geometry", GEOSPHERE)], name="idx_landslide_events_geometry_2dsphere"),
        IndexModel([("district_id", ASCENDING), ("event_time", ASCENDING)], name="idx_landslide_events_district_time"),
        IndexModel([("source", ASCENDING), ("status", ASCENDING)], name="idx_landslide_events_source_status"),
    ],
}


STAGE5_COLLECTION_INDEXES = {
    "riskPredictions": [
        IndexModel([("subject_type", ASCENDING), ("subject_id", ASCENDING)], name="idx_risk_preds_subject"),
        IndexModel([("district_id", ASCENDING), ("generated_at", ASCENDING)], name="idx_risk_preds_district_time"),
        IndexModel([("model_version_id", ASCENDING), ("risk_level", ASCENDING)], name="idx_risk_preds_model_level"),
        IndexModel([("model_run_id", ASCENDING)], name="idx_risk_preds_run"),
        IndexModel([("status", ASCENDING)], name="idx_risk_preds_status"),
    ],
    "riskFeatureSnapshots": [
        IndexModel([("snapshot_hash_sha256", ASCENDING)], name="idx_risk_snapshots_hash"),
        IndexModel([("subject_id", ASCENDING), ("created_at", ASCENDING)], name="idx_risk_snapshots_subject_time"),
    ],
    "modelVersions": [
        IndexModel([("model_name", ASCENDING), ("version", ASCENDING)], unique=True, name="idx_model_versions_name_ver_unique"),
        IndexModel([("status", ASCENDING)], name="idx_model_versions_status"),
    ],
    "modelRuns": [
        IndexModel([("model_version_id", ASCENDING), ("execution_time", ASCENDING)], name="idx_model_runs_model_time"),
        IndexModel([("status", ASCENDING)], name="idx_model_runs_status"),
    ],
    "predictionExplanations": [
        IndexModel([("prediction_id", ASCENDING)], unique=True, name="idx_pred_explanations_pred_unique"),
    ],
    "riskEvidence": [
        IndexModel([("prediction_id", ASCENDING)], name="idx_risk_evidence_pred"),
    ],
}

STAGE6_COLLECTION_INDEXES = {
    "satelliteObservations": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_sat_obs_id_unique"),
        IndexModel([("footprint", GEOSPHERE)], name="idx_sat_obs_footprint_2dsphere"),
        IndexModel([("mission", ASCENDING), ("product_type", ASCENDING)], name="idx_sat_obs_mission_prod"),
        IndexModel([("district_id", ASCENDING), ("acquisition_time", DESCENDING)], name="idx_sat_obs_dist_time"),
        IndexModel([("product_id", ASCENDING)], unique=True, name="idx_sat_obs_prod_id_unique"),
    ],
    "insarObservations": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_insar_obs_id_unique"),
        IndexModel([("deformation_geometry", GEOSPHERE)], name="idx_insar_obs_geom_2dsphere"),
        IndexModel([("primary_scene_id", ASCENDING), ("secondary_scene_id", ASCENDING)], name="idx_insar_pair"),
        IndexModel([("district_id", ASCENDING), ("acquisition_end", DESCENDING)], name="idx_insar_dist_time"),
        IndexModel([("quality_state", ASCENDING)], name="idx_insar_quality"),
    ],
    "satelliteProcessingRuns": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_sat_runs_id_unique"),
        IndexModel([("job_id", ASCENDING)], unique=True, name="idx_sat_runs_job_unique"),
        IndexModel([("status", ASCENDING), ("start_time", DESCENDING)], name="idx_sat_runs_status_time"),
    ],
}

STAGE7_COLLECTION_INDEXES = {
    "consequenceRelationships": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_consequence_rel_id_unique"),
        IndexModel([("source_type", ASCENDING), ("source_id", ASCENDING)], name="idx_consequence_source"),
        IndexModel([("target_type", ASCENDING), ("target_id", ASCENDING)], name="idx_consequence_target"),
        IndexModel([("district_id", ASCENDING), ("generated_at", DESCENDING)], name="idx_consequence_dist_time"),
        IndexModel([("relationship_type", ASCENDING), ("spatial_relation", ASCENDING)], name="idx_consequence_rel_spatial"),
        IndexModel([("criticality", ASCENDING)], name="idx_consequence_criticality"),
        IndexModel([("status", ASCENDING)], name="idx_consequence_status"),
    ],
    "consequenceRuns": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_consequence_runs_id_unique"),
        IndexModel([("district_id", ASCENDING), ("created_at", DESCENDING)], name="idx_consequence_runs_dist_time"),
        IndexModel([("status", ASCENDING)], name="idx_consequence_runs_status"),
    ],
}

STAGE8_COLLECTION_INDEXES = {
    "actions": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_actions_id_unique"),
        IndexModel([("district_id", ASCENDING), ("status", ASCENDING)], name="idx_actions_dist_status"),
        IndexModel([("priority", ASCENDING), ("created_at", DESCENDING)], name="idx_actions_prio_time"),
        IndexModel([("target_entity_type", ASCENDING), ("target_entity_id", ASCENDING)], name="idx_actions_target"),
        IndexModel([("idempotency_key", ASCENDING)], sparse=True, name="idx_actions_idempotency"),
        IndexModel([("expires_at", ASCENDING)], name="idx_actions_expires"),
    ],
    "warnings": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_warnings_id_unique"),
        IndexModel([("district_id", ASCENDING), ("status", ASCENDING)], name="idx_warnings_dist_status"),
        IndexModel([("warning_type", ASCENDING), ("created_at", DESCENDING)], name="idx_warnings_type_time"),
        IndexModel([("affected_entity_type", ASCENDING), ("affected_entity_id", ASCENDING)], name="idx_warnings_affected"),
        IndexModel([("idempotency_key", ASCENDING)], sparse=True, name="idx_warnings_idempotency"),
        IndexModel([("effective_from", ASCENDING), ("expires_at", ASCENDING)], name="idx_warnings_effective_window"),
    ],
    "warningLedger": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_ledger_id_unique"),
        IndexModel([("district_id", ASCENDING), ("sequence_number", ASCENDING)], unique=True, name="idx_ledger_dist_seq_unique"),
        IndexModel([("event_hash", ASCENDING)], unique=True, name="idx_ledger_hash_unique"),
        IndexModel([("event_type", ASCENDING), ("timestamp", DESCENDING)], name="idx_ledger_type_time"),
        IndexModel([("warning_id", ASCENDING)], sparse=True, name="idx_ledger_warning"),
        IndexModel([("action_id", ASCENDING)], sparse=True, name="idx_ledger_action"),
    ],
    "playbooks": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_playbooks_id_unique"),
        IndexModel([("playbook_code", ASCENDING), ("version", ASCENDING)], unique=True, name="idx_playbooks_code_ver_unique"),
        IndexModel([("trigger_criteria", ASCENDING), ("is_active", ASCENDING)], name="idx_playbooks_trigger_active"),
    ],
}

STAGE9_COLLECTION_INDEXES = {
    "alerts": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_alerts_id_unique"),
        IndexModel([("warning_id", ASCENDING), ("recipient_id", ASCENDING)], name="idx_alerts_warning_recipient"),
        IndexModel([("district_id", ASCENDING), ("status", ASCENDING)], name="idx_alerts_dist_status"),
        IndexModel(
            [("idempotency_key", ASCENDING)],
            unique=True,
            partialFilterExpression={"idempotency_key": {"$type": "string"}},
            name="idx_alerts_idempotency_unique",
        ),
        IndexModel([("created_at", DESCENDING)], name="idx_alerts_created_desc"),
        IndexModel([("expires_at", ASCENDING)], name="idx_alerts_expires"),
    ],
    "deliveryJobs": [
        IndexModel([("job_id", ASCENDING)], unique=True, name="idx_delivery_jobs_id_unique"),
        IndexModel([("alert_id", ASCENDING)], name="idx_delivery_jobs_alert"),
        IndexModel([("status", ASCENDING), ("next_retry_at", ASCENDING)], name="idx_delivery_jobs_status_retry"),
    ],
    "alertAcknowledgements": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_alert_acks_id_unique"),
        IndexModel([("alert_id", ASCENDING), ("recipient_id", ASCENDING)], name="idx_alert_acks_alert_recipient"),
        IndexModel([("acknowledged_at", DESCENDING)], name="idx_alert_acks_time_desc"),
    ],
}

STAGE10_COLLECTION_INDEXES = {
    "citizenReports": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_reports_id_unique"),
        IndexModel([("location", GEOSPHERE)], name="idx_reports_location_2dsphere"),
        IndexModel([("district_id", ASCENDING), ("status", ASCENDING)], name="idx_reports_dist_status"),
        IndexModel([("category", ASCENDING)], name="idx_reports_category"),
        IndexModel([("reporter_id", ASCENDING)], name="idx_reports_reporter"),
        IndexModel([("reported_at", DESCENDING)], name="idx_reports_reported_desc"),
    ],
    "communityEventClusters": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_clusters_id_unique"),
        IndexModel([("center_point", GEOSPHERE)], name="idx_clusters_center_2dsphere"),
        IndexModel([("district_id", ASCENDING), ("status", ASCENDING)], name="idx_clusters_dist_status"),
        IndexModel([("first_reported_at", DESCENDING)], name="idx_clusters_time_desc"),
    ],
    "communityModerationEvents": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_mod_events_id_unique"),
        IndexModel([("report_id", ASCENDING)], name="idx_mod_events_report"),
        IndexModel([("moderator_id", ASCENDING)], name="idx_mod_events_moderator"),
        IndexModel([("timestamp", DESCENDING)], name="idx_mod_events_time_desc"),
    ],
    "sensors": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_sensors_id_unique"),
        IndexModel([("sensor_code", ASCENDING)], unique=True, name="idx_sensors_code_unique"),
        IndexModel([("location", GEOSPHERE)], name="idx_sensors_location_2dsphere"),
        IndexModel([("district_id", ASCENDING), ("sensor_type", ASCENDING)], name="idx_sensors_dist_type"),
        IndexModel([("status", ASCENDING)], name="idx_sensors_status"),
        IndexModel([("last_seen_at", DESCENDING)], name="idx_sensors_last_seen"),
    ],
    "sensorObservations": [
        IndexModel([("id", ASCENDING)], unique=True, name="idx_observations_id_unique"),
        IndexModel([("sensor_id", ASCENDING), ("observed_at", DESCENDING)], name="idx_obs_sensor_time_desc"),
        IndexModel([("district_id", ASCENDING), ("observed_at", DESCENDING)], name="idx_obs_dist_time_desc"),
        IndexModel([("quality", ASCENDING)], name="idx_obs_quality"),
        IndexModel([("ingestion_id", ASCENDING)], name="idx_obs_ingestion"),
    ],
}


async def connect_to_mongo() -> AsyncIOMotorDatabase:
    """Establishes connection to MongoDB Atlas or local instance.
    Strictly enforces connection without silent fallback. Raises RuntimeError if unreachable.
    """
    global client, db
    try:
        curr_loop = asyncio.get_running_loop()
        if client is not None and (client.get_io_loop() != curr_loop or client.get_io_loop().is_closed()):
            client.close()
            client = None
            db = None
    except Exception:
        client = None
        db = None

    if client is not None and db is not None:
        try:
            await client.admin.command("ping")
            return db
        except Exception:
            client = None
            db = None

    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
            maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
            serverSelectionTimeoutMS=5000,
        )
        db = client[settings.MONGODB_DB_NAME]
        # Test connection
        await client.admin.command("ping")
        logger.info("Successfully connected to MongoDB Atlas", extra={"database": settings.MONGODB_DB_NAME})
        await init_indexes(db)
        return db
    except Exception as exc:
        client = None
        db = None
        masked_uri = mask_mongo_uri(settings.MONGODB_URI)
        safe_exc = mask_mongo_uri(str(exc))
        error_msg = (
            f"CRITICAL: Failed to connect to authoritative MongoDB database at {masked_uri}. "
            f"In-memory fallback has been eliminated. Error: {safe_exc}"
        )
        logger.error(error_msg, extra={"error": safe_exc})
        raise RuntimeError(error_msg) from exc


async def get_database() -> AsyncIOMotorDatabase:
    """Returns active MongoDB database, ensuring loop affinity and valid connection."""
    return await connect_to_mongo()


async def get_client() -> AsyncIOMotorClient:
    """Returns active MongoDB client, ensuring loop affinity and valid connection."""
    await connect_to_mongo()
    global client
    return client


async def check_mongo_health() -> Tuple[bool, Optional[float], Optional[str]]:
    """Checks real-time MongoDB connectivity and ping latency."""
    global client
    try:
        curr_loop = asyncio.get_running_loop()
        if client is not None and (client.get_io_loop() != curr_loop or client.get_io_loop().is_closed()):
            client = None
    except Exception:
        client = None

    if client is None:
        try:
            await connect_to_mongo()
        except Exception as exc:
            safe_exc = mask_mongo_uri(str(exc))
            logger.error("MongoDB health check connection failed", extra={"error": safe_exc})
            return False, None, "Authoritative MongoDB dependency unavailable"

    try:
        start = time.time()
        await client.admin.command("ping")
        latency = (time.time() - start) * 1000
        return True, round(latency, 2), f"Connected to MongoDB Atlas ({settings.MONGODB_DB_NAME})"
    except Exception as exc:
        if client:
            try:
                client.close()
            except Exception:
                pass
        client = None
        db = None
        safe_exc = mask_mongo_uri(str(exc))
        logger.error("MongoDB health check ping failed", extra={"error": safe_exc})
        return False, None, "Authoritative MongoDB ping failed"


async def close_mongo_connection() -> None:
    """Closes MongoDB connection cleanly without generating secondary shutdown failures."""
    global client, db
    if client:
        try:
            client.close()
        except Exception:
            pass
        client = None
        db = None
        logger.info("Closed MongoDB connection")



async def init_indexes(database: AsyncIOMotorDatabase) -> None:
    """Initializes required unique, compound, and 2dsphere indexes for all entities."""
    try:
        # Users Collection
        await database.users.create_indexes([
            IndexModel([("email", ASCENDING)], unique=True, name="idx_users_email_unique"),
            IndexModel([("status", ASCENDING)], name="idx_users_status"),
        ])

        # Organizations Collection
        await database.organizations.create_indexes([
            IndexModel([("code", ASCENDING)], unique=True, name="idx_orgs_code_unique"),
            IndexModel([("type", ASCENDING)], name="idx_orgs_type"),
            IndexModel([("district", ASCENDING)], name="idx_orgs_district"),
        ])

        # Organization Memberships Collection
        await database.organizationMemberships.create_indexes([
            IndexModel([("user_id", ASCENDING), ("organization_id", ASCENDING)], unique=True, name="idx_membership_unique"),
            IndexModel([("organization_id", ASCENDING), ("status", ASCENDING)], name="idx_membership_org_status"),
            IndexModel([("user_id", ASCENDING), ("status", ASCENDING)], name="idx_membership_user_status"),
        ])

        # Security Events Collection
        await database.securityEvents.create_indexes([
            IndexModel([("timestamp", ASCENDING), ("event_type", ASCENDING)], name="idx_sec_events_time_type"),
            IndexModel([("actor_user_id", ASCENDING)], name="idx_sec_events_actor"),
            IndexModel([("organization_id", ASCENDING)], name="idx_sec_events_org"),
        ])

        # Stage 3 Domain Collections
        for coll_name, indexes in STAGE3_COLLECTION_INDEXES.items():
            await database[coll_name].create_indexes(indexes)

        # Stage 5 Risk Engine Collections
        for coll_name, indexes in STAGE5_COLLECTION_INDEXES.items():
            await database[coll_name].create_indexes(indexes)

        # Stage 6 Satellite & InSAR Collections
        for coll_name, indexes in STAGE6_COLLECTION_INDEXES.items():
            await database[coll_name].create_indexes(indexes)

        # Stage 7 Consequence Intelligence Collections
        for coll_name, indexes in STAGE7_COLLECTION_INDEXES.items():
            await database[coll_name].create_indexes(indexes)

        # Stage 8 Operational Control Collections
        for coll_name, indexes in STAGE8_COLLECTION_INDEXES.items():
            await database[coll_name].create_indexes(indexes)

        # Stage 9 Alerting & Connectivity Collections
        for coll_name, indexes in STAGE9_COLLECTION_INDEXES.items():
            await database[coll_name].create_indexes(indexes)

        # Stage 10 Community & Sensor Collections
        for coll_name, indexes in STAGE10_COLLECTION_INDEXES.items():
            await database[coll_name].create_indexes(indexes)

        logger.info("Stage 2-10 MongoDB indexes verified and active")
    except Exception as exc:
        logger.warning("Could not create MongoDB indexes", extra={"error": mask_mongo_uri(str(exc))})


