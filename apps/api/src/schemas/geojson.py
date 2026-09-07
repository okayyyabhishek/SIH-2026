"""
Sentinel NER — Strict GeoJSON (EPSG:4326) Schemas & Spatial Validation
Enforces WGS84 coordinates, finite bounds, polygon ring closure, and nesting checks.
"""

import math
from enum import Enum
from typing import Any, List, Union

from pydantic import BaseModel, Field, field_validator


class GeoJSONType(str, Enum):
    POINT = "Point"
    LINESTRING = "LineString"
    POLYGON = "Polygon"
    MULTI_POLYGON = "MultiPolygon"
    MULTI_LINESTRING = "MultiLineString"


# Maximum allowed total coordinate vertices per payload (DDoS/oversized payload prevention)
MAX_GEOMETRY_COORDINATES = 10000


def _validate_coordinate_pair(coord: Any) -> List[float]:
    """Validates that a coordinate is a 2-element [longitude, latitude] list of finite floats."""
    if not isinstance(coord, (list, tuple)):
        raise ValueError(f"Coordinate must be a list/tuple of [longitude, latitude], got {type(coord).__name__}")
    if len(coord) < 2:
        raise ValueError(f"Coordinate pair requires at least 2 elements [longitude, latitude], got {len(coord)}")

    lng = float(coord[0])
    lat = float(coord[1])

    if math.isnan(lng) or math.isinf(lng):
        raise ValueError("Longitude must be a finite numeric value; NaN and Infinity are prohibited.")
    if math.isnan(lat) or math.isinf(lat):
        raise ValueError("Latitude must be a finite numeric value; NaN and Infinity are prohibited.")

    if not (-180.0 <= lng <= 180.0):
        raise ValueError(f"Longitude must be between -180.0 and 180.0 degrees, got {lng}")
    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude must be between -90.0 and 90.0 degrees, got {lat}")

    # Canonical 2D storage [lng, lat]
    return [lng, lat]


class GeoJSONPoint(BaseModel):
    type: GeoJSONType = GeoJSONType.POINT
    coordinates: List[float] = Field(..., description="[longitude, latitude] in EPSG:4326")

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: Any) -> List[float]:
        return _validate_coordinate_pair(v)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: GeoJSONType) -> GeoJSONType:
        if v != GeoJSONType.POINT:
            raise ValueError("Type must be 'Point'")
        return v

    @property
    def longitude(self) -> float:
        return self.coordinates[0]

    @property
    def latitude(self) -> float:
        return self.coordinates[1]


class GeoJSONLineString(BaseModel):
    type: GeoJSONType = GeoJSONType.LINESTRING
    coordinates: List[List[float]] = Field(..., description="List of at least 2 [longitude, latitude] points")

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: Any) -> List[List[float]]:
        if not isinstance(v, list) or len(v) < 2:
            raise ValueError("LineString must contain at least 2 coordinate pairs.")
        if len(v) > MAX_GEOMETRY_COORDINATES:
            raise ValueError(f"Geometry exceeds maximum coordinate vertex limit of {MAX_GEOMETRY_COORDINATES}")
        return [_validate_coordinate_pair(c) for c in v]

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: GeoJSONType) -> GeoJSONType:
        if v != GeoJSONType.LINESTRING:
            raise ValueError("Type must be 'LineString'")
        return v


class GeoJSONMultiLineString(BaseModel):
    type: GeoJSONType = GeoJSONType.MULTI_LINESTRING
    coordinates: List[List[List[float]]] = Field(..., description="List of LineStrings")

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: Any) -> List[List[List[float]]]:
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("MultiLineString must contain at least 1 LineString coordinate array.")
        total_pts = sum(len(line) for line in v if isinstance(line, list))
        if total_pts > MAX_GEOMETRY_COORDINATES:
            raise ValueError(f"Geometry exceeds maximum coordinate vertex limit of {MAX_GEOMETRY_COORDINATES}")
        validated = []
        for line in v:
            if not isinstance(line, list) or len(line) < 2:
                raise ValueError("Each LineString in MultiLineString must contain at least 2 coordinate pairs.")
            validated.append([_validate_coordinate_pair(c) for c in line])
        return validated


class GeoJSONPolygon(BaseModel):
    type: GeoJSONType = GeoJSONType.POLYGON
    coordinates: List[List[List[float]]] = Field(
        ..., description="List of linear rings. First ring is exterior boundary; subsequent are holes."
    )

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: Any) -> List[List[List[float]]]:
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("Polygon must contain at least one linear ring (exterior boundary).")

        total_pts = sum(len(ring) for ring in v if isinstance(ring, list))
        if total_pts > MAX_GEOMETRY_COORDINATES:
            raise ValueError(f"Geometry exceeds maximum coordinate vertex limit of {MAX_GEOMETRY_COORDINATES}")

        validated_rings = []
        for idx, ring in enumerate(v):
            if not isinstance(ring, list) or len(ring) < 4:
                raise ValueError(
                    f"Linear ring {idx} must contain at least 4 coordinate pairs (minimum closed triangle)."
                )
            ring_validated = [_validate_coordinate_pair(c) for c in ring]
            # Verify ring closure: first coordinate must equal last coordinate
            first = ring_validated[0]
            last = ring_validated[-1]
            if first[0] != last[0] or first[1] != last[1]:
                raise ValueError(
                    f"Linear ring {idx} is not closed: first coordinate {first} does not match last coordinate {last}."
                )
            validated_rings.append(ring_validated)
        return validated_rings

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: GeoJSONType) -> GeoJSONType:
        if v != GeoJSONType.POLYGON:
            raise ValueError("Type must be 'Polygon'")
        return v


class GeoJSONMultiPolygon(BaseModel):
    type: GeoJSONType = GeoJSONType.MULTI_POLYGON
    coordinates: List[List[List[List[float]]]] = Field(..., description="List of Polygon coordinate arrays")

    @field_validator("coordinates")
    @classmethod
    def validate_coords(cls, v: Any) -> List[List[List[List[float]]]]:
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError("MultiPolygon must contain at least one polygon coordinate array.")

        total_pts = sum(len(ring) for poly in v if isinstance(poly, list) for ring in poly if isinstance(ring, list))
        if total_pts > MAX_GEOMETRY_COORDINATES:
            raise ValueError(f"Geometry exceeds maximum coordinate vertex limit of {MAX_GEOMETRY_COORDINATES}")

        validated_polygons = []
        for p_idx, poly in enumerate(v):
            if not isinstance(poly, list) or len(poly) == 0:
                raise ValueError(f"Polygon {p_idx} in MultiPolygon must contain at least one linear ring.")
            validated_rings = []
            for r_idx, ring in enumerate(poly):
                if not isinstance(ring, list) or len(ring) < 4:
                    raise ValueError(
                        f"Linear ring {r_idx} in Polygon {p_idx} must contain at least 4 coordinate pairs."
                    )
                ring_validated = [_validate_coordinate_pair(c) for c in ring]
                if ring_validated[0] != ring_validated[-1]:
                    raise ValueError(
                        f"Linear ring {r_idx} in Polygon {p_idx} is not closed (first != last)."
                    )
                validated_rings.append(ring_validated)
            validated_polygons.append(validated_rings)
        return validated_polygons


# Discriminated Union for any valid GeoJSON geometry
GeoJSONGeometry = Union[GeoJSONPoint, GeoJSONLineString, GeoJSONMultiLineString, GeoJSONPolygon, GeoJSONMultiPolygon]


def validate_geojson_dict(data: Any) -> GeoJSONGeometry:
    """Helper to validate arbitrary dict into appropriate GeoJSON model."""
    if not isinstance(data, dict):
        raise ValueError("GeoJSON must be a dictionary")
    g_type = data.get("type")
    if g_type in (GeoJSONType.POINT, "Point"):
        return GeoJSONPoint.model_validate(data)
    elif g_type in (GeoJSONType.LINESTRING, "LineString"):
        return GeoJSONLineString.model_validate(data)
    elif g_type in (GeoJSONType.MULTI_LINESTRING, "MultiLineString"):
        return GeoJSONMultiLineString.model_validate(data)
    elif g_type in (GeoJSONType.POLYGON, "Polygon"):
        return GeoJSONPolygon.model_validate(data)
    elif g_type in (GeoJSONType.MULTI_POLYGON, "MultiPolygon"):
        return GeoJSONMultiPolygon.model_validate(data)
    else:
        raise ValueError(f"Unsupported or invalid GeoJSON geometry type: {g_type}")
