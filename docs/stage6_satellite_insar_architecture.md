# Sentinel NER — Stage 6 Architecture: Satellite & InSAR Change Intelligence

## 1. Executive Mission & System Boundary
Sentinel NER Stage 6 implements an authoritative, truthful, and scientifically rigorous **Satellite & InSAR Environmental Change Intelligence Subsystem** for Northeast India (specifically focusing on the fragile geomorphic corridors of Mizoram, including Champhai and Aizawl districts).

Stage 6 operates strictly under the **Remote Sensing Evidence Principle**:
- **Answers**:
  - **WHERE** did measurable surface/environmental change occur?
  - **WHEN** was the observation acquired?
  - **WHAT** satellite/product produced the observation?
  - **WHAT** processing chain and parameters were performed?
  - **HOW** strong, coherent, and reliable is the observation?
  - **WHAT** spatial area is affected?
  - **WHAT** quality limitations and uncertainties apply?
  - **CAN** the observation and processing lineage be reproduced?
- **Explicitly Does NOT Answer**:
  - *"Is this definitely a landslide?"*
  - *"How dangerous is it?"*
  - *"Should people evacuate?"*
  - *"Should a road be closed?"*
  - *"Should an alert be issued?"*
- **Strict Non-Autonomous Operational Boundary**: The Stage 6 subsystem **NEVER** automatically issues public warnings, triggers evacuation directives, enforces road closures, dispatches emergency crews, or executes citizen alerting. Downstream decisions remain strictly reserved for authorized human incident commanders.

---

## 2. Architectural Chain & Pipeline Flow

The subsystem enforces a clean, unidirectional evidence pipeline:

```
SATELLITE OBSERVATION (Raw SLC/GRD/STAC Reference)
        │
        ▼
DATA VALIDATION & SAFETY (SSRF Protection, Magic Bytes, GeoTIFF IFD Header Parsing)
        │
        ▼
PREPROCESSING (Bounded Ingestion, Temporal Alignment, Orbit & Baseline Geometry Validation)
        │
        ▼
CHANGE / DEFORMATION EXTRACTION (Co-registration, Differential Phase, LOS Displacement Extraction)
        │
        ▼
QUALITY ASSESSMENT (Coherence γ Estimation, Valid Pixel Ratio, Uncertainty Categorization)
        │
        ▼
OBSERVATION & PROVENANCE (Immutable SHA-256 Lineage, Spatial Intersection Disclaimer)
        │
        ▼
STAGE 5 RISK ENGINE CONSUMPTION (Optional feature ingestion: InSAR velocity → Feature Snapshot)
```

---

## 3. Absolute Anti-Fabrication Policy

This subsystem strictly adheres to the **Anti-Fabrication Principle**:
1. **No Phantom Radar Scenes**: If real-time or operational satellite data is unavailable, the system **NEVER** fabricates acquisitions, orbit ephemerides, interferometric phase, coherence values, or velocity fields.
2. **Truthful Operational Statuses**: Upstream connectors and data states are explicitly tagged with one of:
   - `DATASET_NOT_AVAILABLE`
   - `NOT_CONFIGURED`
   - `AUTH_REQUIRED`
   - `RATE_LIMITED`
   - `AVAILABLE`
   - `DEGRADED`
   - `UNAVAILABLE`
3. **Deterministic Test Fixtures**: Synthetic or pre-computed validation data is strictly tagged with `provenance_state: "DETERMINISTIC_TEST_FIXTURE"`. The frontend and API explicitly surface this distinction and never disguise test fixtures as live operational telemetry.
4. **Current Status Designation**:
   **`ENGINEERING COMPLETE / NOT OPERATIONALLY VALIDATED`**
   All architectural components, schemas, security guards, processing pipelines, and deterministic integration tests are complete, but live continuous satellite downlinks in the operational theater have not yet been operationally validated.

---

## 4. Line-of-Sight (LOS) Semantics

SAR interferometry measures phase shift corresponding exclusively to **Line-of-Sight (LOS)** distance change between the ground target and the satellite antenna:

$$\Delta R_{\text{LOS}} = -\frac{\lambda}{4\pi} \Delta \phi_{\text{diff}}$$

- **Range Increase (Negative Velocity)**: Negative LOS velocity values (e.g., $-18.4\text{ mm/year}$) indicate that the ground distance to the sensor is increasing (ground surface receding or moving away along the line of sight).
- **Range Decrease (Positive Velocity)**: Positive LOS velocity values indicate distance decreasing (moving toward the sensor).
- **Mandatory Non-Equivalence**: LOS displacement **MUST NEVER** be reported as "vertical displacement", "subsidence", or "true slope downhill sliding" without multi-track (ascending + descending) vector decomposition and local DEM geometry modeling.
- **UI & API Standard**: All user interfaces and API payloads explicitly label radar measurements as:
  `"Line-of-Sight (LOS) range change"`

---

## 5. Spatial Association vs. Causation (Stage 3 Integration)

Stage 6 observations can intersect domain entities established in Stage 3 (Districts, Slope Units, Roads, Road Chainages, Villages, Assets):

$$\text{Spatial Intersection } \neq \text{ Failure Causation}$$

Every observation intersecting a slope unit or road carries the mandatory disclaimer:
> **SPATIAL INTERSECTION ONLY**: Observed Line-of-Sight deformation footprint overlaps this slope unit boundary. Does NOT infer slope failure causation. Further geotechnical investigation is required.

The original observation footprint is preserved in EPSG:4326 GeoJSON without geometric mutation. Intersected entity IDs are stored separately in the observation record.

---

## 6. Security Architecture & Threat Defenses

Stage 6 enforces defense-in-depth across 5 threat surfaces:

1. **SSRF Defense (`validate_remote_url`)**:
   - URL scheme strictly restricted to `https://`.
   - Domain allowlist limited to vetted catalog endpoints:
     - `dataspace.copernicus.eu`
     - `earth-search.aws.element84.com`
     - `planetarycomputer.microsoft.com`
     - `sentinel-s2-l2a.s3.amazonaws.com`
   - DNS resolution with private IP blocking: blocks loopback (`127.0.0.0/8`), RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and IPv6 equivalents (`::1`, `fc00::/7`, `fe80::/10`).
2. **ZipSlip & Decompression Bomb Protection (`safe_extract_archive`)**:
   - Resolves all archive target paths against canonical extraction root.
   - Rejects any entry attempting directory traversal (`../` or leading `/`).
   - Rejects symlinks and hard links within archives.
   - Enforces decompression ratio limits ($\le 100\times$) and maximum uncompressed size ($\le 500\text{ MB}$).
3. **Raster Safety (`validate_geotiff_buffer`)**:
   - Pure-Python zero-dependency TIFF/GeoTIFF parser.
   - Validates TIFF magic bytes (`II*\x00` little-endian or `MM\x00*` big-endian).
   - Inspects Image File Directory (IFD) tags directly:
     - `ImageWidth` (tag 256) and `ImageLength` (tag 257) capped at $16,384 \times 16,384$ pixels.
     - Enforces maximum file size ($\le 100\text{ MB}$).
     - Verifies coordinate system presence via GeoKey tags (tags 34735, 34737).
4. **Object Storage Traversal Defense (`SafeSatelliteStorage`)**:
   - Enforces key pattern `^[a-zA-Z0-9_\-\./]+$`.
   - Strips and rejects `..` traversal sequences.
   - Computes SHA-256 hashes on write and verifies hashes on read.
5. **Role-Based Access Control (RBAC) & BOLA Defense**:
   - `satellite:read` required for retrieving observations, provenance, and run statuses.
   - `satellite:ingest` required for catalog registration.
   - `satellite:process` required for dispatching InSAR processing jobs.
   - Anonymous and `CITIZEN_REPORTER` roles are denied all satellite access.
   - Multi-tenant district and state scoping prevents cross-jurisdiction BOLA access.

---

## 7. Database Persistence & Collections

MongoDB collections follow standard repository conventions:

| Collection Name | Purpose | Indexes |
| :--- | :--- | :--- |
| `satelliteObservations` | Raw and pre-processed scene metadata | `2dsphere` on `footprint`, compound index on `[mission, acquisition_time]`, index on `quality_state` |
| `insarObservations` | Differential InSAR deformation products | `2dsphere` on `deformation_geometry`, compound on `[district_id, acquisition_end]`, index on `quality_state` |
| `satelliteProcessingRuns` | Asynchronous processing job ledger | Index on `status`, index on `created_at`, compound on `[pipeline_type, created_at]` |

---

## 8. InSAR Processing Engine Specification

- **Input Constraints**:
  - Primary and secondary acquisitions must both be `SLC` (Single Look Complex).
  - Pass directions must match (`ASCENDING` with `ASCENDING`, `DESCENDING` with `DESCENDING`).
  - Temporal ordering strictly enforced: $T_{\text{primary}} < T_{\text{secondary}}$ (anti-temporal inversion guard).
  - Perpendicular baseline must satisfy $B_\perp \le 500\text{ m}$ (critical baseline limit for Sentinel-1 C-band).
- **Processing Chain**:
  - Pipeline version: `sentinel-ner-insar-v1.0.0`
  - Co-registration $\rightarrow$ 2-pass differential interferogram generation $\rightarrow$ Coherence estimation $\rightarrow$ Phase unwrapping (SNAPHU branch-cut/MORT) $\rightarrow$ Geocoding to EPSG:4326 $\rightarrow$ LOS velocity calculation $\rightarrow$ Quality control.
- **Quality & Uncertainty States**:
  - `VALID`: Coherence $\gamma \ge 0.3$, baseline $< 500\text{ m}$, valid pixel ratio $\ge 0.7$.
  - `LOW_COHERENCE`: Coherence $\gamma < 0.3$.
  - `DEGRADED`: Atmospheric phase screen noise detected or geometric baseline marginal.
  - Uncertainty: `LOW` ($\le 3\text{ mm/yr}$), `MEDIUM` ($3-8\text{ mm/yr}$), `HIGH` ($> 8\text{ mm/yr}$), or `UNCERTAINTY_NOT_AVAILABLE`.

---

## 9. Stage 5 Integration Boundary

Stage 6 observations can serve as feature inputs for Stage 5 risk assessments:
- An InSAR deformation velocity can be extracted as feature `insar_los_velocity_mm_yr`.
- This feature is snapshotted in Stage 5 feature records.
- Stage 6 **NEVER** modifies Stage 5 risk models, thresholds, or prediction logic directly.
- Clear separation:
  - **Stage 6**: *"Satellite evidence indicates measured surface change."*
  - **Stage 5**: *"Machine learning model estimates risk probability based on features."*
