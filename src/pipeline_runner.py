"""
Sentinel NER — Master Geospatial & Environmental Data Pipeline Runner
Executes end-to-end grid generation, multi-sensor data ingestion, feature harmonization,
quality validation, and generates data/processed/NER_2026_MASTER.csv.
"""

from datetime import datetime, timezone
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath("."))
import numpy as np
import pandas as pd

from src.geospatial.grid import SpatialGridGenerator
from src.ingestion.adapters import (
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
from src.feature_engineering.engineer import MasterFeatureEngineer
from src.validation.validator import DatasetValidator
from src.preprocessing.splitter import generate_and_save_splits


def run_pipeline(
    count_per_state: int = 35,
    observation_date: str = "2026-09-08",
    output_master_csv: str = "data/processed/NER_2026_MASTER.csv",
    output_interim_parquet: str = "data/interim/ner_2026_master.parquet",
    log_path: str = "data/metadata/PROCESSING_LOG.csv",
) -> pd.DataFrame:
    """
    Executes end-to-end pipeline generating the complete 53-column master dataset.
    """
    start_time = datetime.now(timezone.utc)
    print(f"[{start_time.strftime('%H:%M:%S')}] Starting Sentinel NER 2026 Master Data Pipeline...")

    # Ensure output directories exist
    os.makedirs(os.path.dirname(output_master_csv), exist_ok=True)
    os.makedirs(os.path.dirname(output_interim_parquet), exist_ok=True)
    os.makedirs(os.path.dirname(log_path), exist_ok=True)

    # 1. Generate Spatial Grid (250m metric cells clipped strictly to official 8 NER state boundaries)
    print("  -> Generating regular 250m spatial grid cells across all 8 NER states...")
    grid_gen = SpatialGridGenerator(resolution_meters=250.0)
    cells = grid_gen.generate_representative_ner_cells(count_per_state=count_per_state)
    print(f"     Generated {len(cells)} valid grid cells strictly inside official NER state boundaries.")

    # 2. Ingestion Adapters
    print("  -> Running Ingestion Adapters with explicit 2026 provenance tracking...")
    sat_adapter = Sentinel2VegetationAdapter()
    dem_adapter = NASA_SRTM_DEM_Adapter()
    precip_adapter = IMDPrecipitationAdapter()
    climate_adapter = ClimateMeteorologyAdapter(weather_adapter=precip_adapter)
    soil_adapter = ISRICSoilGridsAdapter()
    landcover_adapter = ESAWorldCoverAdapter()
    hydro_adapter = HydroSHEDS_Hydrology_Adapter()
    forest_adapter = MoEFCC_Forest_Protected_Adapter()
    disaster_adapter = GSI_Disaster_Inventory_Adapter()
    road_adapter = MoRTH_RoadNetwork_Adapter()

    sat_obs = {o["grid_id"]: o for o in sat_adapter.ingest_for_cells(cells, observation_date)}
    dem_obs = {o["grid_id"]: o for o in dem_adapter.ingest_for_cells(cells, observation_date)}
    precip_obs = {o["grid_id"]: o for o in precip_adapter.ingest_for_cells(cells, observation_date)}
    climate_obs = {o["grid_id"]: o for o in climate_adapter.ingest_for_cells(cells, observation_date)}
    soil_obs = {o["grid_id"]: o for o in soil_adapter.ingest_for_cells(cells, observation_date)}
    landcover_obs = {o["grid_id"]: o for o in landcover_adapter.ingest_for_cells(cells, observation_date)}
    hydro_obs = {o["grid_id"]: o for o in hydro_adapter.ingest_for_cells(cells, observation_date)}
    forest_obs = {o["grid_id"]: o for o in forest_adapter.ingest_for_cells(cells, observation_date)}
    disaster_obs = {o["grid_id"]: o for o in disaster_adapter.ingest_for_cells(cells, observation_date)}
    road_obs = {o["grid_id"]: o for o in road_adapter.ingest_for_cells(cells, observation_date)}

    # 3. Harmonize & Feature Engineer
    print("  -> Harmonizing spectral, topographic, hydrologic, pedological, road, and climatic features...")
    engineer = MasterFeatureEngineer()
    records = []
    for c in cells:
        gid = c["grid_id"]
        row = engineer.harmonize_record(
            grid_cell=c,
            sat_data=sat_obs.get(gid, {}),
            dem_data=dem_obs.get(gid, {}),
            precip_data=precip_obs.get(gid, {}),
            climate_data=climate_obs.get(gid, {}),
            soil_data=soil_obs.get(gid, {}),
            landcover_data=landcover_obs.get(gid, {}),
            hydro_data=hydro_obs.get(gid, {}),
            forest_data=forest_obs.get(gid, {}),
            disaster_data=disaster_obs.get(gid, {}),
            road_data=road_obs.get(gid, {}),
            observation_date=observation_date,
        )
        records.append(row)

    df_master = pd.DataFrame(records)
    print(f"     Constructed unified tabular dataset: {df_master.shape[0]} rows x {df_master.shape[1]} columns.")

    # 4. Save to Interim Parquet and Processed CSV
    print("  -> Persisting to CSV (and Parquet if engine available)...")
    try:
        df_master.to_parquet(output_interim_parquet, index=False)
        print("     Saved interim Parquet artifact.")
    except Exception as e:
        print(f"     Note: Parquet engine not installed ({e}); saving master CSV.")
    df_master.to_csv(output_master_csv, index=False)

    # 4b. Generate Leakage-Proof Spatial Splits (Train / Val / Test)
    print("  -> Creating Leakage-Proof Spatial Block Splits (70% Train, 15% Val, 15% Test)...")
    generate_and_save_splits(output_master_csv, os.path.dirname(output_master_csv))

    # 5. Validation & Quality Reporting
    print("  -> Running Data Validation & generating Quality Reports...")
    validator = DatasetValidator()
    is_valid, val_summary = validator.validate_dataframe(df_master)
    print(f"     Validation result: {'PASSED' if is_valid else 'ISSUES FOUND'}")
    if not is_valid:
        for issue in val_summary["issues"][:5]:
            print(f"       * {issue}")

    quality_df = validator.generate_quality_report(
        df_master,
        output_csv_path="reports/data_quality_report.csv",
        output_json_path="reports/dataset_summary.json",
    )
    print("     Quality report saved to reports/data_quality_report.csv and reports/dataset_summary.json")

    # 6. Append to PROCESSING_LOG.csv
    end_time = datetime.now(timezone.utc)
    log_entry = pd.DataFrame([{
        "timestamp": end_time.isoformat(),
        "dataset_id": "ALL",
        "input": "Sentinel-2, SRTM, IMD, SoilGrids, WorldCover, HydroSHEDS, GSI, MoRTH",
        "output": output_master_csv,
        "operation": "GENERATE_MASTER_DATASET",
        "crs": "EPSG:32646 / EPSG:4326",
        "resolution": "250m",
        "software_version": "sentinel-ner-pipeline-1.0.0",
        "notes": f"Generated {len(df_master)} rows x {len(df_master.columns)} cols for 8 NER states. Validated: {is_valid}",
    }])

    if os.path.exists(log_path):
        log_entry.to_csv(log_path, mode="a", header=False, index=False)
    else:
        log_entry.to_csv(log_path, index=False)

    print(f"[{end_time.strftime('%H:%M:%S')}] Pipeline execution complete. Master dataset ready at: {output_master_csv}")
    return df_master


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 35
    run_pipeline(count_per_state=count)
