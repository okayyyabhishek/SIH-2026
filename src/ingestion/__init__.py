"""
Sentinel NER — Data Ingestion Subsystem
Contains modular adapters for satellite, DEM, precipitation, climate, soil, land cover,
hydrology, protected areas, and historical disaster inventories.
"""

from src.ingestion.adapters import (
    BaseIngestionAdapter,
    Sentinel2VegetationAdapter,
    NASA_SRTM_DEM_Adapter,
    IMDPrecipitationAdapter,
    ClimateMeteorologyAdapter,
    ISRICSoilGridsAdapter,
    ESAWorldCoverAdapter,
    HydroSHEDS_Hydrology_Adapter,
    MoEFCC_Forest_Protected_Adapter,
    GSI_Disaster_Inventory_Adapter,
    MoRTH_RoadNetwork_Adapter,
)

__all__ = [
    "BaseIngestionAdapter",
    "Sentinel2VegetationAdapter",
    "NASA_SRTM_DEM_Adapter",
    "IMDPrecipitationAdapter",
    "ClimateMeteorologyAdapter",
    "ISRICSoilGridsAdapter",
    "ESAWorldCoverAdapter",
    "HydroSHEDS_Hydrology_Adapter",
    "MoEFCC_Forest_Protected_Adapter",
    "GSI_Disaster_Inventory_Adapter",
    "MoRTH_RoadNetwork_Adapter",
]
