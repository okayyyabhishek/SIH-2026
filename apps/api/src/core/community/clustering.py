"""
Sentinel NER — Stage 10 Community Event Clustering Engine
Groups geographically and temporally proximate reports into explainable clusters.
CRITICAL AXIOM: Clustering indicates observation density and triggers human review;
it NEVER constitutes automatic confirmation of a landslide event.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from uuid import uuid4

from src.schemas.community import CitizenReport, CommunityEventCluster, ReportCategory
from src.schemas.geojson import GeoJSONPoint


def haversine_distance_meters(coord1: List[float], coord2: List[float]) -> float:
    """Calculates great-circle distance between two [lng, lat] coordinates in meters."""
    lng1, lat1 = coord1[0], coord1[1]
    lng2, lat2 = coord2[0], coord2[1]
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class CommunityClusteringEngine:
    """
    Explainable clustering of ground-truth community observation reports.
    """

    DEFAULT_MAX_DISTANCE_METERS = 750.0
    DEFAULT_MAX_TIME_DELTA_HOURS = 12.0

    @classmethod
    def generate_clusters(
        cls,
        reports: List[CitizenReport],
        max_distance_m: float = DEFAULT_MAX_DISTANCE_METERS,
        max_time_hours: float = DEFAULT_MAX_TIME_DELTA_HOURS,
    ) -> List[CommunityEventCluster]:
        """
        Groups reports into explainable clusters.
        Filters out already resolved/rejected reports.
        """
        active_reports = [
            r for r in reports
            if r.status not in ("REJECTED", "RESOLVED") and r.location and r.location.coordinates
        ]

        if not active_reports:
            return []

        clusters: List[CommunityEventCluster] = []
        assigned_report_ids = set()

        for i, rep in enumerate(active_reports):
            if rep.id in assigned_report_ids:
                continue

            current_group: List[CitizenReport] = [rep]
            assigned_report_ids.add(rep.id)

            c1 = rep.location.coordinates
            t1 = rep.reported_at

            for other in active_reports[i + 1:]:
                if other.id in assigned_report_ids:
                    continue
                # District and category match or similarity
                if other.district_id != rep.district_id:
                    continue

                c2 = other.location.coordinates
                t2 = other.reported_at

                dist = haversine_distance_meters(c1, c2)
                time_diff = abs((t2 - t1).total_seconds()) / 3600.0

                if dist <= max_distance_m and time_diff <= max_time_hours:
                    current_group.append(other)
                    assigned_report_ids.add(other.id)

            # Only form cluster if >= 2 reports or single high-confidence report
            if len(current_group) >= 2:
                # Calculate geographic centroid
                avg_lng = sum(r.location.coordinates[0] for r in current_group) / len(current_group)
                avg_lat = sum(r.location.coordinates[1] for r in current_group) / len(current_group)

                # Calculate max spread radius from centroid
                max_radius = max(
                    haversine_distance_meters([avg_lng, avg_lat], r.location.coordinates)
                    for r in current_group
                )
                max_radius = max(max_radius, 25.0)  # minimum 25m footprint

                first_dt = min(r.reported_at for r in current_group)
                last_dt = max(r.reported_at for r in current_group)
                span_hours = max((last_dt - first_dt).total_seconds() / 3600.0, 0.1)

                cat = rep.category
                # Explainable confidence calculation (capped at 0.85; 1.0 reserved strictly for field verified truth)
                base_conf = min(0.4 + (len(current_group) * 0.1), 0.85)

                cluster_code = f"CLUSTER-{rep.district_id}-{cat.value[:4]}-{uuid4().hex[:6].upper()}"
                explanation = (
                    f"Cluster formed from {len(current_group)} {cat.value} reports "
                    f"within {max_radius:.1f}m spatial radius over {span_hours:.1f} hours. "
                    f"Status: REQUIRES REVIEW (Cluster does not verify reports)."
                )

                cluster = CommunityEventCluster(
                    id=f"cls-{uuid4().hex[:12]}",
                    cluster_code=cluster_code,
                    district_id=rep.district_id,
                    center_point=GeoJSONPoint(coordinates=[avg_lng, avg_lat]),
                    radius_meters=round(max_radius, 1),
                    category=cat,
                    report_ids=[r.id for r in current_group],
                    report_count=len(current_group),
                    confidence_score=round(base_conf, 2),
                    explanation=explanation,
                    first_reported_at=first_dt,
                    last_reported_at=last_dt,
                    status="REQUIRES_REVIEW",
                )
                clusters.append(cluster)

        return clusters

    @classmethod
    def detect_clusters(
        cls,
        reports: List[CitizenReport],
        max_distance_meters: float = DEFAULT_MAX_DISTANCE_METERS,
        max_time_window_hours: float = DEFAULT_MAX_TIME_DELTA_HOURS,
        min_cluster_size: int = 2,
    ) -> List[CommunityEventCluster]:
        return cls.generate_clusters(
            reports=reports,
            max_distance_m=max_distance_meters,
            max_time_hours=max_time_window_hours,
        )
