"""
Sentinel NER — Satellite & InSAR Change Intelligence Subsystem (Stage 6)
"""

from src.core.satellite.acquisition import (
    SatelliteAcquisitionService,
    satellite_acquisition_service,
)
from src.core.satellite.lineage import (
    get_deterministic_test_fixtures,
    get_external_connectors_status,
)
from src.core.satellite.pipeline import satellite_pipeline
from src.core.satellite.provider import (
    CopernicusSTACProvider,
    SatelliteProvider,
    SyntheticSatelliteProvider,
    satellite_provider,
)
from src.core.satellite.safety import (
    compute_sha256,
    safe_extract_archive,
    validate_external_url_ssrf,
    validate_raster_file,
)
from src.core.satellite.storage import (
    LocalObjectStorage,
    ObjectStorage,
    S3ObjectStorage,
    satellite_storage,
)

__all__ = [
    "satellite_pipeline",
    "satellite_storage",
    "satellite_provider",
    "satellite_acquisition_service",
    "ObjectStorage",
    "S3ObjectStorage",
    "LocalObjectStorage",
    "SatelliteProvider",
    "CopernicusSTACProvider",
    "SyntheticSatelliteProvider",
    "SatelliteAcquisitionService",
    "get_external_connectors_status",
    "get_deterministic_test_fixtures",
    "validate_external_url_ssrf",
    "safe_extract_archive",
    "validate_raster_file",
    "compute_sha256",
]
