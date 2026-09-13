"""
Sentinel NER — Feature Engineering Subsystem
Contains modules for spectral indices, terrain morphometry, and multi-sensor harmonization.
"""

from src.feature_engineering.spectral import compute_spectral_indices
from src.feature_engineering.terrain import compute_terrain_morphometry, derive_cell_topography
from src.feature_engineering.engineer import MasterFeatureEngineer

__all__ = [
    "compute_spectral_indices",
    "compute_terrain_morphometry",
    "derive_cell_topography",
    "MasterFeatureEngineer",
]
