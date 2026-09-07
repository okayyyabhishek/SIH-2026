# Sentinel NER — Satellite Data Provenance & Processing Lineage

## 1. Provenance Architecture Principles

In Sentinel NER Stage 6, every satellite observation and InSAR deformation product carries an **immutable, cryptographically verifiable provenance record**. Scientific credibility and operational accountability require that every remote sensing conclusion can be traced back to its exact raw source scenes and processing steps.

The subsystem enforces the following core tenets:
1. **Unbroken Lineage**: Derived products must identify all input scenes, intermediate interferograms, and geocoded outputs.
2. **Deterministic Reproducibility**: Given the same raw inputs and parameter dictionary, the processing chain must produce identical outputs.
3. **Cryptographic Integrity**: All inputs and outputs are hashed using SHA-256. Hashes are recorded in database lineage records and validated upon retrieval.
4. **Client-Side Immutability**: Clients cannot alter, overwrite, or forge provenance metadata. Once written, provenance records cannot be modified via external API endpoints.
5. **Truthful Provenance States**: Every record declares whether it originates from:
   - `REAL_EXTERNAL_DATA`
   - `REAL_UPLOADED_DATA`
   - `DETERMINISTIC_TEST_FIXTURE`
   - `DATASET_NOT_AVAILABLE`

---

## 2. InSAR Provenance Record Schema

Derived InSAR observations record lineage in the following structured schema:

```json
{
  "observation_id": "insar_obs_champhai_test_001",
  "provenance_record": {
    "raw_primary_product_id": "S1A_IW_SLC__1SDV_20260301T001500_M1",
    "raw_secondary_product_id": "S1A_IW_SLC__1SDV_20260313T001500_M1",
    "processing_chain_version": "sentinel-ner-insar-v1.0.0",
    "software_version": "InSAR-Core-1.0.0",
    "algorithm": "TWO_PASS_DIFFERENTIAL_INSAR",
    "parameters": {
      "unwrapping_method": "SNAPHU_MORT",
      "coherence_threshold": 0.3,
      "max_perpendicular_baseline_meters": 500.0,
      "multilook_azimuth": 4,
      "multilook_range": 1
    },
    "input_hashes": {
      "primary_scene_sha256": "4a7d...391e",
      "secondary_scene_sha256": "8f12...bc44"
    },
    "output_hashes": {
      "displacement_geotiff_sha256": "9b3c...11a2",
      "coherence_geotiff_sha256": "e21a...88c0"
    },
    "processed_at": "2026-03-13T06:00:00Z",
    "processing_run_id": "run_insar_fixture_001",
    "quality_checks_passed": [
      "ACQUISITION_TIME_ORDER_VALID",
      "PERPENDICULAR_BASELINE_CONSTRAINT_PASSED",
      "ORBIT_DIRECTION_MATCHED",
      "PRODUCT_TYPE_SLC_VALIDATED",
      "COHERENCE_SUFFICIENT"
    ],
    "provenance_immutable": true
  },
  "provenance_state": "DETERMINISTIC_TEST_FIXTURE"
}
```

---

## 3. Asynchronous Processing Run Lifecycle

Heavy satellite processing runs asynchronously to guarantee non-blocking API operations. Each job is tracked via the `SatelliteProcessingRun` model through a formal state machine:

```
QUEUED ──► RUNNING ──► VALIDATING ──► PROCESSING ──► QC ──► COMPLETE
   │           │           │              │          │
   └───────────┴───────────┴──────────────┴──────────┴────► FAILED
```

### State Definitions:
- **`QUEUED`**: Job registered, parameters validated, awaiting worker pickup.
- **`RUNNING`**: Worker process initialized, correlation ID established.
- **`VALIDATING`**: Input scene integrity, CRS, and baseline constraints undergoing verification.
- **`PROCESSING`**: Differential phase extraction, phase unwrapping, and velocity derivation in progress.
- **`QC`**: Quality control checks verifying coherence threshold, valid pixel ratio, and uncertainty metrics.
- **`COMPLETE`**: Output rasters generated, SHA-256 hashes computed, InSAR observation published.
- **`FAILED`**: Explicit failure recorded with structured `failure_reason` and retry count tracking.

### Retry Bounds:
- Retries are strictly bounded: `max_retries = 3`.
- Jobs that fail input validation or baseline constraints are marked non-retryable to prevent infinite loops.

---

## 4. Audit Event Accounting

All satellite operations generate immutable audit events recorded via the platform's audit logging infrastructure:

| Event Type | Trigger | Logged Metadata |
| :--- | :--- | :--- |
| `satellite:ingest` | New satellite scene registered | `user_id`, `product_id`, `mission`, `footprint_bbox`, `source_catalog` |
| `satellite:process_dispatched` | InSAR processing job submitted | `user_id`, `run_id`, `pipeline_type`, `primary_input_id`, `secondary_input_id` |
| `satellite:process_complete` | InSAR processing completed | `run_id`, `output_observation_id`, `duration_seconds`, `output_hashes` |
| `satellite:process_failed` | Processing job encountered error | `run_id`, `failure_reason`, `retry_count`, `duration_seconds` |
| `satellite:access_unauthorized` | BOLA or unauthenticated attempt | `actor_id`, `attempted_resource`, `client_ip`, `reason` |

---

## 5. Provenance Verification Protocol

To verify any observation record:
1. Retrieve observation and its provenance record via `GET /api/v1/insar/observations/{id}/provenance`.
2. Inspect `input_hashes` against original source products in object storage.
3. Verify that `quality_checks_passed` includes all required gates (`PERPENDICULAR_BASELINE_CONSTRAINT_PASSED`, `COHERENCE_SUFFICIENT`).
4. Validate that `provenance_state` truthfully communicates whether the record is operational or fixture data.
