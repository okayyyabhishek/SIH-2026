# Sentinel NER — Stage 5 Architecture: Transparent Risk Engine

## 1. Executive Mission & System Boundary
Sentinel NER Stage 5 introduces an operational, transparent, reproducible, and evidence-backed **Risk Intelligence Engine** for landslide hazard estimation in Northeast India (Mizoram operational corridor). 

The risk engine operates strictly under the **Human Decision Support** principle:
- **Decision Support Only**: Risk estimates are machine-learning statistical associations intended to inform emergency managers and geotechnical engineers.
- **Strict Non-Autonomous Operational Boundary**: The Stage 5 engine **NEVER** automatically issues public disaster warnings, triggers evacuation orders, enforces road closures, or dispatches field response teams. All intervention workflows remain reserved for human incident commanders.
- **Truthful Validation Status**: Because real-time meteorological sensor meshes and exhaustive regional event inventories across Northeast India are currently in staging/standby, operational models are explicitly designated as **`NOT_OPERATIONALLY_VALIDATED`** (validated against deterministic unit and integration test fixtures).

---

## 2. End-to-End Execution Pipeline

Every risk estimate is traceable through an unbroken provenance chain:

```
[DATA SOURCES] 
   (IMD Rainfall, CartoDEM/SRTM Slope, Geological Formations, Historical Inventory)
         │
         ▼
[DATA VALIDATION & QUALITY EVALUATION]
   (Range Checks, Stale Observation Aging, Missingness Accounting)
         │
         ▼
[FEATURE EXTRACTION & SNAPSHOTTING]
   (Authoritative Catalog, Unit Conversions, Immutable SHA-256 Snapshot)
         │
         ▼
[MODEL REGISTRY & ARTIFACT SECURITY]
   (Safe JSON Weights Loader, SHA-256 Checksum Integrity, Lifecycle State Machine)
         │
         ▼
[TRANSPARENT INFERENCE ENGINE]
   (Zero-Dependency Logistic Regression, Linear Logit Score Decomposition)
         │
         ▼
[UNCERTAINTY & PROBABILITY CALIBRATION]
   (Platt Scaling Sigmoidal Mapping, Qualitative & Quantitative Confidence Bands)
         │
         ▼
[NON-CAUSAL EXPLANATION GENERATION]
   (Direction of Influence, Normalized Weights, Association Narratives)
         │
         ▼
[HUMAN DECISION SUPPORT & ACCESSIBLE PRESENTATION]
   (Auditable Predictions Roster, WCAG 2.2 AA Contrast & Screen-Reader Support)
```

---

## 3. Authoritative Feature Catalog & Quality States

Features are formally defined in `src/core/risk/features.py` under the versioned schema `features-v1.0.0`:

| Feature Name | Type | Unit | Range | Description | Policy on Missing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `rainfall_accumulated_24h` | Float | mm | `[0.0, 1000.0]` | Accumulated precipitation over preceding 24h window | Replaced with neutral default if `<3` missing; triggers `DATA_INSUFFICIENT` if `≥3` missing |
| `rainfall_accumulated_72h` | Float | mm | `[0.0, 2500.0]` | Cumulative 3-day rainfall capturing antecedent moisture | Tracked in provenance |
| `slope_angle_degrees` | Float | degrees | `[0.0, 90.0]` | Mean topographic slope inclination of unit | Replaced with regional median if absent |
| `historical_landslide_count_5yr`| Int | count | `[0, 100]` | Verified historical rupture events intersecting geometry | Preserved as 0 if unrecorded |
| `road_cut_height_meters` | Float | meters | `[0.0, 100.0]` | Anthropogenic toe-slope excavation height | Set to 0.0 for non-corridor slopes |

### Data Quality States
- `VALID`: All required features present, fresh, and within physical bounds.
- `PARTIAL`: Minor non-critical features missing (`<3`), reported transparently in prediction provenance.
- `STALE`: Observation timestamps exceed freshness threshold (`>48h` for rainfall).
- `OUT_OF_RANGE`: Raw telemetry violated physical boundaries (e.g., negative slope or rainfall `>1000mm`).
- `DATA_INSUFFICIENT`: Three or more essential features missing. The engine enforces an explicit **Refusal Policy**, emitting `status = DATA_INSUFFICIENT` with zero fake confidence.

---

## 4. Model Architecture & Artifact Security

### Algorithm
- **Transparent Logistic Regression (`TransparentLogisticRegression`)**:
  Zero-dependency Python implementation utilizing standard `math.exp` and `hashlib`. Eliminates opaque C-extension vulnerabilities and provides exact floating-point determinism:
  $$z = \beta_0 + \sum_{i=1}^k \beta_i \cdot x_i$$
  Raw score $z$ is explicitly labeled as a log-odds score.

### Probability Calibration
- **Platt Scaling**:
  Uncalibrated classifier outputs cannot be presented as real-world probabilities. Calibrated probabilities are produced via sigmoidal transformation:
  $$P(\text{Risk} \mid z) = \frac{1}{1 + \exp(A \cdot z + B)}$$
  If calibration parameters are missing or unvalidated, the engine strictly outputs the raw model score and refuses to label the value as a probability.

### Artifact Security & Anti-Pickle Architecture
- **No Untrusted Deserialization**: Python `pickle` deserialization of model weights is strictly forbidden.
- **Safe JSON Storage**: Weights, intercepts, Platt parameters, and metadata are stored in standard JSON schema format.
- **Cryptographic Tamper Resistance**: Every model version requires an explicit `artifact_checksum_sha256`. The registry computes the SHA-256 digest prior to loading and rejects tampered artifacts with HTTP 422.

---

## 5. Temporal & Spatial Leakage Prevention

- **Strict Temporal Split Ordering**: Historical training datasets enforce irreversible temporal boundaries:
  $$\max(T_{\text{train}}) < \min(T_{\text{val}}) \le \max(T_{\text{val}}) < \min(T_{\text{test}})$$
  Any attempt to validate on past observations using future data raises `TemporalLeakageException`.
- **Spatial Independence**: Cross-district spatial splits isolate training slopes from validation slopes to prevent spatial autocorrelation leakage across contiguous watersheds.

---

## 6. Explainability & Non-Causal Attribution

Feature contributions are decomposed linearly from the logistic regression dot product:
$$\text{contribution}_i = \beta_i \cdot x_i$$
$$\text{normalized\_weight}_i = \frac{|\text{contribution}_i|}{\sum_j |\text{contribution}_j|}$$

### Language Requirements
- Feature influence is explicitly phrased in statistical association terms:
  *"Elevated 24h rainfall (124.5 mm) contributed to the model estimate."*
- Causal claims (*"caused the landslide"*) are strictly prohibited.
- Every explanation includes the mandatory disclaimer:
  *"DECISION SUPPORT ONLY: Feature contributions represent statistical association, not confirmed physical causality."*

---

## 7. RBAC, Tenancy Scoping & IDOR Defense

Stage 5 introduces fine-grained capabilities:
- `risk:read`: Read risk predictions, explanations, evidence, and model registry.
- `risk:run`: Execute scoped risk assessment pipelines.
- `risk:model:manage`: Approve, activate, or retire model versions in the registry.

| Role | `risk:read` | `risk:run` | `risk:model:manage` | Scope Boundary |
| :--- | :---: | :---: | :---: | :--- |
| `CITIZEN_REPORTER` | ❌ | ❌ | ❌ | Denied all risk endpoints |
| `FIELD_OFFICER` | ✅ | ❌ | ❌ | Read-only within district |
| `DDMA` | ✅ | ✅ | ❌ | Scoped strictly to assigned district |
| `STATE_AUTHORITY` | ✅ | ✅ | ❌ | State-wide operational scope |
| `PLATFORM_ADMIN` | ✅ | ✅ | ✅ | Global system administration |
