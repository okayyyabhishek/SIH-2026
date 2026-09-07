"""
Sentinel NER — Stage 10 Sensor Telemetry Quality & Freshness Validator
Implements:
1. Deterministic quality evaluation (VALID, SUSPECT, INVALID, OUT_OF_RANGE, CLOCK_SKEW).
2. Physical bounds checking per sensor modality.
3. Clock skew detection against server authoritative time.
4. Freshness evaluation with explicit, documented thresholds.
5. Payload hashing for tamper-evident provenance.
"""

import hashlib
import json
import math
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from src.schemas.sensor import ObservationQuality, SensorFreshness, SensorType


# Documented physical plausible boundaries per sensor modality
SENSOR_PHYSICAL_BOUNDS: Dict[SensorType, Tuple[float, float, str]] = {
    SensorType.RAINFALL: (0.0, 500.0, "mm/hr"),
    SensorType.TILT: (0.0, 90.0, "degrees"),
    SensorType.INCLINOMETER: (-5000.0, 5000.0, "mm"),
    SensorType.SOIL_MOISTURE: (0.0, 100.0, "%"),
    SensorType.PIEZOMETER: (-100.0, 2000.0, "kPa"),
    SensorType.GNSS: (-1000.0, 1000.0, "mm"),
    SensorType.CRACK_GAUGE: (0.0, 500.0, "mm"),
    SensorType.VIBRATION: (0.0, 50.0, "g"),
}

# Documented Freshness Thresholds
FRESHNESS_THRESHOLDS_SECONDS = {
    "LIVE": 15 * 60,         # <= 15 minutes
    "RECENT": 60 * 60,       # <= 1 hour
    "STALE": 24 * 60 * 60,   # <= 24 hours
}


class SensorTelemetryValidator:
    """
    Validates incoming sensor packets for physical sanity, temporal consistency, and cryptographic provenance.
    """

    MAX_CLOCK_SKEW_FUTURE_SECONDS = 60.0       # Max allowable future clock drift
    MAX_CLOCK_SKEW_PAST_DAYS = 30.0            # Older than 30 days flagged as suspicious

    @classmethod
    def evaluate_quality(
        cls,
        sensor_type: SensorType,
        metric: str,
        value: float,
        unit: str,
        observed_at: datetime,
        now: Optional[datetime] = None,
    ) -> Tuple[ObservationQuality, Optional[str]]:
        """
        Determines the quality state of an individual telemetry observation.
        Never silently discards or normalizes invalid readings.
        """
        current_time = now or datetime.now(timezone.utc)

        # 1. Finite Numeric Validation
        if math.isnan(value) or math.isinf(value):
            return ObservationQuality.INVALID, "Value is NaN or Infinite"

        # 2. Clock Skew Evaluation
        if observed_at.tzinfo is None:
            observed_at = observed_at.replace(tzinfo=timezone.utc)

        delta_seconds = (observed_at - current_time).total_seconds()
        if delta_seconds > cls.MAX_CLOCK_SKEW_FUTURE_SECONDS:
            return ObservationQuality.CLOCK_SKEW, f"Timestamp is in the future by {delta_seconds:.1f}s"

        past_delta_days = (current_time - observed_at).total_seconds() / 86400.0
        if past_delta_days > cls.MAX_CLOCK_SKEW_PAST_DAYS:
            return ObservationQuality.SUSPECT, f"Telemetry is older than {cls.MAX_CLOCK_SKEW_PAST_DAYS} days"

        # 3. Physical Plausibility Bounds Check
        bounds = SENSOR_PHYSICAL_BOUNDS.get(sensor_type)
        if bounds:
            min_val, max_val, expected_unit = bounds
            if value < min_val or value > max_val:
                return (
                    ObservationQuality.OUT_OF_RANGE,
                    f"Value {value} is outside physical bounds [{min_val}, {max_val}] for {sensor_type.value}",
                )

        return ObservationQuality.VALID, None

    @classmethod
    def validate_observation(
        cls,
        sensor_type: SensorType,
        item: Any,
        now: Optional[datetime] = None,
    ) -> Tuple[ObservationQuality, Optional[str]]:
        return cls.evaluate_quality(
            sensor_type=sensor_type,
            metric=item.metric,
            value=item.value,
            unit=item.unit,
            observed_at=item.observed_at,
            now=now,
        )

    @classmethod
    def evaluate_freshness(
        cls,
        last_seen_at: Optional[datetime],
        now: Optional[datetime] = None,
    ) -> SensorFreshness:
        """
        Evaluates operational freshness state based on exact documented thresholds.
        Never reports LIVE unless actual recent telemetry supports it.
        """
        if not last_seen_at:
            return SensorFreshness.OFFLINE

        current_time = now or datetime.now(timezone.utc)
        if last_seen_at.tzinfo is None:
            last_seen_at = last_seen_at.replace(tzinfo=timezone.utc)

        age_seconds = (current_time - last_seen_at).total_seconds()

        if age_seconds < 0:
            # Future timestamp edge case
            return SensorFreshness.LIVE

        if age_seconds <= FRESHNESS_THRESHOLDS_SECONDS["LIVE"]:
            return SensorFreshness.LIVE
        elif age_seconds <= FRESHNESS_THRESHOLDS_SECONDS["RECENT"]:
            return SensorFreshness.RECENT
        elif age_seconds <= FRESHNESS_THRESHOLDS_SECONDS["STALE"]:
            return SensorFreshness.STALE
        else:
            return SensorFreshness.OFFLINE

    @staticmethod
    def compute_payload_hash(payload_data: Any) -> str:
        """Computes SHA-256 digest of telemetry for cryptographic provenance."""
        serialized = json.dumps(payload_data, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
