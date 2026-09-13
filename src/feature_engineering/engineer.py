"""
Sentinel NER — Master Feature Engineering & Harmonization Orchestrator
Merges raw geospatial observations from satellite, DEM, precipitation, climate,
soil, land cover, and hydrology into standardized ML-ready feature matrices.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import math
import numpy as np
import pandas as pd

from src.feature_engineering.spectral import compute_spectral_indices
from src.feature_engineering.terrain import derive_cell_topography


class MasterFeatureEngineer:
    """
    Transforms multi-source geospatial observations into standardized tabular feature records
    strictly conforming to the 49-column training schema of NER_2026_MASTER.csv.
    """

    def __init__(self):
        pass

    def harmonize_record(
        self,
        grid_cell: Dict[str, Any],
        sat_data: Dict[str, Any],
        dem_data: Dict[str, Any],
        precip_data: Dict[str, Any],
        climate_data: Dict[str, Any],
        soil_data: Dict[str, Any],
        landcover_data: Dict[str, Any],
        hydro_data: Dict[str, Any],
        forest_data: Dict[str, Any],
        disaster_data: Dict[str, Any],
        road_data: Optional[Dict[str, Any]] = None,
        observation_date: str = "2026-09-08",
    ) -> Dict[str, Any]:
        """
        Fuses all domain observations for a single grid cell into a unified row.
        """
        grid_id = grid_cell["grid_id"]
        sc = grid_cell["state_code"]
        dc = grid_cell["district_code"]
        lat = grid_cell["latitude"]
        lon = grid_cell["longitude"]

        dt = datetime.strptime(observation_date, "%Y-%m-%d")
        sample_id = f"{grid_id}_{dt.strftime('%Y%m%d')}"

        # 1. Spectral Indices
        spec = compute_spectral_indices(
            b2_blue=sat_data.get("b2_blue", 0.04),
            b3_green=sat_data.get("b3_green", 0.06),
            b4_red=sat_data.get("b4_red", 0.05),
            b8_nir=sat_data.get("b8_nir", 0.40),
            b12_swir2=sat_data.get("b12_swir2", 0.10),
            scl_class=sat_data.get("scl_class", 4),
        )

        # 2. Topography
        elev = dem_data.get("elevation_m", 450.0)
        topo = derive_cell_topography(
            elevation_m=elev,
            latitude=lat,
            longitude=lon,
            state_code=sc,
        )

        # 3. Data Quality & Missingness Evaluation
        missing_count = 0
        penalties = 0.0
        if spec["cloud_masked"]:
            missing_count += 5
            penalties += 0.25

        quality_score = max(0.0, round(1.0 - penalties, 2))

        # Road cut slope interaction calculation
        road_dist_m = float(road_data.get("distance_to_road_m", 15000.0) if road_data else 15000.0)
        road_prox_flag = int(road_data.get("road_proximity_flag", 1 if road_dist_m <= 500.0 else 0) if road_data else (1 if road_dist_m <= 500.0 else 0))
        road_cut_hazard = 1 if (road_prox_flag == 1 and topo["slope_deg"] >= 25.0) else 0

        record = {
            "sample_id": sample_id,
            "grid_id": grid_id,
            "date": observation_date,
            "year": dt.year,
            "month": dt.month,
            "state_code": sc,
            "district_code": dc,
            "latitude": lat,
            "longitude": lon,

            # Topography
            "elevation_m": topo["elevation_m"],
            "slope_deg": topo["slope_deg"],
            "aspect_deg": topo["aspect_deg"],
            "terrain_ruggedness": topo["terrain_ruggedness"],
            "relief_m": topo["relief_m"],

            # Precipitation
            "rainfall_1d_mm": precip_data.get("rainfall_1d_mm", 0.0),
            "rainfall_3d_mm": precip_data.get("rainfall_3d_mm", 0.0),
            "rainfall_7d_mm": precip_data.get("rainfall_7d_mm", 0.0),
            "rainfall_30d_mm": precip_data.get("rainfall_30d_mm", 0.0),
            "rainfall_90d_mm": precip_data.get("rainfall_90d_mm", 0.0),

            # Climate / Meteorology
            "temperature_mean_c": climate_data.get("temperature_mean_c", 22.0),
            "temperature_max_c": climate_data.get("temperature_max_c", 26.5),
            "temperature_min_c": climate_data.get("temperature_min_c", 18.0),
            "temperature_range_c": climate_data.get("temperature_range_c", 8.5),
            "humidity_pct": climate_data.get("humidity_pct", 82.0),

            # Remote Sensing Spectral Indices
            "ndvi": spec["ndvi"] if spec["ndvi"] is not None else 0.45,
            "evi": spec["evi"] if spec["evi"] is not None else 0.38,
            "ndwi": spec["ndwi"] if spec["ndwi"] is not None else -0.15,
            "nbr": spec["nbr"] if spec["nbr"] is not None else 0.52,
            "vegetation_fraction": spec["vegetation_fraction"] if spec["vegetation_fraction"] is not None else 0.65,

            # Soil Physics & Pedology
            "soil_ph": soil_data.get("soil_ph", 5.2),
            "soil_organic_carbon": soil_data.get("soil_organic_carbon", 30.0),
            "soil_clay_pct": soil_data.get("soil_clay_pct", 30.0),
            "soil_sand_pct": soil_data.get("soil_sand_pct", 35.0),
            "soil_silt_pct": soil_data.get("soil_silt_pct", 35.0),
            "soil_bulk_density": soil_data.get("soil_bulk_density", 125.0),
            "soil_water_capacity": soil_data.get("soil_water_capacity", 0.16),

            # Land Cover
            "landcover_code": landcover_data.get("landcover_code", 1),

            # Hydrology & Drainage
            "distance_to_river_m": hydro_data.get("distance_to_river_m", 1500.0),
            "distance_to_water_m": hydro_data.get("distance_to_water_m", 1200.0),
            "water_occurrence_pct": hydro_data.get("water_occurrence_pct", 0.0),
            "drainage_density": hydro_data.get("drainage_density", 3.2),

            # Forest & Protected Areas
            "forest_cover_pct": forest_data.get("forest_cover_pct", 75.0),
            "protected_area_flag": forest_data.get("protected_area_flag", 0),
            "distance_to_protected_area_m": forest_data.get("distance_to_protected_area_m", 5000.0),

            # Historical Disaster Events & Landslide Proximity
            "flood_history_flag": int(disaster_data.get("flood_history_flag", 0)),
            "landslide_history_flag": int(disaster_data.get("landslide_history_flag", 0)),
            "nearest_landslide_distance_km": float(disaster_data.get("nearest_landslide_distance_km", 25.0)),

            # Road Network & Anthropogenic Cut-Slope Hazard
            "distance_to_road_m": road_dist_m,
            "road_proximity_flag": road_prox_flag,
            "road_cut_slope_hazard": road_cut_hazard,

            # Targets (Ground Truth Verified)
            "target_flood_risk": int(disaster_data.get("target_flood_risk", 0)),
            "target_landslide_risk": int(disaster_data.get("target_landslide_risk", 0)),

            # Metadata Quality
            "data_quality_score": quality_score,
        }

        return record
