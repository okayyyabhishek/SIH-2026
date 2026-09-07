"""
Sentinel NER — Satellite & InSAR Change Intelligence Domain Schemas (Stage 6)
Defines authoritative models for Satellite Observations, Sentinel-1 SAR Metadata,
InSAR Interferometry, Line-of-Sight (LOS) Deformation, Processing Lineage,
STAC Catalog References, and External Connector Statuses.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SatelliteMission(str, Enum):
    SENTINEL_1 = "SENTINEL_1"
    SENTINEL_2 = "SENTINEL_2"
    LANDSAT_8 = "LANDSAT_8"
    LANDSAT_9 = "LANDSAT_9"
    ALOS_2 = "ALOS_2"
    NISAR = "NISAR"


class SatellitePlatform(str, Enum):
    SENTINEL_1A = "SENTINEL_1A"
    SENTINEL_1B = "SENTINEL_1B"
    SENTINEL_1C = "SENTINEL_1C"
    SENTINEL_2A = "SENTINEL_2A"
    SENTINEL_2B = "SENTINEL_2B"


class InstrumentType(str, Enum):
    C_SAR = "C_SAR"
    MSI = "MSI"
    OLI = "OLI"
    PALSAR_2 = "PALSAR_2"


class ProductType(str, Enum):
    SLC = "SLC"  # Single Look Complex
    GRD = "GRD"  # Ground Range Detected
    RAW = "RAW"
    INTERFEROGRAM = "INTERFEROGRAM"
    COHERENCE = "COHERENCE"
    DEFORMATION_VELOCITY = "DEFORMATION_VELOCITY"
    DISPLACEMENT_LOS = "DISPLACEMENT_LOS"
    OPTICAL_CHANGE = "OPTICAL_CHANGE"


class PassDirection(str, Enum):
    ASCENDING = "ASCENDING"
    DESCENDING = "DESCENDING"


class Polarization(str, Enum):
    VV = "VV"
    VH = "VH"
    HH = "HH"
    HV = "HV"
    VV_VH = "VV+VH"
    HH_HV = "HH+HV"


class AcquisitionMode(str, Enum):
    IW = "IW"  # Interferometric Wide Swath
    EW = "EW"  # Extra-Wide Swath
    SM = "SM"  # Stripmap
    WV = "WV"  # Wave


class ProcessingLevel(str, Enum):
    LEVEL_0 = "LEVEL_0"
    LEVEL_1_SLC = "LEVEL_1_SLC"
    LEVEL_1_GRD = "LEVEL_1_GRD"
    LEVEL_2_INTERFEROGRAM = "LEVEL_2_INTERFEROGRAM"
    LEVEL_2_VELOCITY = "LEVEL_2_VELOCITY"
    LEVEL_2_CHANGE = "LEVEL_2_CHANGE"


class QualityState(str, Enum):
    VALID = "VALID"
    DEGRADED = "DEGRADED"
    LOW_COHERENCE = "LOW_COHERENCE"
    INSUFFICIENT_COVERAGE = "INSUFFICIENT_COVERAGE"
    PROCESSING_FAILED = "PROCESSING_FAILED"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"


class ProvenanceState(str, Enum):
    REAL_EXTERNAL_DATA = "REAL_EXTERNAL_DATA"
    REAL_UPLOADED_DATA = "REAL_UPLOADED_DATA"
    DETERMINISTIC_TEST_FIXTURE = "DETERMINISTIC_TEST_FIXTURE"
    DATASET_NOT_AVAILABLE = "DATASET_NOT_AVAILABLE"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    VALIDATING = "VALIDATING"
    PROCESSING = "PROCESSING"
    QC = "QC"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


class ConnectorStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    DEGRADED = "DEGRADED"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    RATE_LIMITED = "RATE_LIMITED"
    UNAVAILABLE = "UNAVAILABLE"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    DATASET_NOT_AVAILABLE = "DATASET_NOT_AVAILABLE"


class UncertaintyState(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    UNCERTAINTY_NOT_AVAILABLE = "UNCERTAINTY_NOT_AVAILABLE"


# Constant line-of-sight qualification
LOS_MANDATORY_QUALIFICATION = (
    "Observed displacement represents line-of-sight (LOS) range change relative to the satellite "
    "radar antenna. It does NOT represent true vertical or 3D ground motion vectors without "
    "multi-geometry decomposition."
)

SPATIAL_OVERLAP_DISCLAIMER = (
    "Spatial intersection with domain entities (e.g. slope units, roads) denotes geometric overlap "
    "only; it does NOT infer slope failure causation or immediate landslide occurrence."
)


class AcquisitionStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    ACQUIRING = "ACQUIRING"
    UPLOADED = "UPLOADED"
    VERIFYING = "VERIFYING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class StorageBackendType(str, Enum):
    S3 = "s3"
    LOCAL = "local"


class StorageObjectMetadata(BaseModel):
    key: str
    bucket: Optional[str] = None
    backend: StorageBackendType = StorageBackendType.S3
    size_bytes: int
    sha256: str
    content_type: Optional[str] = None
    etag: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SatelliteAsset(BaseModel):
    name: str
    href: str
    title: Optional[str] = None
    type: Optional[str] = None
    roles: List[str] = Field(default_factory=list)
    size_bytes: Optional[int] = None


class SatelliteScene(BaseModel):
    id: str
    provider: str = "copernicus"
    collection: str = "sentinel-2-l2a"
    datetime: datetime
    geometry: Dict[str, Any]
    bbox: List[float] = Field(..., min_length=4, max_length=4)
    cloud_cover: Optional[float] = None
    assets: Dict[str, SatelliteAsset] = Field(default_factory=dict)
    properties: Dict[str, Any] = Field(default_factory=dict)
    links: List[Dict[str, Any]] = Field(default_factory=list)


class AcquireSceneRequest(BaseModel):
    scene_id: str
    collection: str = "sentinel-2-l2a"
    asset_name: str = "visual"
    district_id: Optional[str] = None
    state: Optional[str] = None


class STACItemReference(BaseModel):
    stac_version: str = "1.0.0"
    id: str
    collection: str
    geometry: Dict[str, Any]
    bbox: List[float] = Field(..., min_length=4, max_length=4)
    properties: Dict[str, Any] = Field(default_factory=dict)
    assets: Dict[str, Any] = Field(default_factory=dict)
    links: List[Dict[str, Any]] = Field(default_factory=list)


class ExternalConnectorStatus(BaseModel):
    connector_id: str
    name: str
    catalog_type: str
    endpoint_url: str
    status: ConnectorStatus
    auth_configured: bool = False
    last_checked: datetime
    rate_limit_remaining: Optional[int] = None
    message: str


class SatelliteObservation(BaseModel):
    id: str
    mission: SatelliteMission
    platform: SatellitePlatform
    instrument: InstrumentType
    product_type: ProductType
    product_id: str
    acquisition_time: datetime
    processing_time: datetime
    orbit_number: Optional[int] = None
    relative_orbit: Optional[int] = None
    pass_direction: Optional[PassDirection] = None
    polarization: Optional[Polarization] = None
    mode: Optional[AcquisitionMode] = None
    footprint: Dict[str, Any] = Field(..., description="GeoJSON Polygon/MultiPolygon in EPSG:4326")
    bbox: List[float] = Field(..., min_length=4, max_length=4, description="[min_lon, min_lat, max_lon, max_lat]")
    source_uri: Optional[str] = None
    source_catalog: str = Field(default="COPERNICUS_DATASPACE")
    source_checksum: Optional[str] = None
    spatial_reference: str = "EPSG:4326"
    temporal_reference: str = "UTC"
    processing_level: ProcessingLevel
    quality_state: QualityState = QualityState.VALID
    provenance_state: ProvenanceState = ProvenanceState.DETERMINISTIC_TEST_FIXTURE
    metadata: Dict[str, Any] = Field(default_factory=dict)
    district_id: Optional[str] = None
    state: Optional[str] = None
    acquisition_status: AcquisitionStatus = AcquisitionStatus.SUCCESS
    storage_backend: StorageBackendType = StorageBackendType.S3
    storage_bucket: Optional[str] = None
    storage_key: Optional[str] = None
    storage_objects: List[StorageObjectMetadata] = Field(default_factory=list)
    cloud_cover: Optional[float] = None
    collection: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InSARObservation(BaseModel):
    id: str
    primary_scene_id: str
    secondary_scene_id: str
    acquisition_start: datetime
    acquisition_end: datetime
    temporal_baseline_days: float = Field(..., ge=0.0)
    perpendicular_baseline_meters: float
    orbit_direction: PassDirection
    relative_orbit: Optional[int] = None
    processing_chain_version: str = "sentinel-insar-v1.0.0"
    displacement_product_reference: Optional[str] = None
    coherence_product_reference: Optional[str] = None
    deformation_geometry: Dict[str, Any] = Field(..., description="GeoJSON geometry of deformation footprint/points")
    displacement_statistics: Dict[str, Any] = Field(
        ...,
        description="Statistics including min_los_mm_yr, max_los_mm_yr, mean_los_mm_yr, std_los_mm_yr, unit: mm/year",
    )
    los_semantics: str = Field(default=LOS_MANDATORY_QUALIFICATION)
    coherence_mean: Optional[float] = Field(None, ge=0.0, le=1.0)
    coherence_threshold: float = Field(default=0.35, ge=0.0, le=1.0)
    valid_pixel_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
    uncertainty: UncertaintyState = UncertaintyState.MEDIUM
    uncertainty_value_mm_yr: Optional[float] = None
    quality_state: QualityState = QualityState.VALID
    processing_status: JobStatus = JobStatus.COMPLETE
    provenance_state: ProvenanceState = ProvenanceState.DETERMINISTIC_TEST_FIXTURE
    intersected_slope_units: List[str] = Field(default_factory=list)
    intersected_roads: List[str] = Field(default_factory=list)
    spatial_intersection_disclaimer: str = Field(default=SPATIAL_OVERLAP_DISCLAIMER)
    district_id: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime


class SatelliteProcessingRun(BaseModel):
    id: str
    job_id: str
    pipeline_type: str = Field(..., description="E.g. INSAR_INTERFEROGRAM, DEFORMATION_VELOCITY, OPTICAL_CHANGE")
    pipeline_version: str = "1.0.0"
    primary_input_id: str
    secondary_input_id: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    input_hashes: Dict[str, str] = Field(default_factory=dict)
    output_references: List[str] = Field(default_factory=list)
    output_checksums: Dict[str, str] = Field(default_factory=dict)
    status: JobStatus = JobStatus.QUEUED
    retry_count: int = 0
    max_retries: int = 3
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    failure_reason: Optional[str] = None
    correlation_id: Optional[str] = None
    software_revision: str = "sentinel-ner-stage6-0.1.0"
    created_by: str
    created_at: datetime


class ProcessingRunCreateRequest(BaseModel):
    pipeline_type: str
    primary_input_id: str
    secondary_input_id: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
