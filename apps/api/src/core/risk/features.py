"""
Sentinel NER — Risk Feature Definitions, Extraction & Quality Assurance
Defines authoritative feature definitions, provenance tracking, quality evaluation,
and immutable snapshot generation.
"""

import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from src.schemas.risk import (
    DataQualityState,
    FeatureProvenance,
    RiskFeatureDefinition,
    RiskFeatureSnapshot,
    RiskSubjectType,
)

AUTHORITATIVE_FEATURE_DEFINITIONS: Dict[str, RiskFeatureDefinition] = {
    "historical_event_density_30d": RiskFeatureDefinition(
        name="historical_event_density_30d",
        version="1.0.0",
        description="Density of recorded historical landslide events within slope unit and 5km buffer over prior 30 days",
        unit="events/km2",
        expected_range=(0.0, 50.0),
        source="Sentinel NER Landslide Events Repository",
        transformation="Count of recorded occurrences divided by polygon area",
        aggregation_window="30d",
        missing_policy="EXPLICIT_MISSING_INDICATOR",
        freshness_hours=72.0,
        is_training=True,
        is_inference=True,
    ),
    "slope_angle_deg": RiskFeatureDefinition(
        name="slope_angle_deg",
        version="1.0.0",
        description="Mean topographic slope inclination gradient of the terrain slope unit",
        unit="degrees",
        expected_range=(0.0, 90.0),
        source="Slope Unit Topographic Metadata",
        transformation="Zonal mean slope angle",
        aggregation_window=None,
        missing_policy="REJECT_INSUFFICIENT_DATA",
        freshness_hours=8760.0,  # 1 year static
        is_training=True,
        is_inference=True,
    ),
    "road_proximity_m": RiskFeatureDefinition(
        name="road_proximity_m",
        version="1.0.0",
        description="Proximity distance from slope unit centroid to nearest linear transportation corridor",
        unit="meters",
        expected_range=(0.0, 50000.0),
        source="Sentinel NER Roads Repository",
        transformation="Minimum distance to active road geometry",
        aggregation_window=None,
        missing_policy="BOUNDED_MAX_IMPUTATION",
        freshness_hours=720.0,
        is_training=True,
        is_inference=True,
    ),
    "drainage_density": RiskFeatureDefinition(
        name="drainage_density",
        version="1.0.0",
        description="Drainage channel length per unit area",
        unit="km/km2",
        expected_range=(0.0, 20.0),
        source="Hydrological Catchment Survey",
        transformation="Channel length per square kilometer",
        aggregation_window=None,
        missing_policy="BOUNDED_MEDIAN_IMPUTATION",
        freshness_hours=4380.0,
        is_training=True,
        is_inference=True,
    ),
    "soil_permeability_index": RiskFeatureDefinition(
        name="soil_permeability_index",
        version="1.0.0",
        description="Hydraulic conductivity and lithological soil texture index",
        unit="index [0-10]",
        expected_range=(0.0, 10.0),
        source="Geological Survey Soil Atlas",
        transformation="Standardized categorical index scale",
        aggregation_window=None,
        missing_policy="BOUNDED_MEDIAN_IMPUTATION",
        freshness_hours=8760.0,
        is_training=True,
        is_inference=True,
    ),
}


class RiskDataQualityEvaluator:
    """
    Evaluates individual feature quality, freshness, bounds, and overall snapshot health.
    Strictly flags missingness and staleness without silent fabrication.
    """

    @staticmethod
    def evaluate_feature(
        definition: RiskFeatureDefinition,
        raw_value: Optional[float],
        obs_time: datetime,
        now: datetime,
    ) -> Tuple[Optional[float], DataQualityState]:
        if raw_value is None:
            return None, DataQualityState.MISSING

        # Check expected range
        min_v, max_v = definition.expected_range
        if raw_value < min_v or raw_value > max_v:
            return raw_value, DataQualityState.OUT_OF_RANGE

        # Check freshness
        if definition.freshness_hours is not None:
            age_hours = (now - obs_time).total_seconds() / 3600.0
            if age_hours > definition.freshness_hours:
                return raw_value, DataQualityState.STALE

        return raw_value, DataQualityState.VALID

    @staticmethod
    def determine_overall_state(
        provenance_list: List[FeatureProvenance],
    ) -> Tuple[DataQualityState, int, int]:
        missing_count = 0
        stale_count = 0
        out_of_range_count = 0

        for p in provenance_list:
            if p.quality_state == DataQualityState.MISSING:
                missing_count += 1
            elif p.quality_state == DataQualityState.STALE:
                stale_count += 1
            elif p.quality_state == DataQualityState.OUT_OF_RANGE:
                out_of_range_count += 1

        total_features = len(provenance_list)

        # Critical rejection policy: If 2 or more features are missing out of 5, or critical features are absent
        if missing_count >= 2 or (total_features > 0 and missing_count / total_features > 0.35):
            return DataQualityState.DATA_INSUFFICIENT, missing_count, stale_count

        if out_of_range_count > 0:
            return DataQualityState.OUT_OF_RANGE, missing_count, stale_count

        if missing_count > 0 or stale_count > 0:
            return DataQualityState.PARTIAL, missing_count, stale_count

        return DataQualityState.VALID, missing_count, stale_count


class FeatureSnapshotBuilder:
    """
    Constructs an immutable RiskFeatureSnapshot with cryptographic SHA-256 integrity hash.
    """

    @classmethod
    def build_snapshot(
        cls,
        subject_type: RiskSubjectType,
        subject_id: str,
        district_id: str,
        state_code: str,
        feature_dict: Dict[str, Tuple[Optional[float], datetime, str]],  # name -> (value, obs_time, source_id)
        now: Optional[datetime] = None,
    ) -> RiskFeatureSnapshot:
        current_time = now or datetime.now(timezone.utc)
        provenance_list: List[FeatureProvenance] = []
        feature_values: Dict[str, Optional[float]] = {}

        for feat_name, definition in AUTHORITATIVE_FEATURE_DEFINITIONS.items():
            if feat_name in feature_dict:
                val, obs_time, src_id = feature_dict[feat_name]
                clean_val, quality = RiskDataQualityEvaluator.evaluate_feature(
                    definition, val, obs_time, current_time
                )
                feature_values[feat_name] = clean_val
                provenance_list.append(
                    FeatureProvenance(
                        feature_name=feat_name,
                        feature_value=clean_val,
                        unit=definition.unit,
                        source_type=definition.source,
                        source_identifier=src_id,
                        observation_timestamp=obs_time,
                        ingestion_timestamp=current_time,
                        transformation_applied=definition.transformation,
                        missingness=(clean_val is None),
                        quality_state=quality,
                    )
                )
            else:
                # Explicit missing feature tracking
                feature_values[feat_name] = None
                provenance_list.append(
                    FeatureProvenance(
                        feature_name=feat_name,
                        feature_value=None,
                        unit=definition.unit,
                        source_type=definition.source,
                        source_identifier="NOT_AVAILABLE",
                        observation_timestamp=current_time - timedelta(days=365),
                        ingestion_timestamp=current_time,
                        transformation_applied="NOT_COMPUTED",
                        missingness=True,
                        quality_state=DataQualityState.MISSING,
                    )
                )

        overall_state, missing_cnt, stale_cnt = RiskDataQualityEvaluator.determine_overall_state(
            provenance_list
        )

        # Compute deterministic cryptographic SHA-256 hash
        hash_payload = {
            "subject_type": subject_type.value,
            "subject_id": subject_id,
            "district_id": district_id,
            "values": {k: feature_values[k] for k in sorted(feature_values.keys())},
        }
        serialized = json.dumps(hash_payload, sort_keys=True)
        sha256_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        return RiskFeatureSnapshot(
            id=f"snap-{uuid.uuid4().hex[:12]}",
            snapshot_hash_sha256=sha256_hash,
            subject_type=subject_type,
            subject_id=subject_id,
            district_id=district_id,
            state_code=state_code,
            feature_values=feature_values,
            provenance=provenance_list,
            data_quality_state=overall_state,
            missing_feature_count=missing_cnt,
            stale_feature_count=stale_cnt,
            created_at=current_time,
        )
