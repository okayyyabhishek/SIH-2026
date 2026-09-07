# Sentinel NER — Stage 7 Consequence Methodology Specification

## 1. Methodological Principles

Stage 7 models the **operational and spatial consequence** of potential terrain instability on regional infrastructure in the North Eastern Region of India. 

The methodology adheres to four core tenets:
1. **Geometric Grounding**: Relationships must be mathematically derived from authoritative spatial geometries (EPSG:4326 GeoJSON) using bounded geodesic calculations.
2. **Deterministic Transparency**: Scoring must never rely on opaque heuristics or artificial "danger formulas". All consequence classifications are categorical and rule-driven.
3. **Multi-Stage Evidence Correlation**: Assessments reference Stage 3 spatial assets, Stage 5 ML risk predictions, and Stage 6 InSAR satellite observations without altering upstream truth.
4. **Anti-Alarmist & Non-Autonomous Language**: Consequence intelligence informs human planners. It never issues closure, evacuation, or dispatch orders.

---

## 2. Spatial Calculation Methodology

Spatial relationships are calculated using WGS84 ellipsoidal geometry with high-efficiency bounding-box prefiltering:

### 2.1 Haversine Geodesic Metric
For point-to-point and vertex distances, the haversine formula is evaluated:
$$\Delta\sigma = 2 \arcsin\left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
$$d = R \cdot \Delta\sigma \quad (\text{with } R = 6,371,000\text{ m})$$

### 2.2 Point-to-Segment Projection
For roads and polygon boundaries represented as line segments $AB$, the distance from point $P$ to segment $AB$ is calculated via scalar projection parameter $t$:
$$t = \frac{(P - A) \cdot (B - A)}{\|B - A\|^2}$$
- If $t \le 0$: Distance is $\|P - A\|$
- If $t \ge 1$: Distance is $\|P - B\|$
- If $0 < t < 1$: Distance is the perpendicular geodesic distance to $A + t(B - A)$

### 2.3 Segment-Level Intersection Detection
Road linestrings and slope unit polygon perimeters are evaluated for true geometric crossing using orientation tests (cross product of 2D directional vectors). If segment $S_1$ intersects $S_2$, the distance is strictly $0.0\text{ m}$ and spatial relation is assigned `INTERSECTS`.

---

## 3. Road & Chainage Exposure Analysis

### 3.1 Road Exposure Classification
- **INTERSECTS** ($d = 0.0\text{ m}$): The road centerline directly crosses the slope unit polygon or observed hazard boundary.
- **NEARBY** ($0 < d \le 500\text{ m}$): The road corridor is in direct proximity to the slope unit boundary.
- **BEYOND THRESHOLD** ($d > 500\text{ m}$): Not classified as an active consequence relationship.

### 3.2 Road Chainage Attribution
For exposed roads, the engine queries authoritative `RoadChainage` records (Stage 3):
- Identifies chainage markers within 500 m of the exposure corridor.
- Reports chainage km, relative chainage offset, and linked road ID.
- **Missing Data Handling**: If no chainage markers exist for the road segment, the field is explicitly marked:
  ```json
  "chainage_data_status": "CHAINAGE_DATA_UNAVAILABLE"
  ```
  The engine **NEVER** interpolates or invents fictional chainage markers.

### 3.3 Terminology Standard
- Allowed: `"POTENTIALLY AFFECTED"`, `"SPATIALLY EXPOSED"`.
- Prohibited: `"CLOSED"`, `"BLOCKED"`, `"DESTROYED"` (unless an authoritative field inspection order explicitly confirms physical obstruction).

---

## 4. Critical Asset Exposure Analysis

### 4.1 Asset Criticality Classification
Criticality represents the operational and societal importance of a facility, independent of landslide likelihood. Criticality is derived **exclusively** from authoritative metadata:

| Criticality Class | Facility Types | Description |
| :--- | :--- | :--- |
| **CRITICAL** | District Hospitals, Central Power Grid Substations, Emergency Operations Centers | Disruption threatens life safety or regional coordination. |
| **HIGH** | Major Bridges, Water Treatment Plants, Telecommunications Towers | Major disruptions affecting extensive populations. |
| **MODERATE** | Educational Facilities, Community Centers, Regional Bus Depots | Local operational disruption with alternative redundancy. |
| **LOW** | Agricultural Storage, Culverts, Local Administrative Sheds | Minimal regional disruption. |
| **UNKNOWN** | Unclassified Assets, Missing Metadata | Default fallback when metadata is missing. |

> [!IMPORTANT]
> **Anti-Assumption Rule**: The system **NEVER** guesses criticality based on keywords in the asset name (e.g. assuming "Hospital Road Bridge" is a hospital). If the asset entity lacks authoritative criticality, the engine outputs `CRITICALITY_UNKNOWN`.

### 4.2 Proximity Evaluation
Assets within $1000\text{ m}$ of an active slope unit or deformation footprint are evaluated.
- Allowed: `"POTENTIALLY EXPOSED"`, `"PROXIMATE"`.
- Prohibited: `"DAMAGED"`, `"COLLAPSED"`, `"OUT OF SERVICE"`.

---

## 5. Village Exposure Analysis

Villages represent vulnerable human settlements. Proximity analysis identifies community exposure zones:
- **Direct Overlap** (`CONTAINS` / `OVERLAPS`): Settlement polygon or centroid intersects the slope unit.
- **Immediate Proximity** (`NEARBY`, $d \le 500\text{ m}$): High proximity zone.
- **Secondary Proximity** (`NEARBY`, $500\text{ m} < d \le 2000\text{ m}$): Secondary observation zone.

### Non-Evacuation Guard:
- Allowed: `"SPATIALLY EXPOSED"`, `"NEARBY SETTLEMENT"`.
- Prohibited: `"UNSAFE"`, `"DANGEROUS"`, `"EVACUATION REQUIRED"`.
Evacuation directives are legally reserved for District Magistrates and State Disaster Management Authorities under the Disaster Management Act, 2005.

---

## 6. Multi-Stage Evidence Integration

```
┌─────────────────────────────────────────────────────────────┐
│                 STAGE 7 CONSEQUENCE RECORD                  │
├─────────────────────────────────────────────────────────────┤
│ Target: NH-54 Road Segment (PWD Mizoram)                    │
│ Spatial Relation: INTERSECTS (Distance: 0.0 m)              │
│ Consequence Category: ROAD_EXPOSURE                         │
├─────────────────────────────────────────────────────────────┤
│ Linked Evidence:                                            │
│  ├─ Stage 3: Slope Unit SU-MZ-AIZ-042                       │
│  ├─ Stage 3: Road Chainage Km 42.4 (Available)              │
│  ├─ Stage 5: Risk Prediction RP-20260904-001 (Level: HIGH)  │
│  └─ Stage 6: InSAR Observation SAT-MZ-2026-089 (LOS -18mm)  │
├─────────────────────────────────────────────────────────────┤
│ Uncertainty: LOW (High sensor coherence, valid risk model)  │
│ Algorithm: sentinel-consequence-v1.0.0                      │
└─────────────────────────────────────────────────────────────┘
```

### 6.1 Stage 5 Risk Integration
- If a valid `RiskPrediction` exists for the source slope unit, its `risk_level` (`HIGH`, `VERY_HIGH`, etc.) and `calibrated_probability` are linked.
- **Temporal Staleness Check**: Predictions older than 30 days are flagged with uncertainty note `"STALE_RISK_PREDICTION"`.
- **Missing Risk Fallback**: If no risk prediction exists, the record notes `RISK_DATA_UNAVAILABLE`.

### 6.2 Stage 6 Satellite InSAR Integration
- If a `SatelliteObservation` or `InSARObservation` overlaps the slope unit, its mean LOS velocity, temporal window, and coherence $\gamma$ are referenced.
- **Distinction**: InSAR LOS velocity indicates surface phase movement along the satellite line of sight; it is **not** a confirmed slope failure.

---

## 7. Uncertainty Quantification

Uncertainty is evaluated across 4 deterministic levels:

1. **LOW**: Precise geometry available; fresh Stage 5 risk prediction ($< 7$ days); high-coherence Stage 6 InSAR evidence ($\gamma \ge 0.65$); verified chainage markers present.
2. **MEDIUM**: Minor spatial approximation (centroid-based distance); Stage 5 prediction between 7 and 30 days; moderate InSAR coherence ($0.45 \le \gamma < 0.65$); chainage data unavailable.
3. **HIGH**: Rough bounding-box geometry; stale risk prediction ($> 30$ days); low InSAR coherence ($\gamma < 0.45$); unclassified asset criticality.
4. **UNKNOWN**: Essential upstream telemetry missing or uncalibrated.

Every assessment includes a transparent `uncertainty_reasons` array (e.g. `["CHAINAGE_DATA_UNAVAILABLE", "STALE_RISK_PREDICTION"]`).

---

## 8. Reproducibility & Governance

- All assessments are computed by `ConsequenceIntelligenceEngine` using versioned rules.
- Algorithms are tagged with `sentinel-consequence-v1.0.0`.
- All runs record execution parameters, candidate counts, and execution duration.
- Historical assessments cannot be mutated in place; updating an assessment supersedes previous records, maintaining complete audit lineage.
