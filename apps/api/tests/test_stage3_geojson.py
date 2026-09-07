"""
Stage 3 GeoJSON Validation Test Suite
Tests all 16 required geometry test matrix cases and spatial geometry validation rules.
"""

import pytest
from pydantic import ValidationError

from src.schemas.geojson import (
    GeoJSONLineString,
    GeoJSONMultiLineString,
    GeoJSONMultiPolygon,
    GeoJSONPoint,
    GeoJSONPolygon,
    validate_geojson_dict,
)


class TestGeoJSONMatrix:
    # 1. Valid Point
    def test_01_valid_point(self):
        geom = GeoJSONPoint(type="Point", coordinates=[92.7176, 23.7271])
        assert geom.type == "Point"
        assert geom.coordinates == [92.7176, 23.7271]
        assert geom.longitude == 92.7176
        assert geom.latitude == 23.7271

    # 2. Valid LineString
    def test_02_valid_linestring(self):
        geom = GeoJSONLineString(
            type="LineString",
            coordinates=[[92.71, 23.72], [92.72, 23.73], [92.73, 23.74]],
        )
        assert geom.type == "LineString"
        assert len(geom.coordinates) == 3

    # 3. Valid Polygon (closed ring)
    def test_03_valid_polygon(self):
        geom = GeoJSONPolygon(
            type="Polygon",
            coordinates=[
                [
                    [92.70, 23.70],
                    [92.75, 23.70],
                    [92.75, 23.75],
                    [92.70, 23.75],
                    [92.70, 23.70],
                ]
            ],
        )
        assert geom.type == "Polygon"
        assert len(geom.coordinates[0]) == 5

    # 4. Valid MultiPolygon
    def test_04_valid_multipolygon(self):
        geom = GeoJSONMultiPolygon(
            type="MultiPolygon",
            coordinates=[
                [
                    [
                        [92.70, 23.70],
                        [92.75, 23.70],
                        [92.75, 23.75],
                        [92.70, 23.75],
                        [92.70, 23.70],
                    ]
                ]
            ],
        )
        assert geom.type == "MultiPolygon"
        assert len(geom.coordinates) == 1

    # 5. Missing coordinates
    def test_05_missing_coordinates(self):
        with pytest.raises((ValidationError, ValueError)):
            validate_geojson_dict({"type": "Point"})

    # 6. Latitude > 90
    def test_06_latitude_above_90(self):
        with pytest.raises(ValidationError, match=r"(?i)latitude"):
            GeoJSONPoint(type="Point", coordinates=[92.7176, 90.001])

    # 7. Latitude < -90
    def test_07_latitude_below_minus_90(self):
        with pytest.raises(ValidationError, match=r"(?i)latitude"):
            GeoJSONPoint(type="Point", coordinates=[92.7176, -90.001])

    # 8. Longitude > 180
    def test_08_longitude_above_180(self):
        with pytest.raises(ValidationError, match=r"(?i)longitude"):
            GeoJSONPoint(type="Point", coordinates=[180.001, 23.7271])

    # 9. Longitude < -180
    def test_09_longitude_below_minus_180(self):
        with pytest.raises(ValidationError, match=r"(?i)longitude"):
            GeoJSONPoint(type="Point", coordinates=[-180.001, 23.7271])

    # 10. NaN in coordinates
    def test_10_nan_coordinates(self):
        with pytest.raises(ValidationError, match="finite"):
            GeoJSONPoint(type="Point", coordinates=[float("nan"), 23.7271])

    # 11. Infinity in coordinates
    def test_11_infinity_coordinates(self):
        with pytest.raises(ValidationError, match="finite"):
            GeoJSONPoint(type="Point", coordinates=[float("inf"), 23.7271])

    # 12. Malformed GeoJSON
    def test_12_malformed_geojson(self):
        with pytest.raises((ValidationError, ValueError)):
            validate_geojson_dict("not-a-dictionary")

    # 13. Unsupported geometry type
    def test_13_unsupported_geometry_type(self):
        with pytest.raises((ValidationError, ValueError), match="Unsupported or invalid GeoJSON"):
            validate_geojson_dict({"type": "GeometryCollection", "geometries": []})

    # 14. Empty geometry coordinates
    def test_14_empty_coordinates(self):
        with pytest.raises(ValidationError):
            GeoJSONLineString(type="LineString", coordinates=[])

    # 15. Oversized geometry (exceeds vertex limit)
    def test_15_oversized_geometry(self):
        coords = [[92.0 + (i * 0.0001), 23.0 + (i * 0.0001)] for i in range(10005)]
        with pytest.raises(ValidationError, match="vertex limit"):
            GeoJSONLineString(type="LineString", coordinates=coords)

    # 16. Wrong coordinate nesting / unclosed polygon
    def test_16_wrong_coordinate_nesting_and_unclosed_polygon(self):
        # 16a: Unclosed polygon ring
        with pytest.raises(ValidationError, match="not closed"):
            GeoJSONPolygon(
                type="Polygon",
                coordinates=[
                    [
                        [92.70, 23.70],
                        [92.75, 23.70],
                        [92.75, 23.75],
                        [92.70, 23.75],
                    ]
                ],
            )

        # 16b: LineString with single coordinate
        with pytest.raises(ValidationError, match="at least 2 coordinate pairs"):
            GeoJSONLineString(type="LineString", coordinates=[[92.70, 23.70]])

    def test_valid_multilinestring(self):
        geom = GeoJSONMultiLineString(
            type="MultiLineString",
            coordinates=[
                [[92.71, 23.72], [92.72, 23.73]],
                [[92.74, 23.75], [92.75, 23.76]],
            ],
        )
        assert geom.type == "MultiLineString"
        assert len(geom.coordinates) == 2

    def test_geojson_discriminator_parse(self):
        parsed = validate_geojson_dict({"type": "Point", "coordinates": [92.7, 23.7]})
        assert isinstance(parsed, GeoJSONPoint)

        poly_data = {
            "type": "Polygon",
            "coordinates": [
                [
                    [92.70, 23.70],
                    [92.75, 23.70],
                    [92.75, 23.75],
                    [92.70, 23.75],
                    [92.70, 23.70],
                ]
            ],
        }
        parsed_poly = validate_geojson_dict(poly_data)
        assert isinstance(parsed_poly, GeoJSONPolygon)
