"""
Sentinel NER — Stage 10 Sensor Ingestion Engine
Coordinates telemetry ingestion, authentication, quality evaluation, and persistence.
CRITICAL AXIOM: Sensor telemetry is strictly evidence input. An anomalous reading
or threshold exceedance NEVER triggers automatic public warnings or road closures.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from src.core.errors import NotFoundException, ValidationException
from src.core.sensors.validator import SensorTelemetryValidator
from src.schemas.sensor import (
    ObservationQuality,
    Sensor,
    SensorIngestionBatch,
    SensorObservation,
    SensorType,
)


class SensorIngestionEngine:
    """
    Authoritative ingestion processor for field sensor telemetry.
    """

    @classmethod
    async def process_batch(
        cls,
        repo: Any,
        batch: SensorIngestionBatch,
        source: str = "HTTP_WEBHOOK",
    ) -> Tuple[List[SensorObservation], Dict[str, Any]]:
        """
        Processes a batch of observations for a registered sensor.
        Validates quality, updates sensor freshness, and persists observations.
        """
        sensor_doc = await repo.get_sensor_by_id(batch.sensor_id)
        if not sensor_doc:
            raise NotFoundException(
                message=f"Target sensor '{batch.sensor_id}' not found in registry.",
                error_code="STG_SENSOR_NOT_FOUND",
            )

        sensor = Sensor(**sensor_doc)

        # Device authentication check if sensor has configured secret hash
        if sensor.secret_key_hash:
            if not batch.device_secret:
                raise ValidationException(
                    message="Device authentication secret required for this sensor.",
                    error_code="STG_SENSOR_AUTH_REQUIRED",
                )
            computed = SensorTelemetryValidator.compute_payload_hash(batch.device_secret)
            if computed != sensor.secret_key_hash:
                raise ValidationException(
                    message="Invalid device secret key.",
                    error_code="STG_SENSOR_AUTH_FAILED",
                )

        now = datetime.now(timezone.utc)
        payload_hash = SensorTelemetryValidator.compute_payload_hash(
            [obs.model_dump() for obs in batch.observations]
        )
        ingestion_id = f"ing-{uuid4().hex[:10]}"

        persisted_observations: List[SensorObservation] = []
        valid_count = 0
        flagged_count = 0
        latest_obs_time = sensor.last_observation_at

        for item in batch.observations:
            # Evaluate deterministic quality
            quality, reason = SensorTelemetryValidator.evaluate_quality(
                sensor_type=sensor.sensor_type,
                metric=item.metric,
                value=item.value,
                unit=item.unit,
                observed_at=item.observed_at,
                now=now,
            )

            if quality == ObservationQuality.VALID:
                valid_count += 1
            else:
                flagged_count += 1

            obs = SensorObservation(
                id=f"obs-{uuid4().hex[:12]}",
                sensor_id=sensor.id,
                district_id=sensor.district_id,
                observed_at=item.observed_at,
                received_at=now,
                metric=item.metric,
                value=item.value,
                unit=item.unit,
                quality=quality,
                quality_reason=reason,
                source=source,
                sequence_number=item.sequence_number,
                ingestion_id=ingestion_id,
                payload_hash=payload_hash,
                provenance={
                    "sensor_code": sensor.sensor_code,
                    "installation_site": sensor.installation_site,
                    "manufacturer": sensor.manufacturer,
                    "model": sensor.model,
                },
            )

            saved = await repo.create_sensor_observation(obs.model_dump())
            persisted_observations.append(SensorObservation(**saved))

            if latest_obs_time is None or item.observed_at > latest_obs_time:
                latest_obs_time = item.observed_at

        # Update sensor last_seen_at and last_observation_at
        await repo.update_sensor(
            sensor.id,
            {
                "last_seen_at": now,
                "last_observation_at": latest_obs_time,
                "updated_at": now,
            },
        )

        metadata = {
            "ingestion_id": ingestion_id,
            "sensor_id": sensor.id,
            "sensor_code": sensor.sensor_code,
            "total_received": len(batch.observations),
            "valid_count": valid_count,
            "flagged_count": flagged_count,
            "payload_hash": payload_hash,
            "processed_at": now.isoformat(),
        }

        return persisted_observations, metadata
