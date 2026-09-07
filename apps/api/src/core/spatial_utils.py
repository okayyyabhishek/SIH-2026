"""
Sentinel NER — Pure Python Spatial Query & Geometric Utilities
Provides haversine distance calculation, point-in-polygon ray-casting,
and bounding-box intersection without C-compiled GIS binary dependencies.
"""

import math
from typing import Any, Dict, List, Tuple


def haversine_distance_meters(coord1: List[float], coord2: List[float]) -> float:
    """
    Computes great-circle distance between two [longitude, latitude] coordinates in meters
    using the Haversine formula on a spherical Earth (WGS84 mean radius = 6371000m).
    """
    lng1, lat1 = coord1[0], coord1[1]
    lng2, lat2 = coord2[0], coord2[1]

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return 6371000.0 * c


def point_in_linear_ring(point: List[float], ring: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to determine if a [lng, lat] point is inside a polygon linear ring.
    Points exactly on vertex/edge are treated as inside.
    """
    px, py = point[0], point[1]
    inside = False
    n = len(ring)
    if n < 3:
        return False

    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]

        # Check vertex coincidence
        if math.isclose(px, xi, abs_tol=1e-8) and math.isclose(py, yi, abs_tol=1e-8):
            return True

        # Ray-casting crossing check
        if ((yi > py) != (yj > py)) and (
            px < (xj - xi) * (py - yi) / (yj - yi + 1e-15) + xi
        ):
            inside = not inside
        j = i

    return inside


def point_in_polygon_geometry(point: List[float], poly_coords: List[List[List[float]]]) -> bool:
    """
    Checks if point is inside a GeoJSON Polygon (exterior ring minus any interior holes).
    """
    if not poly_coords or len(poly_coords) == 0:
        return False

    exterior = poly_coords[0]
    if not point_in_linear_ring(point, exterior):
        return False

    # If inside exterior, check if it falls within any interior hole
    for hole in poly_coords[1:]:
        if point_in_linear_ring(point, hole):
            return False  # Inside hole -> outside polygon

    return True


def point_in_multipolygon_geometry(point: List[float], multipoly_coords: List[List[List[List[float]]]]) -> bool:
    """Checks if point is inside any of the polygons of a MultiPolygon."""
    for poly in multipoly_coords:
        if point_in_polygon_geometry(point, poly):
            return True
    return False


def point_in_geojson_geometry(point: List[float], geometry: Dict[str, Any]) -> bool:
    """
    Determines if [lng, lat] point is spatially contained within a GeoJSON Polygon or MultiPolygon.
    If geometry is Point, checks proximity (< 10 meters).
    """
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if not gtype or coords is None:
        return False

    if gtype == "Polygon":
        return point_in_polygon_geometry(point, coords)
    elif gtype == "MultiPolygon":
        return point_in_multipolygon_geometry(point, coords)
    elif gtype == "Point":
        return haversine_distance_meters(point, coords) <= 10.0
    elif gtype in ("LineString", "MultiLineString"):
        return distance_point_to_geometry(point, geometry) <= 25.0
    return False


def distance_point_to_segment(point: List[float], seg_start: List[float], seg_end: List[float]) -> float:
    """Computes approximate distance in meters from point to a line segment."""
    # Approximate local flat-earth projection for short distances
    mean_lat = (seg_start[1] + seg_end[1]) / 2.0
    deg_lat_m = 111132.954
    deg_lng_m = 111412.84 * math.cos(math.radians(mean_lat))

    px = (point[0] - seg_start[0]) * deg_lng_m
    py = (point[1] - seg_start[1]) * deg_lat_m
    dx = (seg_end[0] - seg_start[0]) * deg_lng_m
    dy = (seg_end[1] - seg_start[1]) * deg_lat_m

    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq == 0.0:
        return haversine_distance_meters(point, seg_start)

    t = max(0.0, min(1.0, (px * dx + py * dy) / seg_len_sq))
    proj_x = t * dx
    proj_y = t * dy

    dist_sq = (px - proj_x) ** 2 + (py - proj_y) ** 2
    return math.sqrt(dist_sq)


def distance_point_to_geometry(point: List[float], geometry: Dict[str, Any]) -> float:
    """Computes the minimum distance in meters between a point and any GeoJSON geometry."""
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if not gtype or coords is None:
        return float("inf")

    if gtype == "Point":
        return haversine_distance_meters(point, coords)

    elif gtype == "LineString":
        min_dist = float("inf")
        for i in range(len(coords) - 1):
            d = distance_point_to_segment(point, coords[i], coords[i + 1])
            if d < min_dist:
                min_dist = d
        return min_dist

    elif gtype == "MultiLineString":
        min_dist = float("inf")
        for line in coords:
            for i in range(len(line) - 1):
                d = distance_point_to_segment(point, line[i], line[i + 1])
                if d < min_dist:
                    min_dist = d
        return min_dist

    elif gtype == "Polygon":
        if point_in_polygon_geometry(point, coords):
            return 0.0
        # Distance to exterior boundary
        min_dist = float("inf")
        exterior = coords[0] if len(coords) > 0 else []
        for i in range(len(exterior) - 1):
            d = distance_point_to_segment(point, exterior[i], exterior[i + 1])
            if d < min_dist:
                min_dist = d
        return min_dist

    elif gtype == "MultiPolygon":
        if point_in_multipolygon_geometry(point, coords):
            return 0.0
        min_dist = float("inf")
        for poly in coords:
            exterior = poly[0] if len(poly) > 0 else []
            for i in range(len(exterior) - 1):
                d = distance_point_to_segment(point, exterior[i], exterior[i + 1])
                if d < min_dist:
                    min_dist = d
        return min_dist

    return float("inf")


def geometry_intersects_bbox(geometry: Dict[str, Any], min_lng: float, min_lat: float, max_lng: float, max_lat: float) -> bool:
    """Checks if any vertex or bounding box of geometry overlaps the given BBox."""
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if not coords:
        return False

    def _coord_in_bbox(c: List[float]) -> bool:
        return min_lng <= c[0] <= max_lng and min_lat <= c[1] <= max_lat

    def _extract_all_points(obj: Any) -> List[List[float]]:
        if isinstance(obj, (list, tuple)):
            if len(obj) == 2 and isinstance(obj[0], (int, float)) and isinstance(obj[1], (int, float)):
                return [[float(obj[0]), float(obj[1])]]
            pts = []
            for sub in obj:
                pts.extend(_extract_all_points(sub))
            return pts
        return []

    points = _extract_all_points(coords)
    if any(_coord_in_bbox(p) for p in points):
        return True

    # Check if bbox center is inside polygon
    if gtype in ("Polygon", "MultiPolygon"):
        bbox_center = [(min_lng + max_lng) / 2.0, (min_lat + max_lat) / 2.0]
        if point_in_geojson_geometry(bbox_center, geometry):
            return True

    return False


def compute_geometry_bbox(geometry: Dict[str, Any]) -> List[float]:
    """Returns [min_lng, min_lat, max_lng, max_lat] for any GeoJSON geometry."""
    coords = geometry.get("coordinates")
    if not coords:
        return [0.0, 0.0, 0.0, 0.0]

    min_x, min_y = float("inf"), float("inf")
    max_x, max_y = float("-inf"), float("-inf")

    def _walk(c: Any):
        nonlocal min_x, min_y, max_x, max_y
        if isinstance(c, (list, tuple)):
            if len(c) >= 2 and isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                x, y = float(c[0]), float(c[1])
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
            else:
                for sub in c:
                    _walk(sub)

    _walk(coords)
    if min_x == float("inf"):
        return [0.0, 0.0, 0.0, 0.0]
    return [min_x, min_y, max_x, max_y]


def segments_intersect(p1: List[float], p2: List[float], p3: List[float], p4: List[float]) -> bool:
    """Checks if segment p1-p2 intersects segment p3-p4 using 2D cross products."""
    def ccw(a: List[float], b: List[float], c: List[float]) -> bool:
        return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])

    return (ccw(p1, p3, p4) != ccw(p2, p3, p4)) and (ccw(p1, p2, p3) != ccw(p1, p2, p4))


def distance_geometry_to_geometry(geom1: Dict[str, Any], geom2: Dict[str, Any]) -> float:
    """
    Computes minimum distance in meters between two GeoJSON geometries.
    Returns 0.0 if they intersect or overlap.
    """
    gtype1 = geom1.get("type")
    coords1 = geom1.get("coordinates")
    gtype2 = geom2.get("type")
    coords2 = geom2.get("coordinates")

    if not gtype1 or coords1 is None or not gtype2 or coords2 is None:
        return float("inf")

    # Fast BBox rejection
    bbox1 = compute_geometry_bbox(geom1)
    bbox2 = compute_geometry_bbox(geom2)

    lat_margin = 0.05
    lng_margin = 0.05
    if (
        bbox1[2] < bbox2[0] - lng_margin
        or bbox1[0] > bbox2[2] + lng_margin
        or bbox1[3] < bbox2[1] - lat_margin
        or bbox1[1] > bbox2[3] + lat_margin
    ):
        center1 = [(bbox1[0] + bbox1[2]) / 2.0, (bbox1[1] + bbox1[3]) / 2.0]
        center2 = [(bbox2[0] + bbox2[2]) / 2.0, (bbox2[1] + bbox2[3]) / 2.0]
        return haversine_distance_meters(center1, center2)

    # Point vs Anything
    if gtype1 == "Point":
        return distance_point_to_geometry(coords1, geom2)
    if gtype2 == "Point":
        return distance_point_to_geometry(coords2, geom1)

    def _extract_points(c: Any) -> List[List[float]]:
        if isinstance(c, (list, tuple)):
            if len(c) == 2 and isinstance(c[0], (int, float)) and isinstance(c[1], (int, float)):
                return [[float(c[0]), float(c[1])]]
            pts: List[List[float]] = []
            for sub in c:
                pts.extend(_extract_points(sub))
            return pts
        return []

    pts1 = _extract_points(coords1)
    pts2 = _extract_points(coords2)

    # Check containment of points
    if gtype2 in ("Polygon", "MultiPolygon"):
        for p in pts1:
            if point_in_geojson_geometry(p, geom2):
                return 0.0
    if gtype1 in ("Polygon", "MultiPolygon"):
        for p in pts2:
            if point_in_geojson_geometry(p, geom1):
                return 0.0

    def _extract_segments(g: Dict[str, Any]) -> List[Tuple[List[float], List[float]]]:
        gt = g.get("type")
        c = g.get("coordinates")
        segs: List[Tuple[List[float], List[float]]] = []
        if not c:
            return segs
        if gt == "LineString":
            for i in range(len(c) - 1):
                segs.append((c[i], c[i + 1]))
        elif gt == "MultiLineString":
            for line in c:
                for i in range(len(line) - 1):
                    segs.append((line[i], line[i + 1]))
        elif gt == "Polygon":
            exterior = c[0] if len(c) > 0 else []
            for i in range(len(exterior) - 1):
                segs.append((exterior[i], exterior[i + 1]))
        elif gt == "MultiPolygon":
            for poly in c:
                ext = poly[0] if len(poly) > 0 else []
                for i in range(len(ext) - 1):
                    segs.append((ext[i], ext[i + 1]))
        return segs

    segs1 = _extract_segments(geom1)
    segs2 = _extract_segments(geom2)
    for s1 in segs1:
        for s2 in segs2:
            if segments_intersect(s1[0], s1[1], s2[0], s2[1]):
                return 0.0

    min_dist = float("inf")
    for p in pts1:
        d = distance_point_to_geometry(p, geom2)
        if d < min_dist:
            min_dist = d
            if min_dist <= 0.0:
                return 0.0

    for p in pts2:
        d = distance_point_to_geometry(p, geom1)
        if d < min_dist:
            min_dist = d
            if min_dist <= 0.0:
                return 0.0

    return min_dist

