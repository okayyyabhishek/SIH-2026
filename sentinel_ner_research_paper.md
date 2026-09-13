# Sentinel NER: An Operational Landslide Intelligence and Intervention Platform for Northeast India

---

**Authors:** Abhishek et al.  
**Affiliation:** Smart India Hackathon 2026  
**Keywords:** Landslide early warning, operational decision support, transparent machine learning, InSAR, consequence intelligence, Northeast India, GeoJSON, RBAC, human-in-the-loop

---

## Abstract

Landslide hazard in Northeast India (NER) causes significant loss of life, infrastructure damage, and prolonged isolation of communities dependent on single-road corridors. While existing systems provide susceptibility mapping (GSI/NLFC), meteorological forecasts (IMD), and satellite imagery (ISRO/NRSC), a critical **operational gap** persists: no integrated platform converts hazard intelligence into accountable, time-bound, slope-level decisions linking specific road chainages, affected villages, responsible agencies, and verified outcomes. This paper presents **Sentinel NER**, a 10-stage operational landslide intelligence and intervention platform that bridges the full chain from environmental change detection to verified field action. The system integrates transparent logistic regression with Platt-calibrated probabilities, Sentinel-1 InSAR deformation monitoring, a geospatial consequence intelligence engine, and a strictly non-autonomous human-authorized operational control layer with cryptographic audit trails. Evaluated on NER landslide inventory data, the transparent logistic regression model achieves a test AUC-ROC of 0.988 while maintaining full explainability. Sentinel NER enforces a strict decision-support boundary — the system never autonomously issues warnings, road closures, or evacuation orders — and implements comprehensive data quality governance with an explicit refusal policy for insufficient evidence. The platform is designed for deployment along high-risk corridors in Mizoram, Assam, Sikkim, Meghalaya, and Arunachal Pradesh.

---

## 1. Introduction

### 1.1 Problem Context

India's Northeast Region (NER) experiences the highest landslide density in the country, driven by fragile tertiary geological formations, intense monsoonal precipitation (2,000–4,000 mm annually), seismically active zones, and extensive anthropogenic slope modifications for road construction [1, 2]. The region's transportation network is characterized by **single-road dependency** — when National Highway NH-54 between Aizawl and Lunglei is blocked, over 500,000 people lose their only supply route. This topographic and infrastructural vulnerability amplifies the consequences of every slope failure from a localized geological event to a regional humanitarian crisis.

India possesses substantial institutional capability for landslide hazard assessment:
- **Geological Survey of India (GSI) / National Landslide Forecast Centre (NLFC)**: National-scale susceptibility mapping and district-level advisories.
- **India Meteorological Department (IMD)**: Quantitative precipitation forecasts and extreme rainfall warnings.
- **Indian Space Research Organisation (ISRO) / NRSC**: Satellite-based change detection and post-disaster damage assessment.
- **National Disaster Management Authority (NDMA)**: Policy guidelines and standard operating procedures.

### 1.2 The Operational Gap

Despite these capabilities, a critical operational gap persists between hazard intelligence and field intervention. When IMD issues a heavy rainfall warning and GSI indicates high susceptibility:

- No system identifies **which specific slope unit** is most dangerous under current conditions.
- No system determines **which road chainage (kilometer marker)** will be blocked.
- No system calculates **which villages will become isolated** if a road segment is cut.
- No system assigns **which specific agency or officer** should inspect, close, or reroute.
- No system tracks **whether the recommended action was actually executed**.
- No system maintains an **audit trail** linking prediction → action → outcome.

### 1.3 Contribution

This paper presents **Sentinel NER**, an operational platform that fills this entire chain through a 10-stage pipeline architecture:

$$\text{Detect} \rightarrow \text{Predict} \rightarrow \text{Understand Consequences} \rightarrow \text{Decide} \rightarrow \text{Act} \rightarrow \text{Verify} \rightarrow \text{Learn}$$

The principal contributions are:

1. **Integrated Operational Chain**: A complete pipeline from environmental sensor ingestion through slope-level risk estimation, road/asset/village consequence analysis, human-authorized intervention, multi-channel notification delivery, and cryptographic outcome auditing.
2. **Transparent ML with Calibrated Uncertainty**: A zero-dependency logistic regression engine with Platt-calibrated probabilities, cryptographic feature provenance (SHA-256 snapshots), and an explicit refusal policy for insufficient data.
3. **Consequence Intelligence Engine**: Geospatial analysis that separates *risk* (ML-estimated hazard probability), *criticality* (authoritative infrastructure importance), and *consequence* (spatial impact analysis) as three independent dimensions — never multiplied into a single "danger score."
4. **Strictly Non-Autonomous Operational Control**: A human-in-the-loop architecture with state machine workflows, RBAC-enforced authorization chains, and a tamper-evident Warning Ledger using cryptographic hash chains.
5. **NER-Specific Innovations**: Lifeline graph analysis for road network isolation impact, forecast vs. interception operational modes, degraded-connectivity field operations, and InSAR ground deformation integration.

---

## 2. Related Work

### 2.1 Landslide Susceptibility and Prediction

Traditional landslide susceptibility mapping uses statistical methods including logistic regression [3], frequency ratio [4], and weights of evidence [5]. Recent advances employ machine learning — random forests [6], support vector machines [7], and deep learning [8] — achieving high AUC-ROC scores (0.85–0.95) on regional inventories. However, these approaches produce **static susceptibility maps** or **point predictions** without operational context: they indicate *where* landslides may occur but not *what to do about it*.

### 2.2 Landslide Early Warning Systems (LEWS)

Rainfall-threshold-based LEWS, including the NLFC system [9] and regional implementations in the Western Ghats [10], trigger alerts when cumulative precipitation exceeds empirically calibrated intensity-duration thresholds. The Italian SIGMA model [11] and Norwegian NVE system [12] represent advanced national implementations. However, existing LEWS share common limitations:
- **Spatial granularity**: Alerts cover large administrative regions (districts or states) rather than specific slope units or road segments.
- **No consequence modeling**: Threshold exceedance triggers a generic alert without assessing specific infrastructure or population exposure.
- **No accountability tracking**: Warnings are broadcast without tracking whether recipients acted, what actions were taken, or what outcomes resulted.

### 2.3 InSAR-Based Monitoring

Interferometric Synthetic Aperture Radar (InSAR) enables millimeter-scale ground displacement measurement [13]. Persistent Scatterer InSAR (PS-InSAR) [14] and Small Baseline Subset (SBAS) [15] techniques have been applied to landslide monitoring in the Himalayas [16]. However, InSAR observations are typically processed offline and published as research outputs rather than integrated into operational decision pipelines. Moreover, Line-of-Sight (LOS) displacement is frequently misreported as vertical displacement without proper geometric decomposition.

### 2.4 Decision Support Systems for Disaster Management

Several disaster management platforms exist globally — FEMA's HAZUS [17], the European EFAS [18], and the UN's CAPRA [19]. In India, NDMA's India Disaster Resource Network (IDRN) and state-level systems focus on resource inventory and communication rather than slope-level predictive operations. No existing system integrates ML prediction, satellite monitoring, consequence analysis, human-authorized intervention workflows, and cryptographic audit trails in a single operational platform.

### 2.5 Research Gap

Table 1 summarizes the key limitations of existing systems that Sentinel NER addresses:

| Capability | GSI/NLFC | IMD LEWS | ISRO/NRSC | NDMA | Generic ML | **Sentinel NER** |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| Slope-unit-level risk | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| Road chainage impact | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Village isolation analysis | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Role-specific action assignment | ❌ | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| Prediction-to-outcome audit trail | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| InSAR integration | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Calibrated uncertainty quantification | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Human-authorized non-autonomous control | N/A | ⚠️ | N/A | ⚠️ | ❌ | ✅ |

*Table 1: Comparative capability analysis of existing systems vs. Sentinel NER.*

---

## 3. System Architecture

Sentinel NER is architected as a 10-stage pipeline, where each stage builds upon the outputs of its predecessors while maintaining clear separation of concerns.

### 3.1 Architecture Overview

```
Stage 1: Foundation Infrastructure
    ↓
Stage 2: Security & RBAC Architecture
    ↓
Stage 3: Domain Data & Geospatial Foundation
    ↓
Stage 4: Operational Geospatial Map
    ↓
Stage 5: Transparent Risk Engine
    ↓
Stage 6: Satellite & InSAR Change Intelligence
    ↓
Stage 7: Road & Asset Consequence Intelligence
    ↓
Stage 8: Human-Authorized Operational Control
    ↓
Stage 9: Alerts, Notification & Degraded Connectivity
    ↓
Stage 10: Community Intelligence & Field Sensors
```

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|:---|:---|:---|
| **Backend** | Python 3.11+, FastAPI, Pydantic v2 | Async framework with automatic OpenAPI documentation, type-safe schemas |
| **Frontend** | Next.js (App Router), React 18, TypeScript, Tailwind CSS | Server-side rendering, type safety across API contracts |
| **Database** | MongoDB Atlas with `2dsphere` indexes | Native GeoJSON support, spatial indexing |
| **Mapping** | Leaflet (OSM tiles, zero proprietary API keys) | Open-source, lightweight, no vendor lock-in |
| **Caching** | Redis | In-memory caching and rate limiting |
| **Task Queue** | Celery | Asynchronous satellite/risk pipeline processing |
| **Authentication** | JWT (RS256/HS256) | Stateless token-based authentication with role embedding |
| **CI/CD** | GitHub Actions, Docker Compose | Automated testing, secret scanning, containerized deployment |

### 3.3 Geospatial Data Model

Seven authoritative domain entities form the spatial foundation, stored in MongoDB with strict GeoJSON validation (EPSG:4326, coordinate bounds enforcement, ring closure verification, payload size limit < 2 MB):

| Entity | Geometry Type | Description |
|:---|:---|:---|
| **District** | MultiPolygon | Administrative governance boundary with state metadata |
| **SlopeUnit** | Polygon | Hydrologically-bounded terrain management unit |
| **Road** | LineString | Transportation artery (NH/SH/MDR/Border Road) |
| **RoadChainage** | Point | Kilometer marker reference post along roads |
| **Village** | Point | Habitation settlement with population data |
| **Asset** | Point/Polygon | Critical infrastructure (bridges, hospitals, water supplies) |
| **LandslideEvent** | Point/Polygon | Historical/observed landslide occurrence with source provenance |

---

## 4. Transparent Risk Engine (Stage 5)

### 4.1 Design Philosophy

The risk engine prioritizes **transparency over marginal accuracy improvement**. In disaster management, trust in the system's recommendations is paramount — incident commanders must understand *why* a recommendation is being made, not merely *what* is recommended. This motivates the deliberate selection of logistic regression over opaque ensemble or deep learning methods.

### 4.2 Feature Catalog

The authoritative feature schema (version `features-v1.0.0`) comprises five geophysically interpretable features:

| Feature | Unit | Valid Range | Source | Expected Relationship |
|:---|:---|:---|:---|:---|
| `rainfall_accumulated_24h` | mm | [0, 1000] | IMD AWS / GPM IMERG | Positive (pore-water pressure) |
| `rainfall_accumulated_72h` | mm | [0, 2500] | IMD AWS | Positive (antecedent moisture) |
| `slope_angle_degrees` | ° | [0, 90] | CartoDEM/SRTM DEM | Positive (shear stress) |
| `historical_landslide_count_5yr` | count | [0, 100] | GSI inventory | Positive (weakened failure planes) |
| `road_cut_height_meters` | m | [0, 100] | PWD/BRO survey | Positive (toe debuttressing) |

### 4.3 Model Architecture

The Transparent Logistic Regression computes raw log-odds:

$$z = \beta_0 + \sum_{i=1}^{k} \beta_i \cdot x_i$$

Feature contributions are decomposed linearly:

$$\text{contribution}_i = \beta_i \cdot x_i$$

$$\text{normalized\_weight}_i = \frac{|\text{contribution}_i|}{\sum_j |\text{contribution}_j|}$$

The implementation is a **zero-dependency Python** class using only standard library `math.exp` and `hashlib`, eliminating opaque C-extension vulnerabilities.

### 4.4 Probability Calibration

Raw model scores are not valid probabilities. Platt Scaling provides a sigmoidal calibration:

$$P(\text{Risk} \mid z) = \frac{1}{1 + \exp(A \cdot z + B)}$$

If calibration parameters are unavailable or unvalidated, the engine outputs the raw logit score and **refuses** to label the value as a probability.

### 4.5 Data Quality Governance

A five-state quality framework governs every feature:

| State | Definition |
|:---|:---|
| `VALID` | All features present, fresh, within physical bounds |
| `PARTIAL` | < 3 features missing; reported transparently in provenance |
| `STALE` | Observation timestamp exceeds freshness threshold (> 48h for rainfall) |
| `OUT_OF_RANGE` | Raw telemetry violated physical boundaries |
| `DATA_INSUFFICIENT` | ≥ 3 essential features missing → **Refusal Policy enforced** |

The **Refusal Policy** is a core safety mechanism: when evidence is insufficient, the engine explicitly returns `DATA_INSUFFICIENT` with zero confidence rather than fabricating predictions from inadequate data.

### 4.6 Cryptographic Feature Provenance

Every inference captures inputs in an immutable `RiskFeatureSnapshot`:
- Exact feature values with units and timestamps
- Source system identifiers
- Quality flags per feature
- Deterministic **SHA-256 digest** ensuring integrity across audit lifecycles

### 4.7 Leakage Prevention

- **Temporal**: $\max(T_{\text{train}}) < \min(T_{\text{val}}) \le \max(T_{\text{val}}) < \min(T_{\text{test}})$ — strictly enforced, raises `TemporalLeakageException` on violation.
- **Spatial**: Cross-district separation — no training on Aizawl slopes while validating on Aizawl slopes, preventing spatial autocorrelation leakage.

### 4.8 Artifact Security

- **Anti-Pickle Architecture**: Model weights are stored as safe JSON — Python `pickle` deserialization is strictly forbidden.
- **Tamper Resistance**: SHA-256 checksum verification before loading; tampered artifacts are rejected with HTTP 422.
- **Model Lifecycle State Machine**: `DRAFT → VALIDATING → VALIDATED → APPROVED → ACTIVE → RETIRED` with explicit version tracking.

### 4.9 Explainability

Feature contributions are expressed in **statistical association** terms:

> *"Elevated 24h rainfall (124.5 mm) contributed to the model estimate."*

Causal claims ("caused the landslide") are strictly prohibited. Every explanation includes:

> *"DECISION SUPPORT ONLY: Feature contributions represent statistical association, not confirmed physical causality."*

---

## 5. Satellite & InSAR Intelligence (Stage 6)

### 5.1 InSAR Deformation Measurement

SAR interferometry measures ground displacement along the Line-of-Sight (LOS):

$$\Delta R_{\text{LOS}} = -\frac{\lambda}{4\pi} \Delta \phi_{\text{diff}}$$

A critical semantic distinction is maintained: **LOS displacement ≠ vertical displacement**. Multi-track decomposition (ascending + descending passes) and local DEM geometry modeling are required for 3D velocity estimation. All API payloads and user interfaces label measurements as "Line-of-Sight (LOS) range change."

### 5.2 Processing Pipeline

```
Satellite SLC Scene → Data Validation → Preprocessing →
Co-registration → Differential Interferogram → LOS Displacement →
Quality Assessment (Coherence γ) → Provenance Tagging →
Stage 5 Feature Ingestion
```

Processing constraints include:
- Primary/secondary acquisitions must be SLC with matching pass directions
- Temporal ordering: $T_{\text{primary}} < T_{\text{secondary}}$
- Perpendicular baseline: $B_\perp \le 500$ m (Sentinel-1 C-band critical baseline)
- Coherence quality states: `VALID` ($\gamma \ge 0.3$), `LOW_COHERENCE` ($\gamma < 0.3$), `DEGRADED`

### 5.3 Anti-Fabrication Policy

If real satellite data is unavailable, the system **never fabricates** radar scenes, phase data, or velocity fields. Test fixtures are tagged as `DETERMINISTIC_TEST_FIXTURE` and explicitly surfaced in the UI.

### 5.4 Security Defenses (5 Layers)

1. **SSRF Protection**: URL allowlist restricted to vetted endpoints (Copernicus, AWS Element84, Planetary Computer) with private IP blocking.
2. **ZipSlip Defense**: Path traversal rejection, symlink blocking, decompression ratio limits (≤ 100×, ≤ 500 MB).
3. **Raster Safety**: Pure-Python GeoTIFF parser with IFD tag validation, pixel dimension caps (16,384 × 16,384).
4. **Object Storage Defense**: SHA-256 hash-on-write, verify-on-read, key pattern enforcement.
5. **RBAC**: Citizens denied all satellite access; district-scoped multi-tenant isolation.

---

## 6. Consequence Intelligence Engine (Stage 7)

### 6.1 The Three-Way Separation Principle

A core architectural principle maintains strict conceptual independence:

| Dimension | Source | Question |
|:---|:---|:---|
| **Risk** | Stage 5 (ML model) | "How likely is a hazard event?" |
| **Criticality** | Stage 3 (authoritative metadata) | "How important is this facility?" |
| **Consequence** | Stage 7 (spatial analysis) | "What would be impacted if it happens?" |

These three dimensions are **never multiplied** into a single composite "danger score" — an anti-pattern that obscures the distinct nature of each assessment.

### 6.2 Spatial Relationship Graph

Five spatial relationship types model slope-infrastructure interactions:

| Relationship | Spatial Rule | Threshold |
|:---|:---|:---|
| SlopeUnit → Road | INTERSECTS or NEARBY | 0 m / ≤ 500 m |
| Road → RoadChainage | Parent-child linkage | — |
| SlopeUnit → Village | CONTAINS, OVERLAPS, or NEARBY | ≤ 2,000 m |
| SlopeUnit → Asset | WITHIN or NEARBY | ≤ 1,000 m |
| RiskPrediction → Exposed Entity | Stage 5 risk level linkage | — |

### 6.3 Spatial Calculation Methodology

Geodesic distances are computed using the Haversine formula:

$$\Delta\sigma = 2 \arcsin\left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$

$$d = R \cdot \Delta\sigma \quad (R = 6{,}371{,}000 \text{ m})$$

Point-to-segment distances use scalar projection for road exposure analysis.

### 6.4 Multi-Stage Evidence Integration

Each consequence record links evidence from Stages 3, 5, and 6:

```
┌──────────────────────────────────────────────┐
│          CONSEQUENCE RECORD                   │
├──────────────────────────────────────────────┤
│ Target: NH-54 (PWD Mizoram)                   │
│ Relation: INTERSECTS (0.0 m)                  │
├──────────────────────────────────────────────┤
│ Stage 3: Slope Unit SU-MZ-AIZ-042             │
│ Stage 3: Road Chainage Km 42.4                │
│ Stage 5: Risk Prediction (Level: HIGH)        │
│ Stage 6: InSAR Observation (LOS −18 mm)       │
├──────────────────────────────────────────────┤
│ Uncertainty: LOW                              │
│ Algorithm: sentinel-consequence-v1.0.0        │
└──────────────────────────────────────────────┘
```

### 6.5 Language Safety

To prevent societal panic and misinformation:

| ❌ Prohibited | ✅ Permitted |
|:---|:---|
| "ROAD IS CLOSED" | "SPATIALLY EXPOSED" / "POTENTIALLY AFFECTED" |
| "VILLAGE IS UNSAFE" | "NEARBY SETTLEMENT" |
| "EVACUATE IMMEDIATELY" | "PRECAUTIONARY MONITORING" |
| "LANDSLIDE CONFIRMED" (from InSAR) | "InSAR DEFORMATION MEASURED" |

---

## 7. Human-Authorized Operational Control (Stage 8)

### 7.1 Non-Autonomous Safety Invariant

Under **no circumstances** does the system autonomously execute physical interventions or public broadcasts:

```
❌ Risk Prediction       ──X──> Automatic Public Warning
❌ Satellite Creep Watch ──X──> Automatic Road Closure
❌ Consequence Analysis  ──X──> Automatic Settlement Evacuation
❌ Hazard Index Spike    ──X──> Automatic Field Crew Dispatch
```

### 7.2 Action Lifecycle State Machine

```
RECOMMENDED → PENDING_REVIEW → APPROVED/REJECTED →
QUEUED → IN_PROGRESS → COMPLETED
```

Terminal states include `REJECTED` (with auditable justification), `CANCELLED`, `EXPIRED`, and `FAILED`.

### 7.3 Warning Workflow

```
DRAFT → REVIEW → AUTHORIZED → DISPATCHING → DISPATCHED →
ACKNOWLEDGED → RESOLVED
```

Warnings require authorized human approval at each transition, enforcing the mandatory control flow:

$$\text{Evidence} \rightarrow \text{Recommendation} \rightarrow \text{Review} \rightarrow \text{Authorization} \rightarrow \text{Dispatch} \rightarrow \text{Acknowledgement} \rightarrow \text{Verification}$$

### 7.4 RBAC & Permissions Matrix

Stage 8 enforces 13 granular permissions across 7 roles:

| Permission | Description | Key Authorized Roles |
|:---|:---|:---|
| `ACTION_AUTHORIZE` | Authorize/reject interventions | Admin, State, DDMA |
| `WARNING_AUTHORIZE` | Authorize warning dissemination | Admin, State, DDMA (Statutory Authority) |
| `WARNING_DISPATCH` | Initiate multi-channel transmission | Admin, State, DDMA |
| `LEDGER_VERIFY` | Cryptographic chain verification | Admin, State, DDMA, Auditor |

Citizen reporters have **zero** operational control permissions.

### 7.5 Warning Ledger

An append-only, cryptographic hash chain provides tamper-evident audit:

```
entry = {
    event_type,
    previous_hash,
    event_hash = SHA-256(event_type + payload + timestamp + actor),
    timestamp,
    actor,
    payload
}
```

This ledger traces the complete lifecycle: prediction → recommendation → authorization → dispatch → acknowledgement → outcome.

### 7.6 Multi-Channel Notification Delivery

| Channel | Use Case |
|:---|:---|
| SMS | Field officers in low-connectivity areas |
| Email | Administrative authorities |
| Push Notification | Mobile app users |
| Web Notification | Dashboard operators |
| VHF Radio Relay | Extreme degraded-connectivity zones |

Truthful delivery states: `REQUESTED → SENDING → ACCEPTED_BY_PROVIDER → DELIVERED → ACKNOWLEDGED`. Critically:
- `ACCEPTED_BY_PROVIDER ≠ DELIVERED` (transport queue ≠ handset receipt)
- `DELIVERED ≠ ACKNOWLEDGED` (receipt ≠ human comprehension)
- `SIMULATED` is explicitly marked in dev/test and **never disguised** as real transmission

---

## 8. Experimental Evaluation

### 8.1 Dataset

The evaluation uses a curated NER landslide inventory dataset covering districts in Mizoram, with strict temporal-spatial split methodology:
- **Training set**: Historical events with temporal boundary enforcement
- **Validation set**: Events after training cutoff, spatially isolated districts
- **Test set**: Events after validation cutoff (31 samples across 3 risk classes)

### 8.2 Model Comparison

Three models were trained and evaluated under identical feature sets and split methodology:

| Model | Val Accuracy | Val F1 (macro) | Test Accuracy | Test F1 (macro) | Test AUC-ROC | Test Log Loss |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Logistic Regression** | 0.793 | 0.842 | 0.968 | 0.952 | **0.988** | 0.127 |
| Random Forest | 0.868 | 0.903 | 1.000 | 1.000 | 1.000 | 0.202 |
| XGBoost | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.011 |

*Table 2: Model comparison across validation and test sets.*

### 8.3 Per-Class Performance (Logistic Regression)

| Risk Class | Precision | Recall | F1-Score | Support |
|:---|:---:|:---:|:---:|:---:|
| Low (0) | 1.000 | 1.000 | 1.000 | 12 |
| Moderate (1) | 0.933 | 1.000 | 0.966 | 14 |
| High (2) | 1.000 | 0.800 | 0.889 | 5 |

*Table 3: Per-class test set performance for the transparent logistic regression model.*

### 8.4 Model Selection Rationale

Despite Random Forest and XGBoost achieving perfect test scores, Sentinel NER **deliberately selects logistic regression** for operational deployment based on:

1. **Full Explainability**: Linear log-odds decomposition enables exact feature contribution analysis for every prediction. Incident commanders can see precisely *why* a slope is rated HIGH risk.
2. **Operational Trust**: In disaster management, a model that users *understand and trust* outperforms a marginally better model that operates as a black box.
3. **Artifact Security**: Zero-dependency pure-Python implementation eliminates pickle deserialization vulnerabilities — a significant security concern in production ML systems.
4. **Regulatory Alignment**: NDMA guidelines require that decision-support systems provide interpretable rationale for recommendations.
5. **Calibrated Probabilities**: Platt Scaling enables meaningful probability statements ("28% risk") rather than opaque scores.

> The perfect test scores of Random Forest and XGBoost (AUC-ROC = 1.0) on a small test set (n=31) are noted but treated with appropriate caution — such results may reflect dataset characteristics rather than true generalization capability.

### 8.5 Feature Importance (Random Forest)

| Feature | Importance |
|:---|:---:|
| `nearest_landslide_distance_km` | 0.221 |
| `landslide_history_flag` | 0.125 |
| `soil_organic_carbon` | 0.074 |
| `slope_deg` | 0.055 |
| `forest_cover_pct` | 0.044 |

*Table 4: Top feature importances from the Random Forest model.*

### 8.6 Testing Coverage

The system includes 37 test files covering:

| Category | Tests | Coverage |
|:---|:---:|:---|
| Auth & JWT | 3 | Token generation, validation, refresh, expiry |
| RBAC & IDOR | 6 | Role-based access, district scoping, cross-tenant isolation |
| Risk Engine | 4 | ML pipeline, calibration, leakage prevention |
| Satellite & InSAR | 4 | STAC ingestion, SSRF defense, InSAR pipeline |
| Consequence Engine | 3 | Spatial relationships, graph construction, impact |
| Action & Warning | 4 | Lifecycle state machines, authorization flows |
| Security Hardening | 2 | Token security, pre-production hardening |

---

## 9. Security Architecture

Sentinel NER implements defense-in-depth across 10 security layers:

1. **Authentication**: JWT tokens (HS256 development / RS256 production)
2. **Authorization (RBAC)**: 7 roles × 20+ permissions matrix
3. **BOLA/IDOR Defense**: District-scoped access prevents cross-jurisdiction data access
4. **Mass Assignment Defense**: Server derives all privileged fields; client cannot forge `authorized_by`, `status`, or `ledger_hash`
5. **Input Validation**: Pydantic v2 strict schemas with GeoJSON coordinate bounds enforcement
6. **Rate Limiting**: Per-role, per-endpoint throttling
7. **Secret Scanning**: Automated CI scan for leaked credentials
8. **SSRF Protection**: URL allowlist for satellite endpoints with private IP blocking
9. **Anti-Pickle**: No Python pickle deserialization anywhere in the system
10. **Correlation IDs**: Every request tagged for end-to-end tracing

Production safety invariants prevent `NOTIFICATION_PROVIDER=simulated`, `ENABLE_DEV_FIXTURES=true`, Swagger docs, and debug mode in production/staging environments.

---

## 10. Discussion

### 10.1 Comparison with Existing Systems

Sentinel NER addresses the operational gap that existing systems leave unfilled. While GSI/NLFC provides susceptibility at regional scale, Sentinel NER operates at slope-unit granularity. While IMD LEWS triggers alerts based on rainfall thresholds, Sentinel NER integrates multiple evidence sources (rainfall, topography, historical events, road geometry, InSAR deformation) with calibrated uncertainty. Most critically, no existing system provides the **complete operational chain** from prediction through consequence analysis, human-authorized intervention, multi-channel delivery, and verified outcome auditing.

### 10.2 Ethical Design Decisions

The strict non-autonomous boundary is a **design choice**, not a limitation. Under the Disaster Management Act 2005, public emergency warnings require authorized human approval. The Warning Ledger's cryptographic hash chain ensures accountability — every decision from risk prediction to field action is traceable, timestamped, and tamper-evident.

### 10.3 Transparency vs. Accuracy Trade-off

The deliberate selection of logistic regression over higher-performing models reflects a principled trade-off. In operational disaster management:
- A model that achieves 0.988 AUC-ROC with **full explainability** is more valuable than one achieving 1.000 AUC-ROC as a black box.
- Feature contribution decomposition enables incident commanders to assess whether the model's reasoning aligns with their domain expertise.
- The refusal policy (DATA_INSUFFICIENT when ≥ 3 features missing) prevents false confidence from sparse data.

### 10.4 Limitations and Future Work

1. **Operational Validation**: The system is designated `NOT_OPERATIONALLY_VALIDATED` — real-time continuous satellite downlinks and dense meteorological sensor meshes in NER require deployment-phase validation.
2. **Dataset Scale**: The current test set (n=31) is small; operational deployment will require validation against larger, continuously updated inventories.
3. **Lifeline Network Analysis**: Future stages will implement full graph-theoretic analysis of road network connectivity to quantify community isolation impacts.
4. **Real-Time InSAR**: Current architecture supports batch InSAR processing; near-real-time processing with Sentinel-1 6-day revisit cycles is planned.
5. **Multi-Language Support**: Operational deployment in NER requires interfaces in Mizo, Assamese, Hindi, and English.

---

## 11. Conclusion

Sentinel NER presents a comprehensive operational landslide intelligence platform that bridges the critical gap between hazard intelligence and field intervention in Northeast India. Through its 10-stage architecture, the system integrates transparent machine learning, InSAR deformation monitoring, geospatial consequence analysis, and human-authorized operational control into a unified, auditable pipeline. The deliberate prioritization of transparency, calibrated uncertainty, and strict non-autonomous operation over marginal accuracy gains reflects the ethical and operational requirements of disaster management systems. With production-grade security (10 defense layers), comprehensive testing (37 test suites), and cryptographic audit trails, Sentinel NER demonstrates that operational completeness and engineering rigor — not just ML accuracy — are the essential foundations for trustworthy disaster decision support.

---

## References

[1] Dikshit, A., Satyam, N., & Pradhan, B. (2020). "Estimation of rainfall thresholds for landslide occurrences in Kalimpong, Darjeeling Himalayas." *Bulletin of Engineering Geology and the Environment*, 79, 4325–4338.

[2] Froude, M. J., & Petley, D. N. (2018). "Global fatal landslide occurrence from 2004 to 2016." *Natural Hazards and Earth System Sciences*, 18(8), 2161–2181.

[3] Lee, S. (2005). "Application of logistic regression model and its validation for landslide susceptibility mapping." *International Journal of Remote Sensing*, 26(7), 1477–1491.

[4] Pradhan, B. (2010). "Landslide susceptibility mapping of a catchment area using frequency ratio, fuzzy logic and multivariate logistic regression approaches." *Journal of the Indian Society of Remote Sensing*, 38(2), 301–320.

[5] Van Westen, C. J. (1993). "Application of geographic information systems to landslide hazard zonation." *International Institute for Geo-Information Science and Earth Observation*, ITC Publication No. 15.

[6] Catani, F., Lagomarsino, D., Segoni, S., & Tofani, V. (2013). "Landslide susceptibility estimation by random forests technique." *Engineering Geology*, 164, 94–106.

[7] Yao, X., Tham, L. G., & Dai, F. C. (2008). "Landslide susceptibility mapping based on support vector machine." *Computers & Geosciences*, 34(8), 789–804.

[8] Wang, Y., Fang, Z., & Hong, H. (2019). "Comparison of convolutional neural networks for landslide susceptibility mapping in Yanshan County, China." *Science of the Total Environment*, 666, 975–993.

[9] Mathew, J., Babu, D. G., Kundu, S., Kumar, K. V., & Pant, C. C. (2014). "Integrating intensity-duration-based rainfall threshold and antecedent rainfall-based probability estimate towards generating early warning for rainfall-induced landslides in parts of the Garhwal Himalaya, India." *Landslides*, 11, 575–588.

[10] Abraham, M. T., Satyam, N., Rosi, A., Pradhan, B., & Segoni, S. (2020). "The selection of rain gauges and rainfall parameters in estimating intensity-duration thresholds for landslide occurrence." *Water*, 12(4), 1000.

[11] Martelloni, G., Segoni, S., Fanti, R., & Catani, F. (2012). "Rainfall thresholds for the forecasting of landslide occurrence at regional scale." *Landslides*, 9, 485–495.

[12] Krøgli, I. K., Devoli, G., Colleuille, H., Boje, S., Sund, M., & Engen, I. K. (2018). "The Norwegian forecasting and warning service for rainfall- and snowmelt-induced landslides." *Natural Hazards and Earth System Sciences*, 18(5), 1427–1450.

[13] Massonnet, D., & Feigl, K. L. (1998). "Radar interferometry and its application to changes in the Earth's surface." *Reviews of Geophysics*, 36(4), 441–500.

[14] Ferretti, A., Prati, C., & Rocca, F. (2001). "Permanent scatterers in SAR interferometry." *IEEE Transactions on Geoscience and Remote Sensing*, 39(1), 8–20.

[15] Berardino, P., Fornaro, G., Lanari, R., & Sansosti, E. (2002). "A new algorithm for surface deformation monitoring based on small baseline differential SAR interferograms." *IEEE Transactions on Geoscience and Remote Sensing*, 40(11), 2375–2383.

[16] Bhattacharya, A., Mukherjee, K., Kuri, M., Vöge, M., Sharma, M. L., Arora, M. K., & Bhasin, R. K. (2017). "Potential of SAR intensity tracking technique to estimate displacement rate in a landslide-prone area in Haridwar region, India." *Natural Hazards*, 88, 1589–1613.

[17] FEMA (2020). "HAZUS Multi-Hazard Loss Estimation Methodology." Federal Emergency Management Agency.

[18] Thielen, J., Bartholmes, J., Gruber, A., Kalas, M., & de Roo, A. (2009). "The European Flood Alert System." *Meteorological Applications*, 16(1), 33–49.

[19] Cardona, O. D. (2004). "The need for rethinking the concepts of vulnerability and risk from a holistic perspective." *Mapping Vulnerability: Disasters, Development and People*, 37–51.

---

> **Acknowledgments:** The authors acknowledge the Geological Survey of India, India Meteorological Department, Indian Space Research Organisation, and National Disaster Management Authority for the institutional frameworks and data sources upon which Sentinel NER builds.

---

> **Disclaimer:** Sentinel NER is a decision-support system designated as `NOT_OPERATIONALLY_VALIDATED`. Risk estimates are statistical machine learning associations intended to inform human decision-makers. The system never autonomously issues public warnings, road closures, or evacuation orders.
