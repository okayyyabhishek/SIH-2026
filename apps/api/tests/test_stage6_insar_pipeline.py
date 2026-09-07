"""
Sentinel NER — Stage 6 InSAR Pipeline, Coherence & Processing Tests
Verifies:
1. Interferometric pair validation rules (SLC required, pass direction match, mode match).
2. Temporal inversion prevention (secondary acquisition must succeed primary).
3. Perpendicular baseline constraint (B_perp <= 500m; degradation when exceeded).
4. End-to-end execution of InSAR processing jobs with GeoTIFF checksum recording.
5. Spatial intersection with Stage 3 slope units and non-causal attribution.
"""

from datetime import datetime, timezone

import pytest

from src.core.errors import ValidationException
from src.core.satellite.pipeline import satellite_pipeline
from src.core.satellite.storage import satellite_storage
from src.schemas.satellite import (
    AcquisitionMode,
    InstrumentType,
    JobStatus,
    PassDirection,
    Polarization,
    ProcessingLevel,
    ProductType,
    ProvenanceState,
    QualityState,
    SatelliteMission,
    SatelliteObservation,
    SatellitePlatform,
    SatelliteProcessingRun,
)


class TestStage6InSARPipeline:
    def _create_sample_obs(
        self,
        obs_id: str,
        acq_time: datetime,
        prod_type: ProductType = ProductType.SLC,
        pass_dir: PassDirection = PassDirection.ASCENDING,
        mode: AcquisitionMode = AcquisitionMode.IW,
    ) -> SatelliteObservation:
        return SatelliteObservation(
            id=obs_id,
            mission=SatelliteMission.SENTINEL_1,
            platform=SatellitePlatform.SENTINEL_1A,
            instrument=InstrumentType.C_SAR,
            product_type=prod_type,
            product_id=f"S1A_IW_{prod_type.value}__{obs_id}",
            acquisition_time=acq_time,
            processing_time=acq_time,
            orbit_number=57000,
            relative_orbit=121,
            pass_direction=pass_dir,
            polarization=Polarization.VV_VH,
            mode=mode,
            footprint={"type": "Polygon", "coordinates": [[[92.7, 23.7], [93.0, 23.7], [93.0, 24.0], [92.7, 24.0], [92.7, 23.7]]]},
            bbox=[92.7, 23.7, 93.0, 24.0],
            source_catalog="COPERNICUS_DATASPACE",
            source_checksum="abc123hash",
            spatial_reference="EPSG:4326",
            temporal_reference="UTC",
            processing_level=ProcessingLevel.LEVEL_1_SLC if prod_type == ProductType.SLC else ProcessingLevel.LEVEL_1_GRD,
            quality_state=QualityState.VALID,
            provenance_state=ProvenanceState.DETERMINISTIC_TEST_FIXTURE,
            district_id="dst-aizawl",
            state="Mizoram",
            created_at=acq_time,
        )

    def test_insar_pair_validation_rejects_non_slc(self):
        t1 = datetime(2025, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2025, 1, 22, 0, 0, 0, tzinfo=timezone.utc)
        obs_grd = self._create_sample_obs("obs-grd", t1, prod_type=ProductType.GRD)
        obs_slc = self._create_sample_obs("obs-slc", t2, prod_type=ProductType.SLC)

        with pytest.raises(ValidationException, match="Single Look Complex"):
            satellite_pipeline.validate_insar_pair(obs_grd, obs_slc, perpendicular_baseline=50.0)

    def test_insar_pair_validation_rejects_pass_direction_mismatch(self):
        t1 = datetime(2025, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2025, 1, 22, 0, 0, 0, tzinfo=timezone.utc)
        obs_asc = self._create_sample_obs("obs-asc", t1, pass_dir=PassDirection.ASCENDING)
        obs_desc = self._create_sample_obs("obs-desc", t2, pass_dir=PassDirection.DESCENDING)

        with pytest.raises(ValidationException, match="Pass direction mismatch"):
            satellite_pipeline.validate_insar_pair(obs_asc, obs_desc, perpendicular_baseline=50.0)

    def test_insar_pair_validation_rejects_temporal_inversion(self):
        t1 = datetime(2025, 1, 22, 0, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2025, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
        obs_late = self._create_sample_obs("obs-late", t1)
        obs_early = self._create_sample_obs("obs-early", t2)

        with pytest.raises(ValidationException, match="Temporal inversion error"):
            satellite_pipeline.validate_insar_pair(obs_late, obs_early, perpendicular_baseline=50.0)

    def test_insar_pair_validation_handles_critical_perpendicular_baseline(self):
        t1 = datetime(2025, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2025, 1, 22, 0, 0, 0, tzinfo=timezone.utc)
        obs1 = self._create_sample_obs("obs-1", t1)
        obs2 = self._create_sample_obs("obs-2", t2)

        # Normal baseline (< 500m)
        res_normal = satellite_pipeline.validate_insar_pair(obs1, obs2, perpendicular_baseline=65.0)
        assert res_normal["quality_state"] == QualityState.VALID
        assert res_normal["temporal_baseline_days"] == 12.0

        # Excessive baseline (> 500m) degrades quality to LOW_COHERENCE
        res_excessive = satellite_pipeline.validate_insar_pair(obs1, obs2, perpendicular_baseline=620.0)
        assert res_excessive["quality_state"] == QualityState.LOW_COHERENCE

    @pytest.mark.asyncio
    async def test_execute_insar_job_generates_verified_observation(self):
        t1 = datetime(2025, 1, 10, 0, 0, 0, tzinfo=timezone.utc)
        t2 = datetime(2025, 1, 22, 0, 0, 0, tzinfo=timezone.utc)
        obs1 = self._create_sample_obs("obs-run-1", t1)
        obs2 = self._create_sample_obs("obs-run-2", t2)

        run = SatelliteProcessingRun(
            id="run-test-001",
            job_id="job-001",
            pipeline_type="INSAR_INTERFEROGRAM",
            pipeline_version="1.0.0",
            primary_input_id=obs1.id,
            secondary_input_id=obs2.id,
            parameters={"perpendicular_baseline_meters": 45.0},
            status=JobStatus.QUEUED,
            start_time=datetime.now(timezone.utc),
            created_by="usr-admin-1",
            created_at=datetime.now(timezone.utc),
        )

        insar_obs = await satellite_pipeline.execute_insar_job(
            run_record=run,
            primary_scene=obs1,
            secondary_scene=obs2,
            perpendicular_baseline=45.0,
            intersected_slope_units=["su-aizawl-001", "su-aizawl-002"],
        )

        assert run.status == JobStatus.COMPLETE
        assert len(run.output_references) == 2
        assert len(run.output_checksums) == 2

        # Verify GeoTIFF asset exists in object storage
        disp_key = run.output_references[0]
        assert satellite_storage.exists(disp_key)
        stored_bytes = satellite_storage.get_bytes(disp_key)
        assert len(stored_bytes) > 0

        # Verify observation properties
        assert insar_obs.primary_scene_id == obs1.id
        assert insar_obs.secondary_scene_id == obs2.id
        assert insar_obs.temporal_baseline_days == 12.0
        assert insar_obs.perpendicular_baseline_meters == 45.0
        assert insar_obs.displacement_statistics["unit"] == "mm/year"
        assert insar_obs.intersected_slope_units == ["su-aizawl-001", "su-aizawl-002"]
        assert "geometric overlap only" in insar_obs.spatial_intersection_disclaimer
