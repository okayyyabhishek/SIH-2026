"""
Sentinel NER — Consequence Intelligence Engine (Stage 7)
Implements:
1. Spatial exposure analysis between terrain hazard units and infrastructure.
2. Road network proximity, intersection, and chainage linkage.
3. Critical asset exposure classification with authoritative criticality enforcement.
4. Habitation settlement (village) proximity analysis with non-alarmist phrasing.
5. Multi-stage integration linking Stage 5 Risk Predictions & Stage 6 InSAR telemetry.
6. Provenance tracking, uncertainty quantification, and strict non-autonomous boundary guards.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.core.spatial_utils import (
    compute_geometry_bbox,
    distance_geometry_to_geometry,
    geometry_intersects_bbox,
)
from src.schemas.consequence import (
    ASSET_EXPOSURE_TERMINOLOGY,
    CHAINAGE_DATA_UNAVAILABLE_CODE,
    RISK_DATA_UNAVAILABLE_CODE,
    ROAD_EXPOSURE_TERMINOLOGY,
    VILLAGE_EXPOSURE_TERMINOLOGY,
    AssetCriticality,
    ConsequenceCategory,
    ConsequenceConfidence,
    ConsequenceRelationship,
    ConsequenceSourceType,
    ConsequenceTargetType,
    RelationshipStatus,
    SpatialRelationType,
    UncertaintyLevel,
)


class ConsequenceIntelligenceEngine:
    """
    Core Consequence Intelligence Engine.
    Evaluates spatial relationships and operational consequences between
    hazard slope units and infrastructure without taking autonomous actions.
    """

    ALGORITHM_VERSION = "sentinel-consequence-v1.0.0"
    DEFAULT_ROAD_THRESHOLD_METERS = 250.0
    DEFAULT_ASSET_THRESHOLD_METERS = 300.0
    DEFAULT_VILLAGE_THRESHOLD_METERS = 500.0

    def evaluate_slope_unit_to_road(
        self,
        slope_unit: Dict[str, Any],
        road: Dict[str, Any],
        chainages: Optional[List[Dict[str, Any]]] = None,
        distance_threshold_m: float = DEFAULT_ROAD_THRESHOLD_METERS,
        risk_prediction: Optional[Dict[str, Any]] = None,
        insar_observation: Optional[Dict[str, Any]] = None,
    ) -> Optional[ConsequenceRelationship]:
        """
        Evaluates spatial exposure of a road to a slope unit.
        Returns a ConsequenceRelationship if within distance_threshold_m, else None.
        """
        su_geom = slope_unit.get("geometry")
        road_geom = road.get("geometry")
        if not su_geom or not road_geom:
            return None

        # Cross-district boundary guard: Slope unit and road must match district
        if slope_unit.get("district_id") != road.get("district_id"):
            return None

        # Fast BBox pre-filter
        su_bbox = compute_geometry_bbox(su_geom)
        if not geometry_intersects_bbox(road_geom, su_bbox[0] - 0.02, su_bbox[1] - 0.02, su_bbox[2] + 0.02, su_bbox[3] + 0.02):
            return None

        dist = distance_geometry_to_geometry(su_geom, road_geom)
        if dist > distance_threshold_m:
            return None

        now = datetime.now(timezone.utc)
        is_intersect = dist <= 0.0

        spatial_relation = SpatialRelationType.INTERSECTS if is_intersect else SpatialRelationType.NEARBY
        category = (
            ConsequenceCategory.TRANSPORT_CORRIDOR_EXPOSURE
            if str(road.get("road_type")) in ("NATIONAL_HIGHWAY", "STRATEGIC_BORDER_ROAD")
            else ConsequenceCategory.ROAD_EXPOSURE
        )

        # Chainage resolution
        linked_chainage_km: Optional[float] = None
        chainage_status: str = CHAINAGE_DATA_UNAVAILABLE_CODE

        if chainages:
            # Find chainages on this road within distance threshold of slope unit
            road_chainages = [c for c in chainages if c.get("road_id") == road.get("id")]
            if road_chainages:
                closest_c = None
                closest_c_dist = float("inf")
                for c in road_chainages:
                    c_geom = c.get("geometry")
                    if c_geom:
                        cd = distance_geometry_to_geometry(su_geom, c_geom)
                        if cd < closest_c_dist:
                            closest_c_dist = cd
                            closest_c = c

                if closest_c and closest_c_dist <= distance_threshold_m + 100.0:
                    linked_chainage_km = closest_c.get("chainage_km")
                    chainage_status = f"KM_{linked_chainage_km:.1f}"

        # Risk correlation
        risk_pred_id: Optional[str] = None
        risk_level_str: str = RISK_DATA_UNAVAILABLE_CODE
        if risk_prediction:
            risk_pred_id = risk_prediction.get("id")
            # Check temporal validity
            valid_until = risk_prediction.get("valid_until")
            if isinstance(valid_until, datetime) and valid_until < now:
                risk_level_str = f"{risk_prediction.get('risk_level')}_STALE"
            else:
                risk_level_str = str(risk_prediction.get("risk_level", RISK_DATA_UNAVAILABLE_CODE))

        # Satellite/InSAR correlation
        satellite_obs_id: Optional[str] = None
        insar_deform: Optional[float] = None
        if insar_observation:
            satellite_obs_id = insar_observation.get("id")
            stats = insar_observation.get("displacement_statistics", {})
            insar_deform = stats.get("mean_los_mm_yr") or stats.get("max_los_mm_yr")

        # Uncertainty assessment
        uncertainty = UncertaintyLevel.LOW if is_intersect and risk_pred_id else UncertaintyLevel.MEDIUM
        if chainage_status == CHAINAGE_DATA_UNAVAILABLE_CODE:
            uncertainty = UncertaintyLevel.MEDIUM

        confidence = ConsequenceConfidence.HIGH if is_intersect else ConsequenceConfidence.MEDIUM

        evidence_ids = [slope_unit["id"], road["id"]]
        if risk_pred_id:
            evidence_ids.append(risk_pred_id)
        if satellite_obs_id:
            evidence_ids.append(satellite_obs_id)

        chainage_narrative = (
            f"Chainage KM {linked_chainage_km:.1f} identified in exposure zone."
            if linked_chainage_km is not None
            else "Chainage markers not referenced; status: CHAINAGE_DATA_UNAVAILABLE."
        )

        exposure_basis = (
            f"Road {road.get('road_code', 'N/A')} ({road.get('name', 'N/A')}) is POTENTIALLY AFFECTED / SPATIALLY EXPOSED: "
            f"Spatial relation '{spatial_relation.value}' with Slope Unit {slope_unit.get('code', 'N/A')} at {dist:.1f}m distance. "
            f"{chainage_narrative} Stage 5 Risk: {risk_level_str}."
        )

        assumptions = [
            f"Proximity buffer threshold of {distance_threshold_m:.0f}m applied.",
            "Terrain elevation difference and hydraulic runout not modeled; spatial exposure reflects 2D buffer.",
            ROAD_EXPOSURE_TERMINOLOGY,
        ]

        rel_id = f"rel-road-{uuid.uuid4().hex[:12]}"

        return ConsequenceRelationship(
            id=rel_id,
            source_type=ConsequenceSourceType.SLOPE_UNIT,
            source_id=slope_unit["id"],
            source_name=slope_unit.get("code"),
            target_type=ConsequenceTargetType.ROAD,
            target_id=road["id"],
            target_name=road.get("name"),
            target_code=road.get("road_code"),
            relationship_type=category,
            spatial_relation=spatial_relation,
            distance_meters=round(dist, 1),
            intersection_ratio=1.0 if is_intersect else None,
            exposure_basis=exposure_basis,
            evidence_ids=evidence_ids,
            risk_prediction_id=risk_pred_id,
            risk_level=risk_level_str,
            satellite_observation_id=satellite_obs_id,
            insar_deformation_mm_yr=insar_deform,
            criticality=AssetCriticality.UNKNOWN,
            confidence=confidence,
            uncertainty=uncertainty,
            assumptions=assumptions,
            organization_id=road.get("authority_organization_id"),
            chainage_km=linked_chainage_km,
            chainage_status=chainage_status,
            district_id=slope_unit.get("district_id"),
            state_code=slope_unit.get("state_code", "MZ"),
            generated_at=now,
            valid_from=now,
            algorithm_version=self.ALGORITHM_VERSION,
            status=RelationshipStatus.ACTIVE,
            metadata={"threshold_m": distance_threshold_m, "operational_status": road.get("operational_status")},
        )

    def evaluate_slope_unit_to_asset(
        self,
        slope_unit: Dict[str, Any],
        asset: Dict[str, Any],
        distance_threshold_m: float = DEFAULT_ASSET_THRESHOLD_METERS,
        risk_prediction: Optional[Dict[str, Any]] = None,
        insar_observation: Optional[Dict[str, Any]] = None,
    ) -> Optional[ConsequenceRelationship]:
        """
        Evaluates spatial exposure of a facility/lifeline asset to a slope unit.
        """
        su_geom = slope_unit.get("geometry")
        asset_geom = asset.get("geometry")
        if not su_geom or not asset_geom:
            return None

        # Cross-district boundary guard
        if slope_unit.get("district_id") != asset.get("district_id"):
            return None

        # BBox pre-filter
        su_bbox = compute_geometry_bbox(su_geom)
        if not geometry_intersects_bbox(asset_geom, su_bbox[0] - 0.02, su_bbox[1] - 0.02, su_bbox[2] + 0.02, su_bbox[3] + 0.02):
            return None

        dist = distance_geometry_to_geometry(su_geom, asset_geom)
        if dist > distance_threshold_m:
            return None

        now = datetime.now(timezone.utc)
        is_intersect = dist <= 0.0
        spatial_relation = SpatialRelationType.INTERSECTS if is_intersect else SpatialRelationType.NEARBY

        # Criticality mapping: strictly from authoritative metadata
        raw_criticality = (asset.get("metadata") or {}).get("criticality")
        criticality = AssetCriticality.UNKNOWN
        if raw_criticality:
            try:
                criticality = AssetCriticality(str(raw_criticality).upper())
            except ValueError:
                criticality = AssetCriticality.UNKNOWN

        category = (
            ConsequenceCategory.CRITICAL_INFRASTRUCTURE_EXPOSURE
            if criticality in (AssetCriticality.HIGH, AssetCriticality.CRITICAL)
            else ConsequenceCategory.ASSET_EXPOSURE
        )

        risk_pred_id: Optional[str] = None
        risk_level_str: str = RISK_DATA_UNAVAILABLE_CODE
        if risk_prediction:
            risk_pred_id = risk_prediction.get("id")
            risk_level_str = str(risk_prediction.get("risk_level", RISK_DATA_UNAVAILABLE_CODE))

        satellite_obs_id: Optional[str] = None
        insar_deform: Optional[float] = None
        if insar_observation:
            satellite_obs_id = insar_observation.get("id")
            stats = insar_observation.get("displacement_statistics", {})
            insar_deform = stats.get("mean_los_mm_yr") or stats.get("max_los_mm_yr")

        uncertainty = UncertaintyLevel.LOW if (is_intersect and criticality != AssetCriticality.UNKNOWN) else UncertaintyLevel.MEDIUM
        confidence = ConsequenceConfidence.HIGH if is_intersect else ConsequenceConfidence.MEDIUM

        evidence_ids = [slope_unit["id"], asset["id"]]
        if risk_pred_id:
            evidence_ids.append(risk_pred_id)
        if satellite_obs_id:
            evidence_ids.append(satellite_obs_id)

        exposure_basis = (
            f"Asset '{asset.get('name', 'N/A')}' ({asset.get('asset_type', 'N/A')}) is POTENTIALLY EXPOSED: "
            f"Spatial relation '{spatial_relation.value}' with Slope Unit {slope_unit.get('code', 'N/A')} at {dist:.1f}m. "
            f"Criticality: {criticality.value}. Operational status remains {asset.get('operational_status', 'OPERATIONAL')}."
        )

        assumptions = [
            f"Proximity buffer threshold of {distance_threshold_m:.0f}m applied.",
            "Potential spatial exposure does NOT imply physical structural failure or outage.",
            ASSET_EXPOSURE_TERMINOLOGY,
        ]

        rel_id = f"rel-asset-{uuid.uuid4().hex[:12]}"

        return ConsequenceRelationship(
            id=rel_id,
            source_type=ConsequenceSourceType.SLOPE_UNIT,
            source_id=slope_unit["id"],
            source_name=slope_unit.get("code"),
            target_type=ConsequenceTargetType.ASSET,
            target_id=asset["id"],
            target_name=asset.get("name"),
            target_code=asset.get("asset_type"),
            relationship_type=category,
            spatial_relation=spatial_relation,
            distance_meters=round(dist, 1),
            intersection_ratio=1.0 if is_intersect else None,
            exposure_basis=exposure_basis,
            evidence_ids=evidence_ids,
            risk_prediction_id=risk_pred_id,
            risk_level=risk_level_str,
            satellite_observation_id=satellite_obs_id,
            insar_deformation_mm_yr=insar_deform,
            criticality=criticality,
            confidence=confidence,
            uncertainty=uncertainty,
            assumptions=assumptions,
            organization_id=asset.get("organization_id"),
            chainage_km=None,
            chainage_status=CHAINAGE_DATA_UNAVAILABLE_CODE,
            district_id=slope_unit.get("district_id"),
            state_code=slope_unit.get("state_code", "MZ"),
            generated_at=now,
            valid_from=now,
            algorithm_version=self.ALGORITHM_VERSION,
            status=RelationshipStatus.ACTIVE,
            metadata={"asset_type": asset.get("asset_type"), "operational_status": asset.get("operational_status")},
        )

    def evaluate_slope_unit_to_village(
        self,
        slope_unit: Dict[str, Any],
        village: Dict[str, Any],
        distance_threshold_m: float = DEFAULT_VILLAGE_THRESHOLD_METERS,
        risk_prediction: Optional[Dict[str, Any]] = None,
        insar_observation: Optional[Dict[str, Any]] = None,
    ) -> Optional[ConsequenceRelationship]:
        """
        Evaluates spatial proximity of a habitation settlement (village) to a slope unit.
        """
        su_geom = slope_unit.get("geometry")
        village_geom = village.get("geometry")
        if not su_geom or not village_geom:
            return None

        # Cross-district boundary guard
        if slope_unit.get("district_id") != village.get("district_id"):
            return None

        # BBox pre-filter
        su_bbox = compute_geometry_bbox(su_geom)
        if not geometry_intersects_bbox(village_geom, su_bbox[0] - 0.02, su_bbox[1] - 0.02, su_bbox[2] + 0.02, su_bbox[3] + 0.02):
            return None

        dist = distance_geometry_to_geometry(su_geom, village_geom)
        if dist > distance_threshold_m:
            return None

        now = datetime.now(timezone.utc)
        is_intersect = dist <= 0.0
        spatial_relation = SpatialRelationType.INTERSECTS if is_intersect else SpatialRelationType.NEARBY

        risk_pred_id: Optional[str] = None
        risk_level_str: str = RISK_DATA_UNAVAILABLE_CODE
        if risk_prediction:
            risk_pred_id = risk_prediction.get("id")
            risk_level_str = str(risk_prediction.get("risk_level", RISK_DATA_UNAVAILABLE_CODE))

        satellite_obs_id: Optional[str] = None
        insar_deform: Optional[float] = None
        if insar_observation:
            satellite_obs_id = insar_observation.get("id")
            stats = insar_observation.get("displacement_statistics", {})
            insar_deform = stats.get("mean_los_mm_yr") or stats.get("max_los_mm_yr")

        uncertainty = UncertaintyLevel.LOW if (is_intersect and risk_pred_id) else UncertaintyLevel.MEDIUM
        confidence = ConsequenceConfidence.HIGH if is_intersect else ConsequenceConfidence.MEDIUM

        evidence_ids = [slope_unit["id"], village["id"]]
        if risk_pred_id:
            evidence_ids.append(risk_pred_id)
        if satellite_obs_id:
            evidence_ids.append(satellite_obs_id)

        pop_str = f" (Population: {village.get('population')})" if village.get("population") is not None else ""
        exposure_basis = (
            f"Village '{village.get('name', 'N/A')}'{pop_str} is SPATIALLY EXPOSED / PROXIMITY IDENTIFIED: "
            f"Located {dist:.1f}m from Slope Unit {slope_unit.get('code', 'N/A')}. "
            f"Settlement is NOT classified as unsafe; operational disaster status remains {village.get('status', 'ACTIVE')}."
        )

        assumptions = [
            f"Proximity buffer threshold of {distance_threshold_m:.0f}m applied.",
            "Proximity denotes spatial geographic relationship only; no evacuation order is inferred or issued.",
            VILLAGE_EXPOSURE_TERMINOLOGY,
        ]

        rel_id = f"rel-village-{uuid.uuid4().hex[:12]}"

        return ConsequenceRelationship(
            id=rel_id,
            source_type=ConsequenceSourceType.SLOPE_UNIT,
            source_id=slope_unit["id"],
            source_name=slope_unit.get("code"),
            target_type=ConsequenceTargetType.VILLAGE,
            target_id=village["id"],
            target_name=village.get("name"),
            target_code=village.get("village_code"),
            relationship_type=ConsequenceCategory.VILLAGE_PROXIMITY,
            spatial_relation=spatial_relation,
            distance_meters=round(dist, 1),
            intersection_ratio=1.0 if is_intersect else None,
            exposure_basis=exposure_basis,
            evidence_ids=evidence_ids,
            risk_prediction_id=risk_pred_id,
            risk_level=risk_level_str,
            satellite_observation_id=satellite_obs_id,
            insar_deformation_mm_yr=insar_deform,
            criticality=AssetCriticality.UNKNOWN,
            confidence=confidence,
            uncertainty=uncertainty,
            assumptions=assumptions,
            organization_id=None,
            chainage_km=None,
            chainage_status=CHAINAGE_DATA_UNAVAILABLE_CODE,
            district_id=slope_unit.get("district_id"),
            state_code=slope_unit.get("state_code", "MZ"),
            generated_at=now,
            valid_from=now,
            algorithm_version=self.ALGORITHM_VERSION,
            status=RelationshipStatus.ACTIVE,
            metadata={"population": village.get("population"), "village_status": village.get("status")},
        )

    def execute_consequence_analysis(
        self,
        district_id: str,
        slope_units: List[Dict[str, Any]],
        roads: List[Dict[str, Any]],
        chainages: List[Dict[str, Any]],
        assets: List[Dict[str, Any]],
        villages: List[Dict[str, Any]],
        risk_predictions: Optional[List[Dict[str, Any]]] = None,
        insar_observations: Optional[List[Dict[str, Any]]] = None,
        distance_threshold_m: float = 300.0,
    ) -> List[ConsequenceRelationship]:
        """
        Executes bounded, reproducible pairwise spatial consequence intelligence
        for all entities in a given district scope.
        """
        relationships: List[ConsequenceRelationship] = []

        # Index risk predictions by slope unit ID
        risk_by_su: Dict[str, Dict[str, Any]] = {}
        if risk_predictions:
            for rp in risk_predictions:
                if rp.get("subject_type") == "SLOPE_UNIT" or rp.get("subject_id"):
                    risk_by_su[rp["subject_id"]] = rp

        # Index InSAR observations by slope unit ID
        insar_by_su: Dict[str, Dict[str, Any]] = {}
        if insar_observations:
            for obs in insar_observations:
                for su_code_or_id in obs.get("intersected_slope_units", []):
                    insar_by_su[su_code_or_id] = obs

        for su in slope_units:
            su_id = su["id"]
            su_code = su.get("code")
            risk_pred = risk_by_su.get(su_id) or (risk_by_su.get(su_code) if su_code else None)
            insar_obs = insar_by_su.get(su_id) or (insar_by_su.get(su_code) if su_code else None)

            # 1. Roads
            for road in roads:
                rel = self.evaluate_slope_unit_to_road(
                    slope_unit=su,
                    road=road,
                    chainages=chainages,
                    distance_threshold_m=min(distance_threshold_m, 250.0),
                    risk_prediction=risk_pred,
                    insar_observation=insar_obs,
                )
                if rel:
                    relationships.append(rel)

            # 2. Assets
            for asset in assets:
                rel = self.evaluate_slope_unit_to_asset(
                    slope_unit=su,
                    asset=asset,
                    distance_threshold_m=min(distance_threshold_m, 300.0),
                    risk_prediction=risk_pred,
                    insar_observation=insar_obs,
                )
                if rel:
                    relationships.append(rel)

            # 3. Villages
            for village in villages:
                rel = self.evaluate_slope_unit_to_village(
                    slope_unit=su,
                    village=village,
                    distance_threshold_m=min(distance_threshold_m, 500.0),
                    risk_prediction=risk_pred,
                    insar_observation=insar_obs,
                )
                if rel:
                    relationships.append(rel)

        return relationships


consequence_engine = ConsequenceIntelligenceEngine()
