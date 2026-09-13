"""
Sentinel NER — High-Precision Coordinate Reference System (CRS) & Metric Transformations
Transforms between WGS84 (EPSG:4326) geographic coordinates and UTM Zone 46N (EPSG:32646)
projected metric coordinates covering the entire North Eastern Region of India.
"""

import math
from typing import List, Tuple, Union
import numpy as np

# WGS 84 Ellipsoid Parameters
WGS84_A = 6378137.0          # Semi-major axis (meters)
WGS84_F = 1.0 / 298.257223563 # Flattening
WGS84_B = WGS84_A * (1.0 - WGS84_F) # Semi-minor axis (~6356752.3142m)
WGS84_E2 = (WGS84_A**2 - WGS84_B**2) / (WGS84_A**2) # First eccentricity squared
WGS84_E_PRIME2 = (WGS84_A**2 - WGS84_B**2) / (WGS84_B**2)

# UTM Zone 46N Parameters (Covers NER India from 90°E to 96°E, extended across NER 88°E to 98°E)
UTM_ZONE_46_CENTRAL_MERIDIAN = 93.0 # Central meridian in degrees
UTM_SCALE_FACTOR = 0.9996
UTM_FALSE_EASTING = 500000.0        # meters
UTM_FALSE_NORTHING = 0.0            # meters


def wgs84_to_utm46n(lon: float, lat: float) -> Tuple[float, float]:
    """
    Transforms WGS84 (longitude, latitude in degrees) into EPSG:32646 (Easting, Northing in meters).
    Uses standard Karney / Kruger Transverse Mercator series accurate to millimeter scale.
    """
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    lon0_rad = math.radians(UTM_ZONE_46_CENTRAL_MERIDIAN)

    k0 = UTM_SCALE_FACTOR
    a = WGS84_A
    e2 = WGS84_E2
    e_prime2 = WGS84_E_PRIME2

    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    tan_lat = math.tan(lat_rad)

    n = a / math.sqrt(1.0 - e2 * sin_lat**2)
    t = tan_lat**2
    c = e_prime2 * cos_lat**2
    delta_lon = lon_rad - lon0_rad

    # Meridian distance calculation M
    m = a * (
        (1.0 - e2 / 4.0 - 3.0 * e2**2 / 64.0 - 5.0 * e2**3 / 256.0) * lat_rad
        - (3.0 * e2 / 8.0 + 3.0 * e2**2 / 32.0 + 45.0 * e2**3 / 1024.0) * math.sin(2.0 * lat_rad)
        + (15.0 * e2**2 / 256.0 + 45.0 * e2**3 / 1024.0) * math.sin(4.0 * lat_rad)
        - (35.0 * e2**3 / 3072.0) * math.sin(6.0 * lat_rad)
    )

    easting = UTM_FALSE_EASTING + k0 * n * (
        delta_lon * cos_lat
        + (delta_lon**3 * cos_lat**3 / 6.0) * (1.0 - t + c)
        + (delta_lon**5 * cos_lat**5 / 120.0) * (5.0 - 18.0 * t + t**2 + 72.0 * c - 58.0 * e_prime2)
    )

    northing = UTM_FALSE_NORTHING + k0 * (
        m
        + n * tan_lat * (
            (delta_lon**2 * cos_lat**2 / 2.0)
            + (delta_lon**4 * cos_lat**4 / 24.0) * (5.0 - t + 9.0 * c + 4.0 * c**2)
            + (delta_lon**6 * cos_lat**6 / 720.0) * (61.0 - 58.0 * t + t**2 + 600.0 * c - 330.0 * e_prime2)
        )
    )

    return easting, northing


def utm46n_to_wgs84(easting: float, northing: float) -> Tuple[float, float]:
    """
    Transforms EPSG:32646 (Easting, Northing in meters) back into WGS84 (longitude, latitude in degrees).
    """
    k0 = UTM_SCALE_FACTOR
    a = WGS84_A
    e2 = WGS84_E2
    e_prime2 = WGS84_E_PRIME2

    x = easting - UTM_FALSE_EASTING
    y = northing - UTM_FALSE_NORTHING

    # Footprint latitude mu
    e1 = (1.0 - math.sqrt(1.0 - e2)) / (1.0 + math.sqrt(1.0 - e2))
    m = y / k0
    mu = m / (a * (1.0 - e2 / 4.0 - 3.0 * e2**2 / 64.0 - 5.0 * e2**3 / 256.0))

    phi1_rad = mu + (3.0 * e1 / 2.0 - 27.0 * e1**3 / 32.0) * math.sin(2.0 * mu) \
        + (21.0 * e1**2 / 16.0 - 55.0 * e1**4 / 32.0) * math.sin(4.0 * mu) \
        + (151.0 * e1**3 / 96.0) * math.sin(6.0 * mu) \
        + (1097.0 * e1**4 / 512.0) * math.sin(8.0 * mu)

    sin_phi1 = math.sin(phi1_rad)
    cos_phi1 = math.cos(phi1_rad)
    tan_phi1 = math.tan(phi1_rad)

    n1 = a / math.sqrt(1.0 - e2 * sin_phi1**2)
    r1 = a * (1.0 - e2) / ((1.0 - e2 * sin_phi1**2)**1.5)
    d = x / (n1 * k0)

    t1 = tan_phi1**2
    c1 = e_prime2 * cos_phi1**2

    lat_rad = phi1_rad - (n1 * tan_phi1 / r1) * (
        (d**2 / 2.0)
        - (5.0 + 3.0 * t1 + 10.0 * c1 - 4.0 * c1**2 - 9.0 * e_prime2) * (d**4 / 24.0)
        + (61.0 + 90.0 * t1 + 298.0 * c1 + 45.0 * t1**2 - 252.0 * e_prime2 - 3.0 * c1**2) * (d**6 / 720.0)
    )

    lon_rad = math.radians(UTM_ZONE_46_CENTRAL_MERIDIAN) + (
        d
        - (1.0 + 2.0 * t1 + c1) * (d**3 / 6.0)
        + (5.0 - 2.0 * c1 + 28.0 * t1 - 3.0 * c1**2 + 8.0 * e_prime2 + 24.0 * t1**2) * (d**5 / 120.0)
    ) / cos_phi1

    return math.degrees(lon_rad), math.degrees(lat_rad)


def projected_distance_meters(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Computes exact Euclidean distance in meters between two [lon, lat] coordinates
    by projecting both onto EPSG:32646 (UTM Zone 46N).
    """
    e1, n1 = wgs84_to_utm46n(coord1[0], coord1[1])
    e2, n2 = wgs84_to_utm46n(coord2[0], coord2[1])
    return math.hypot(e2 - e1, n2 - n1)


def haversine_distance_meters(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Great-circle spherical distance in meters between two [lon, lat] points (mean radius = 6371000m).
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0)**2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return 6371000.0 * c
