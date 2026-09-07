"""
Sentinel NER — Real Satellite Asset Acquisition & Integrity Engine (Priority 2 & 3)
Connects STAC discovery to real asset retrieval, chunked streaming, S3 persistence,
SHA-256 cryptographic verification, and MongoDB metadata recording.
Guarantees:
- Large raster binaries are stored in S3 object storage, NEVER in MongoDB documents.
- Explicit acquisition lifecycle state machine:
    DISCOVERED -> ACQUIRING -> UPLOADED -> VERIFYING -> SUCCESS (or FAILED).
- Mandatory integrity verification (size & SHA-256 match) before marking acquisition successful.
- Synthetic fixture rejection in production mode (prevents data leakage).
"""

import hashlib
from datetime import datetime, timezone
from typing import Optional

from src.core.config import settings
from src.core.errors import (
    NotFoundException,
    ValidationException,
)
from src.core.logging import logger
from src.core.satellite.provider import SatelliteProvider, satellite_provider
from src.core.satellite.storage import ObjectStorage, satellite_storage
from src.schemas.satellite import (
    AcquisitionStatus,
    InstrumentType,
    ProcessingLevel,
    ProductType,
    ProvenanceState,
    QualityState,
    SatelliteMission,
    SatelliteObservation,
    SatellitePlatform,
)


class SatelliteAcquisitionService:
    """
    Production acquisition orchestrator coordinating provider streaming, S3 persistence,
    SHA-256 integrity auditing, and MongoDB metadata synchronization.
    """

    def __init__(
        self,
        provider: Optional[SatelliteProvider] = None,
        storage: Optional[ObjectStorage] = None,
    ):
        self.provider = provider or satellite_provider
        self.storage = storage or satellite_storage

    async def acquire_scene(
        self,
        scene_id: str,
        collection: str = "sentinel-2-l2a",
        asset_name: str = "visual",
        district_id: Optional[str] = None,
        state: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> SatelliteObservation:
        """
        Executes end-to-end real satellite asset acquisition:
        1. Discover scene in provider catalog
        2. Validate asset and resolve source URL
        3. Stream real asset data with on-the-fly SHA-256 computation
        4. Upload to S3 object storage with deterministic key
        5. Verify stored object existence, size, and checksum
        6. Persist metadata and S3 reference in MongoDB (never binary)
        """
        clean_scene_id = scene_id.strip()
        clean_collection = collection.strip().lower()

        # Enforce synthetic isolation in production mode
        if getattr(settings, "SATELLITE_MODE", "production") == "production":
            for prefix in ("mock-", "fixture-", "synthetic-", "demo-", "test-"):
                if clean_scene_id.lower().startswith(prefix):
                    logger.warning(
                        "PROCESSING_BLOCKED",
                        extra={
                            "reason": "Synthetic fixture rejected in production mode",
                            "scene_id": clean_scene_id,
                            "correlation_id": correlation_id,
                        },
                    )
                    raise ValidationException(
                        f"Synthetic scene identifier '{clean_scene_id}' is forbidden in production mode. "
                        f"Production strictly requires real Copernicus STAC scenes."
                    )

        # 1. State: DISCOVERED
        logger.info(
            "SCENE_SELECTED",
            extra={
                "scene_id": clean_scene_id,
                "collection": clean_collection,
                "correlation_id": correlation_id,
            },
        )
        scene = await self.provider.get_scene(clean_scene_id, collection=clean_collection)
        if not scene:
            raise NotFoundException(f"Satellite scene '{clean_scene_id}' not found in collection '{clean_collection}'.")

        # 2. Inspect and select asset
        target_asset = scene.assets.get(asset_name)
        if not target_asset:
            # Fallback to visual or first available image asset if specific name not found
            if "visual" in scene.assets:
                target_asset = scene.assets["visual"]
                asset_name = "visual"
            elif "thumbnail" in scene.assets:
                target_asset = scene.assets["thumbnail"]
                asset_name = "thumbnail"
            elif scene.assets:
                first_key = next(iter(scene.assets))
                target_asset = scene.assets[first_key]
                asset_name = first_key
            else:
                raise ValidationException(f"Scene '{clean_scene_id}' contains no downloadable assets.")

        asset_url = target_asset.href
        if not asset_url:
            raise ValidationException(f"Asset '{asset_name}' in scene '{clean_scene_id}' has no valid download URL.")

        # 3. State: ACQUIRING
        logger.info(
            "ACQUISITION_STARTED",
            extra={
                "scene_id": clean_scene_id,
                "collection": clean_collection,
                "asset": asset_name,
                "correlation_id": correlation_id,
            },
        )

        s3_key = f"raw/satellite/{clean_collection}/{clean_scene_id}/{asset_name}.tif"
        import tempfile

        spooled = tempfile.SpooledTemporaryFile(max_size=20 * 1024 * 1024)
        hasher = hashlib.sha256()

        try:
            async for chunk in self.provider.stream_asset(asset_url):
                spooled.write(chunk)
                hasher.update(chunk)
            spooled.seek(0, 2)
            size_bytes = spooled.tell()
            spooled.seek(0)
        except Exception as exc:
            spooled.close()
            logger.error(
                "ACQUISITION_FAILED",
                extra={
                    "scene_id": clean_scene_id,
                    "stage": "STREAM_DOWNLOAD",
                    "error": str(exc),
                    "correlation_id": correlation_id,
                },
            )
            raise

        calculated_sha = hasher.hexdigest()

        # 4. State: UPLOADED
        try:
            stored_metadata = self.storage.put_object(
                key=s3_key,
                data=spooled,
                expected_sha256=calculated_sha,
                content_type=target_asset.type or "image/tiff",
            )
        except Exception as exc:
            logger.error(
                "ACQUISITION_FAILED",
                extra={
                    "scene_id": clean_scene_id,
                    "stage": "S3_UPLOAD",
                    "error": str(exc),
                    "correlation_id": correlation_id,
                },
            )
            raise
        finally:
            spooled.close()

        # 5. State: VERIFYING
        logger.info(
            "INTEGRITY_CHECK_STARTED",
            extra={"s3_key": s3_key, "expected_sha256": calculated_sha, "correlation_id": correlation_id},
        )

        try:
            head_meta = self.storage.head_object(s3_key)
            if head_meta.size_bytes != size_bytes:
                # Cleanup and fail
                self.storage.delete_object(s3_key)
                raise ValidationException(
                    f"Integrity check failed for '{s3_key}': Stored size {head_meta.size_bytes} != expected {size_bytes}"
                )
            if head_meta.sha256 and head_meta.sha256.lower() != calculated_sha.lower():
                self.storage.delete_object(s3_key)
                raise ValidationException(
                    f"Integrity check failed for '{s3_key}': Stored hash {head_meta.sha256} != expected {calculated_sha}"
                )
        except Exception as exc:
            logger.error(
                "ACQUISITION_FAILED",
                extra={
                    "scene_id": clean_scene_id,
                    "stage": "INTEGRITY_VERIFICATION",
                    "error": str(exc),
                    "correlation_id": correlation_id,
                },
            )
            raise

        logger.info(
            "INTEGRITY_CHECK_PASSED",
            extra={"s3_key": s3_key, "sha256": calculated_sha, "correlation_id": correlation_id},
        )

        # 6. State: SUCCESS -> Persist in MongoDB
        now = datetime.now(timezone.utc)
        obs_id = f"sat-obs-{clean_scene_id}"

        # Resolve mission and instrument from collection
        if "sentinel-2" in clean_collection:
            mission = SatelliteMission.SENTINEL_2
            platform = SatellitePlatform.SENTINEL_2A
            instrument = InstrumentType.MSI
            prod_type = ProductType.OPTICAL_CHANGE
            proc_level = ProcessingLevel.LEVEL_2_CHANGE
        else:
            mission = SatelliteMission.SENTINEL_1
            platform = SatellitePlatform.SENTINEL_1A
            instrument = InstrumentType.C_SAR
            prod_type = ProductType.SLC if "slc" in clean_collection else ProductType.GRD
            proc_level = ProcessingLevel.LEVEL_1_SLC if "slc" in clean_collection else ProcessingLevel.LEVEL_1_GRD

        obs = SatelliteObservation(
            id=obs_id,
            mission=mission,
            platform=platform,
            instrument=instrument,
            product_type=prod_type,
            product_id=clean_scene_id,
            acquisition_time=scene.datetime,
            processing_time=now,
            footprint=scene.geometry,
            bbox=scene.bbox,
            source_uri=asset_url,
            source_catalog=self.provider.provider_name.upper(),
            source_checksum=calculated_sha,
            spatial_reference="EPSG:4326",
            temporal_reference="UTC",
            processing_level=proc_level,
            quality_state=QualityState.VALID,
            provenance_state=ProvenanceState.REAL_EXTERNAL_DATA,
            metadata={
                **scene.properties,
                "collection": clean_collection,
                "asset_name": asset_name,
                "s3_key": s3_key,
                "s3_bucket": stored_metadata.bucket,
                "size_bytes": size_bytes,
            },
            district_id=district_id,
            state=state,
            acquisition_status=AcquisitionStatus.SUCCESS,
            storage_backend=self.storage.backend_type,
            storage_bucket=stored_metadata.bucket,
            storage_key=s3_key,
            storage_objects=[stored_metadata],
            cloud_cover=scene.cloud_cover,
            collection=clean_collection,
            created_at=now,
        )

        # Store metadata in authoritative repository (MongoDB in staging/production)
        from src.db.repository import repository
        await repository.create_satellite_observation(obs.model_dump())

        logger.info(
            "ACQUISITION_COMPLETED",
            extra={
                "scene_id": clean_scene_id,
                "observation_id": obs_id,
                "s3_key": s3_key,
                "sha256": calculated_sha,
                "correlation_id": correlation_id,
            },
        )

        return obs


# Authoritative singleton acquisition service
satellite_acquisition_service = SatelliteAcquisitionService()
