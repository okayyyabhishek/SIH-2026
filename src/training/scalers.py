"""
Sentinel NER — Persistent Feature Scaling & Preprocessing Transformer
Fits scalers strictly on training data and serializes transformation parameters
so inference pipelines use the exact identical normalization without data leakage.
"""

import json
import os
import pickle
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler


# Features targeted for StandardScaler (continuous unbounded / approximately Gaussian)
STANDARD_SCALE_FEATURES = [
    "elevation_m",
    "slope_deg",
    "terrain_ruggedness",
    "relief_m",
    "rainfall_1d_mm",
    "rainfall_3d_mm",
    "rainfall_7d_mm",
    "rainfall_30d_mm",
    "rainfall_90d_mm",
    "temperature_mean_c",
    "temperature_max_c",
    "temperature_min_c",
    "temperature_range_c",
    "evi",
    "ndwi",
    "nbr",
    "soil_ph",
    "soil_organic_carbon",
    "soil_bulk_density",
    "soil_water_capacity",
    "distance_to_river_m",
    "distance_to_water_m",
    "drainage_density",
    "distance_to_protected_area_m",
    "distance_to_road_m",
    "nearest_landslide_distance_km",
]

# Features targeted for MinMaxScaler (bounded ratios / percentages [0-1] or [0-100])
MINMAX_SCALE_FEATURES = [
    "humidity_pct",
    "ndvi",
    "vegetation_fraction",
    "soil_clay_pct",
    "soil_sand_pct",
    "soil_silt_pct",
    "water_occurrence_pct",
    "forest_cover_pct",
]

# Categorical / Binary features passed through as-is
PASS_THROUGH_FEATURES = [
    "state_code",
    "district_code",
    "landcover_code",
    "protected_area_flag",
    "flood_history_flag",
    "landslide_history_flag",
    "road_proximity_flag",
    "road_cut_slope_hazard",
]

ALL_MODEL_FEATURES = STANDARD_SCALE_FEATURES + MINMAX_SCALE_FEATURES + PASS_THROUGH_FEATURES


class PersistentFeatureScaler:
    """
    Manages dual-scaler transformations, preserving parameter dictionaries for JSON serialization
    and exact deterministic replay during production inference.
    """

    def __init__(self):
        self.standard_scaler = StandardScaler()
        self.minmax_scaler = MinMaxScaler()
        self.is_fitted = False
        self.feature_names = ALL_MODEL_FEATURES

    def fit(self, df_train: pd.DataFrame) -> "PersistentFeatureScaler":
        """Fits scalers strictly on the training partition."""
        # Standard scale features
        std_cols = [c for c in STANDARD_SCALE_FEATURES if c in df_train.columns]
        if std_cols:
            self.standard_scaler.fit(df_train[std_cols].fillna(df_train[std_cols].median()))

        # MinMax scale features
        mm_cols = [c for c in MINMAX_SCALE_FEATURES if c in df_train.columns]
        if mm_cols:
            self.minmax_scaler.fit(df_train[mm_cols].fillna(df_train[mm_cols].median()))

        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Applies fitted scaling to any dataset (validation, test, or live inference)."""
        assert self.is_fitted, "Scaler must be fitted before transforming data."
        df_out = df.copy()

        std_cols = [c for c in STANDARD_SCALE_FEATURES if c in df_out.columns]
        if std_cols:
            vals = df_out[std_cols].fillna(df_out[std_cols].median()).values
            df_out[std_cols] = self.standard_scaler.transform(vals)

        mm_cols = [c for c in MINMAX_SCALE_FEATURES if c in df_out.columns]
        if mm_cols:
            vals_mm = df_out[mm_cols].fillna(df_out[mm_cols].median()).values
            df_out[mm_cols] = self.minmax_scaler.transform(vals_mm)

        return df_out

    def transform_single_dict(self, feature_dict: Dict[str, float]) -> Dict[str, float]:
        """Transforms a single observation dictionary for real-time inference."""
        df = pd.DataFrame([feature_dict])
        transformed_df = self.transform(df)
        return transformed_df.iloc[0].to_dict()

    def save(self, output_path: str = "models/feature_scaler.json"):
        """Saves fitted scaler parameters to JSON."""
        assert self.is_fitted, "Cannot save unfitted scaler."
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        params = {
            "standard_features": STANDARD_SCALE_FEATURES,
            "minmax_features": MINMAX_SCALE_FEATURES,
            "pass_through_features": PASS_THROUGH_FEATURES,
            "all_features": ALL_MODEL_FEATURES,
            "standard_scaler": {
                "mean": self.standard_scaler.mean_.tolist(),
                "scale": self.standard_scaler.scale_.tolist(),
                "var": self.standard_scaler.var_.tolist(),
            },
            "minmax_scaler": {
                "min": self.minmax_scaler.min_.tolist(),
                "scale": self.minmax_scaler.scale_.tolist(),
                "data_min": self.minmax_scaler.data_min_.tolist(),
                "data_max": self.minmax_scaler.data_max_.tolist(),
            },
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(params, f, indent=2)

    @classmethod
    def load(cls, input_path: str = "models/feature_scaler.json") -> "PersistentFeatureScaler":
        """Loads fitted parameters from JSON."""
        instance = cls()
        with open(input_path, "r", encoding="utf-8") as f:
            params = json.load(f)

        instance.standard_scaler.mean_ = np.array(params["standard_scaler"]["mean"])
        instance.standard_scaler.scale_ = np.array(params["standard_scaler"]["scale"])
        instance.standard_scaler.var_ = np.array(params["standard_scaler"]["var"])

        instance.minmax_scaler.min_ = np.array(params["minmax_scaler"]["min"])
        instance.minmax_scaler.scale_ = np.array(params["minmax_scaler"]["scale"])
        instance.minmax_scaler.data_min_ = np.array(params["minmax_scaler"]["data_min"])
        instance.minmax_scaler.data_max_ = np.array(params["minmax_scaler"]["data_max"])

        instance.is_fitted = True
        return instance
