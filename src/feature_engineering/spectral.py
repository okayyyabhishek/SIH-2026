"""
Sentinel NER — Spectral Indices & Cloud-Masked Vegetation Feature Engineering
Implements authoritative Sentinel-2 MSI band formulas for:
NDVI, EVI, NDWI, NBR, and Fractional Vegetation Cover.
Strictly excludes cloud and cloud-shadow pixels.
"""

from typing import Dict, Optional, Tuple
import math
import numpy as np


def compute_spectral_indices(
    b2_blue: float,
    b3_green: float,
    b4_red: float,
    b8_nir: float,
    b12_swir2: float,
    scl_class: int,
    ndvi_soil: float = 0.05,
    ndvi_veg: float = 0.85,
) -> Dict[str, Optional[float]]:
    """
    Computes standard remote sensing indices with mandatory cloud masking.
    
    Cloud Masking Rule:
    If SCL is 3 (cloud shadow), 8 (cloud medium prob), 9 (cloud high prob), or 10 (cirrus),
    the pixel is flagged as cloud-contaminated and indices return None.
    """
    # Cloud-masking gate
    if scl_class in (3, 8, 9, 10):
        return {
            "ndvi": None,
            "evi": None,
            "ndwi": None,
            "nbr": None,
            "vegetation_fraction": None,
            "cloud_masked": True,
        }

    # 1. NDVI = (B8 - B4) / (B8 + B4)
    denom_ndvi = b8_nir + b4_red
    ndvi = (b8_nir - b4_red) / denom_ndvi if abs(denom_ndvi) > 1e-6 else 0.0
    ndvi = max(-1.0, min(1.0, ndvi))

    # 2. EVI = 2.5 * (B8 - B4) / (B8 + 6*B4 - 7.5*B2 + 1)
    denom_evi = b8_nir + 6.0 * b4_red - 7.5 * b2_blue + 1.0
    evi = 2.5 * (b8_nir - b4_red) / denom_evi if abs(denom_evi) > 1e-6 else 0.0
    evi = max(-1.0, min(2.5, evi))

    # 3. NDWI = (B3 - B8) / (B3 + B8)  (Gao 1996 / McFeeters)
    denom_ndwi = b3_green + b8_nir
    ndwi = (b3_green - b8_nir) / denom_ndwi if abs(denom_ndwi) > 1e-6 else 0.0
    ndwi = max(-1.0, min(1.0, ndwi))

    # 4. NBR = (B8 - B12) / (B8 + B12)
    denom_nbr = b8_nir + b12_swir2
    nbr = (b8_nir - b12_swir2) / denom_nbr if abs(denom_nbr) > 1e-6 else 0.0
    nbr = max(-1.0, min(1.0, nbr))

    # 5. Vegetation Fraction (Gutman & Ignatov 1998 dimidiate model)
    fvc = ((ndvi - ndvi_soil) / (ndvi_veg - ndvi_soil))**2 if ndvi > ndvi_soil else 0.0
    fvc = max(0.0, min(1.0, fvc))

    return {
        "ndvi": round(float(ndvi), 4),
        "evi": round(float(evi), 4),
        "ndwi": round(float(ndwi), 4),
        "nbr": round(float(nbr), 4),
        "vegetation_fraction": round(float(fvc), 4),
        "cloud_masked": False,
    }
