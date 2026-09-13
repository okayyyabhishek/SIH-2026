"""
Sentinel NER — Subsurface Geotechnical Feature Engineering & Sigmoid Function Engine
Derives physical pore water pressure, effective cohesion, internal friction angle,
pore pressure ratio (ru), deterministic Factor of Safety (Fs), and subsurface inclinometer creep.
Computes real-time Sigmoid activation sigma(z) = 1 / (1 + exp(-z)).
"""

import math
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


def compute_subsurface_geotech(row: Union[Dict[str, Any], pd.Series]) -> Dict[str, float]:
    """
    Computes deterministic subsurface geotechnical parameters from physical terrain,
    hydrological, pedological, and meteorological attributes using Mohr-Coulomb
    limit equilibrium and Terzaghi effective stress mechanics.

    Attributes used:
      - slope_deg: Slope gradient in degrees (beta)
      - soil_bulk_density: Dry/moist soil density in g/cm3 (multiplied by 9.81 for kN/m3)
      - soil_clay_pct, soil_sand_pct, soil_silt_pct: Soil textural fractions
      - soil_organic_carbon: Organic carbon content in g/kg
      - soil_water_capacity: Available water capacity in mm/m
      - rainfall_1d_mm, rainfall_3d_mm, rainfall_30d_mm: Antecedent precipitation
    """
    # 1. Failure plane depth z (authoritative NER deep regolith shear horizon is ~6.0m)
    depth_m = 6.0

    # 2. Slope angle beta (clamped to physical minimum 5.0 deg to avoid division by zero)
    slope_deg = float(row.get("slope_deg", 25.0) or 25.0)
    beta_deg = max(5.0, min(80.0, slope_deg))
    beta_rad = math.radians(beta_deg)

    # 3. Unit weight of soil gamma (kN/m3)
    bulk_density = float(row.get("soil_bulk_density", 1.25) or 1.25)
    gamma = max(11.0, min(22.0, bulk_density * 9.81))

    # 4. Textural fractions & effective strength parameters (Mohr-Coulomb)
    clay_pct = float(row.get("soil_clay_pct", 28.0) or 28.0)
    sand_pct = float(row.get("soil_sand_pct", 38.0) or 38.0)
    silt_pct = float(row.get("soil_silt_pct", 34.0) or 34.0)
    soc = float(row.get("soil_organic_carbon", 18.0) or 18.0)

    # Effective Cohesion c' (kPa): clay binding + organic matrix
    cohesion_kpa = 5.0 + (0.35 * clay_pct) + (0.15 * soc)
    cohesion_kpa = round(max(8.0, min(45.0, cohesion_kpa)), 2)

    # Effective Internal Friction Angle phi' (deg): coarse angular interlocking
    friction_deg = 20.0 + (0.18 * sand_pct) + (0.08 * silt_pct) - (0.10 * clay_pct)
    friction_deg = round(max(22.0, min(38.0, friction_deg)), 2)
    phi_rad = math.radians(friction_deg)

    # 5. Hydrological Saturation & Pore Water Pressure u (kPa)
    rain_1d = float(row.get("rainfall_1d_mm", 15.0) or 15.0)
    rain_3d = float(row.get("rainfall_3d_mm", 45.0) or 45.0)
    rain_30d = float(row.get("rainfall_30d_mm", 200.0) or 200.0)
    water_capacity = float(row.get("soil_water_capacity", 32.0) or 32.0)

    # Antecedent precipitation infiltration index [0.10, 1.0]
    rain_idx = (0.35 * (rain_1d / 35.0)) + (0.45 * (rain_3d / 80.0)) + (0.20 * (rain_30d / 280.0))
    capacity_factor = water_capacity / 35.0
    saturation_ratio = min(1.0, max(0.12, rain_idx * capacity_factor))

    # Pore water pressure u = gamma_w * z * saturation_ratio (gamma_w = 9.81 kN/m3)
    pwp_kpa = round(9.81 * depth_m * saturation_ratio, 2)

    # 6. Pore Pressure Ratio ru = u / (gamma * z)
    total_stress = gamma * depth_m
    ru = round(min(0.55, max(0.05, pwp_kpa / max(1.0, total_stress))), 4)

    # 7. Infinite Slope Deterministic Factor of Safety (Fs)
    # Fs = [c' + (gamma * z * cos^2(beta) - u) * tan(phi')] / [gamma * z * sin(beta) * cos(beta)]
    cos_beta = math.cos(beta_rad)
    sin_beta = math.sin(beta_rad)
    tan_phi = math.tan(phi_rad)

    driving_shear = total_stress * sin_beta * cos_beta
    effective_normal = (total_stress * (cos_beta ** 2)) - pwp_kpa
    resisting_shear = cohesion_kpa + (max(0.0, effective_normal) * tan_phi)

    if driving_shear > 1e-4:
        raw_fs = resisting_shear / driving_shear
    else:
        raw_fs = 2.5
    factor_of_safety = round(max(0.65, min(2.80, raw_fs)), 3)

    # 8. Subsurface Inclinometer Creep Velocity (um/hr)
    # Creep velocity accelerates exponentially as Fs drops below watch threshold 1.35
    deficit = max(0.0, 1.35 - factor_of_safety)
    creep_velocity = 2.0 * math.exp(2.8 * deficit) + (0.04 * pwp_kpa)
    creep_velocity = round(max(0.8, min(45.0, creep_velocity)), 2)

    return {
        "depth_to_slip_plane_m": depth_m,
        "pore_water_pressure_kpa": pwp_kpa,
        "effective_cohesion_kpa": cohesion_kpa,
        "friction_angle_deg": friction_deg,
        "pore_pressure_ratio_ru": ru,
        "factor_of_safety_fs": factor_of_safety,
        "subsurface_creep_um_hr": creep_velocity,
    }


def calculate_sigmoid(z: float) -> float:
    """
    Evaluates real-time Sigmoid activation:
    sigma(z) = 1.0 / (1.0 + exp(-z))
    Clamped to prevent overflow for |z| > 15.
    """
    clamped_z = max(-15.0, min(15.0, float(z)))
    return 1.0 / (1.0 + math.exp(-clamped_z))


def generate_sigmoid_curve_points(
    active_z: float,
    z_min: float = -6.0,
    z_max: float = 6.0,
    steps: int = 49,
) -> List[Dict[str, float]]:
    """
    Generates coordinate points along the continuous Sigmoid curve for SVG plotting.
    """
    zs = np.linspace(z_min, z_max, steps)
    points = []
    for val in zs:
        points.append({
            "z": round(float(val), 2),
            "sigma": round(calculate_sigmoid(float(val)), 4),
        })
    return points
