"""
Sentinel NER — Stage 10 Field Sensor Network Domain Models & Schemas
Implements:
1. Physical Sensor registry with geographic location, calibration metadata, and freshness states.
2. SensorObservation telemetry with deterministic quality validation (VALID, SUSPECT, INVALID, OUT_OF_RANGE, CLOCK_SKEW).
3. Provenance and payload hashing for auditability.
4. Non-autonomous safety rule: sensor readings are evidence inputs, NEVER automatic public warnings.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

from src.schemas.geojson import GeoJSONPoint


class SensorType(str, Enum):
    RAINFALL = "RAINFALL"
    TILT = "TILT"
    INCLINOMETER = "INCLINOMETER"
    SOIL_MOISTURE = "SOIL_MOISTURE"
    PIEZOMETER = "PIEZOMETER"
    GNSS = "GNSS"
    CRACK_GAUGE = "CRACK_GAUGE"
    VIBRATION = "VIBRATION"
    OTHER = "OTHER"


class SensorStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"
    CALIBRATION_REQUIRED = "CALIBRATION_REQUIRED"
    DECOMMISSIONED = "DECOMMISSIONED"
    OFFLINE = "OFFLINE"


class ObservationQuality(str, Enum):
    VALID = "VALID"
    SUSPECT = "SUSPECT"
    INVALID = "INVALID"
    STALE = "STALE"
    DUPLICATE = "DUPLICATE"
    OUT_OF_RANGE = "OUT_OF_RANGE"
    CLOCK_SKEW = "CLOCK_SKEW"
    MISSING = "MISSING"
    CALIBRATION_REQUIRED = "CALIBRATION_REQUIRED"


class SensorFreshness(str, Enum):
    LIVE = "LIVE"          # <= 15 minutes
    RECENT = "RECENT"      # 15 min - 1 hour
    STALE = "STALE"        # 1 hour - 24 hours
    OFFLINE = "OFFLINE"    # > 24 hours or never observed
    UNKNOWN = "UNKNOWN"


class Sensor(BaseModel):
    """
    Physical sensor station deployed in the field.
    Authoritative physical equipment registry.
    """
    id: str = Field(default_factory=lambda: f"sns-{uuid4().hex[:12]}")
    sensor_code: str = Field(..., description="Unique human-readable asset code (e.g. SN-AIZ-RAIN-01)")
    sensor_type: SensorType
    manufacturer: str
    model: str
    serial_reference: str
    location: GeoJSONPoint
    elevation_m: Optional[float] = None
    organization_id: str = Field(..., description="Owning agency or research unit, e.g. GSI, Amrita, DDMA")
    district_id: str = Field(..., description="Authoritative district identifier")
    installation_site: str = Field(..., description="Site descriptor, e.g. Durtlang Scarp Station 4")
    status: SensorStatus = Field(default=SensorStatus.ACTIVE)
    sampling_interval_seconds: int = Field(default=300, ge=10, le=86400)
    measurement_units: str = Field(..., description="e.g. mm/hr, degrees, %, kPa")
    calibration_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Last calibration timestamp, factor, drift bounds"
    )
    secret_key_hash: Optional[str] = Field(None, description="Hashed ingestion credential for device auth")
    last_seen_at: Optional[datetime] = None
    last_observation_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    provenance: Dict[str, Any] = Field(default_factory=dict)


class SensorObservation(BaseModel):
    """
    Individual verified observation received from a physical sensor.
    Deterministic evaluation of quality state is mandatory.
    """
    id: str = Field(default_factory=lambda: f"obs-{uuid4().hex[:12]}")
    sensor_id: str = Field(..., description="Target sensor ID")
    district_id: str = Field(..., description="District jurisdiction")
    observed_at: datetime = Field(..., description="Physical measurement timestamp on device")
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metric: str = Field(..., description="Metric name, e.g. rain_rate, displacement_x, pore_pressure")
    value: float = Field(...)
    unit: str = Field(...)
    quality: ObservationQuality = Field(default=ObservationQuality.VALID)
    quality_reason: Optional[str] = None
    source: str = Field(default="HTTP_WEBHOOK", description="HTTP_WEBHOOK, API, MQTT_GATEWAY, BATCH_CSV")
    sequence_number: Optional[int] = None
    ingestion_id: str = Field(default_factory=lambda: f"ing-{uuid4().hex[:10]}")
    payload_hash: Optional[str] = None
    provenance: Dict[str, Any] = Field(default_factory=dict)


class SensorRegistrationRequest(BaseModel):
    sensor_code: str
    sensor_type: SensorType
    manufacturer: str
    model: str
    serial_reference: str
    location: GeoJSONPoint
    elevation_m: Optional[float] = None
    district_id: str
    installation_site: str
    sampling_interval_seconds: int = 300
    measurement_units: str
    calibration_metadata: Optional[Dict[str, Any]] = None


class TelemetryItem(BaseModel):
    metric: str
    value: float
    unit: str
    observed_at: datetime
    sequence_number: Optional[int] = None


class SensorIngestionBatch(BaseModel):
    sensor_id: str
    device_secret: Optional[str] = None
    observations: List[TelemetryItem] = Field(..., min_length=1, max_length=100)
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SensorSummary(BaseModel):
    total_sensors: int
    active_count: int
    live_count: int
    recent_count: int
    stale_count: int
    offline_count: int
    calibration_required_count: int
    by_type: Dict[str, int]
    district_id: Optional[str] = None
    generated_at: datetime
