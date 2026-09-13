"""
Sentinel NER — Geospatial Subsystem
Provides boundary containment, CRS transformations (EPSG:4326 <-> EPSG:32646),
and regular spatial grid generation for Northeast India.
"""

from src.geospatial.boundary import (
    NER_BOUNDING_BOX,
    STATE_POLYGONS,
    get_state_for_point,
    is_inside_ner,
    point_in_polygon,
)
from src.geospatial.crs import (
    haversine_distance_meters,
    projected_distance_meters,
    utm46n_to_wgs84,
    wgs84_to_utm46n,
)
from src.geospatial.grid import SpatialGridGenerator

__all__ = [
    "NER_BOUNDING_BOX",
    "STATE_POLYGONS",
    "get_state_for_point",
    "is_inside_ner",
    "point_in_polygon",
    "haversine_distance_meters",
    "projected_distance_meters",
    "utm46n_to_wgs84",
    "wgs84_to_utm46n",
    "SpatialGridGenerator",
]
