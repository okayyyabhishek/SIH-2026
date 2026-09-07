# Sentinel NER — Operational Landslide Intelligence and Intervention Platform

**Sentinel NER** is a production operational platform designed for Northeast India (starting with high-risk corridors in Mizoram, Assam, Sikkim, Meghalaya, and Arunachal Pradesh). It bridges hazard/environmental intelligence (GSI/NLFC, IMD, ISRO, InSAR, IoT sensors) and turns it into slope-level, road-level, asset-level, and action-level operational decisions.

---

## Product Mission

```
Detect → Predict → Understand Consequences → Decide → Act → Verify → Learn
```

**Primary Proposition:** Convert landslide hazard intelligence into accountable, time-bound operational decisions for people, infrastructure, and emergency agencies in Northeast India.

---

## Technical Baseline

- **Frontend:** Next.js (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query, Zustand, MapLibre GL JS, Apache ECharts
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, Structured JSON Logging, Correlation IDs
- **Data Layer (Stage 3+):** MongoDB Atlas (GeoJSON + `2dsphere` indexes), AWS S3, Redis, Celery
- **Security & RBAC (Stage 2+):** JWT/OAuth2, Role-Based Access Control, Audit logging
- **Testing & Quality:** Pytest, Vitest, Testing Library, Playwright, automated secret scanning

---

## Project Structure

```
.
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── apps/
│   ├── api/                       # Python FastAPI modular backend
│   │   ├── src/
│   │   │   ├── api/v1/            # API v1 routes & stage-gate placeholders
│   │   │   ├── core/              # Config, errors, logging, middleware
│   │   │   ├── schemas/           # Pydantic envelope & health models
│   │   │   └── main.py            # FastAPI application factory
│   │   └── tests/                 # Pytest suite (health, errors, routing)
│   └── web/                       # Next.js frontend application
│       ├── src/
│       │   ├── app/               # App Router pages & placeholders
│       │   ├── components/        # Shell, Action Queue, RBAC boundaries
│       │   └── lib/               # API clients, design tokens, query client
│       └── tests/                 # Vitest unit tests & Playwright E2E
├── docker/                        # Dockerfiles & docker-compose.yml
├── scripts/                       # Secret scanner & verification scripts
└── package.json                   # Monorepo task orchestration
```

---

## Development Setup

### Backend (Python FastAPI)

```bash
# Create virtual environment & activate
python -m venv .venv
.venv\Scripts\activate  # Windows

# Install requirements
pip install -r apps/api/requirements.txt

# Run API tests
python -m pytest apps/api/tests -v

# Start backend dev server (port 8000)
uvicorn src.main:app --app-dir apps/api --reload --port 8000
```

### Frontend (Next.js)

```bash
# Install dependencies
npm.cmd --prefix apps/web install

# Run type check
npm.cmd --prefix apps/web run typecheck

# Run linter
npm.cmd --prefix apps/web run lint

# Run unit tests
npm.cmd --prefix apps/web run test

# Start frontend dev server (port 3000)
npm.cmd --prefix apps/web run dev
```

---

## Quality Gates & Verification

Run the unified Stage 1 gate verification script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify_stage1.ps1
```

Or run individual verification commands:

```bash
# 1. Secret scan
python scripts/scan_secrets.py

# 2. API health probe check
curl http://localhost:8000/api/v1/health

# 3. Stage 3 Gate Verification
powershell -ExecutionPolicy Bypass -File scripts/verify_stage3.ps1
```

---

## Stage 3 Domain Data & Geospatial Architecture

Stage 3 provides the authoritative physical and historical domain data foundation on top of Stage 2 security architecture:

### 1. Authoritative Domain Entities
1. **District**: Administrative governance boundary with multi-polygon geometry and state metadata.
2. **SlopeUnit**: Hydrologically-bounded terrain slope management unit with code, district, and polygon boundary.
3. **Road**: Linear transportation artery (NH, SH, MDR, border road) with LineString geometry and managing agency.
4. **RoadChainage**: Discrete kilometer/meter reference post along roads with point geometry.
5. **Village**: Habitation settlement with point location, district scope, and official population metadata.
6. **Asset**: Critical infrastructure or emergency facility (bridges, culverts, hospitals, water supplies) with point/polygon geometry.
7. **LandslideEvent**: Historical or observed landslide occurrence with strict source provenance (field, official, remote sensing) and lifecycle auditing.

### 2. Coordinate Reference System (CRS) & GeoJSON Standard
- **Canonical CRS**: EPSG:4326 (WGS84 [Longitude, Latitude]).
- **GeoJSON Compliance**: Strict GeoJSON validation enforcing coordinate bounds (Lng [-180, 180], Lat [-90, 90]), finite numbers, ring closure, and payload size bounds (< 2MB).

### 3. MongoDB Persistence & Indexes
Canonical collections in MongoDB Atlas:
- `districts` (`2dsphere: geometry`, `unique: code`, compound `[state_code, status]`)
- `slopeUnits` (`2dsphere: geometry`, `unique: code`, compound `[district_id, status]`, `[state_code, status]`)
- `roads` (`2dsphere: geometry`, `unique: road_code`, compound `[district_id, operational_status]`, `[authority_organization_id, operational_status]`)
- `roadChainages` (`2dsphere: geometry`, `unique: [road_id, chainage_km]`, compound `[road_id, district_id]`)
- `villages` (`2dsphere: geometry`, compound `[district_id, status]`, `[state_code, status]`)
- `assets` (`2dsphere: geometry`, compound `[district_id, operational_status]`, `[organization_id, asset_type]`)
- `landslideEvents` (`2dsphere: geometry`, `unique: event_reference`, compound `[district_id, event_time]`, `[source, status]`)

---

## Stage 4 Operational Geospatial Map Architecture

Stage 4 visualizes authoritative spatial data and provides an interactive command interface under `/map`.
*Notice: Stage 4 visualizes authoritative spatial data. Risk prediction is not implemented until Stage 5.*

### 1. Mapping Technology & Basemap
- **Engine**: Leaflet with `@types/leaflet` dynamically imported client-side (`ssr: false`).
- **Basemap**: OpenStreetMap raster tiles with tactical dark-mode filtering (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`). Zero proprietary API keys required for development. Supports optional CARTO Dark Matter via `NEXT_PUBLIC_CARTO_API_KEY` or custom tile endpoints via `NEXT_PUBLIC_BASEMAP_TILE_URL`.
- **Default View**: Centered on Northeast India operational corridors (`[23.73, 92.72]`, Zoom 11).

### 2. Operational Layers & Neutral Symbology
Independently toggleable layers for all 7 Stage 3 entities:
- **Districts**: Indigo administrative boundary polygons.
- **Slope Units**: Emerald terrain management polygons.
- **Roads**: High-contrast blue highway corridor lines.
- **Road Chainages**: Cyan kilometer post markers.
- **Villages**: Amber habitation settlement markers.
- **Assets**: Violet critical lifeline facility markers (hospitals, bridges).
- **Landslide Events**: Orange diamond recorded historical event markers.

### 3. Spatial Query Integration
- **Overview / Viewport Mode**: Bounded reads across authorized districts.
- **Nearby Proximity Mode**: Interactive search radius circle with slider (up to 50 km) querying `/api/v1/spatial/nearby`.
- **Point Query Mode**: Evaluates intersecting geometries via `/api/v1/spatial/point-in-geometry`.

### 4. Accessibility (WCAG 2.2 AA Dual Mode)
- **Map Canvas**: Mouse and touch spatial exploration.
- **Accessible Data Roster**: Tabular list of visible entities supporting keyboard navigation (`Enter` to select), text search, and type filtering.

---

## Stage 5 Transparent Risk Engine Architecture

Stage 5 introduces an operational, transparent, reproducible, and uncertainty-aware risk intelligence engine under `/risk`:

### 1. Transparent ML Pipeline & Decision Support Boundary
- **Decision Support Only**: Risk estimates are statistical machine learning associations intended to inform human incident commanders.
- **Strict Non-Autonomous Boundary**: Stage 5 **prohibits automated issuance of public warnings, evacuation orders, or road closures**.
- **Truthful Validation**: Because real-time meteorological sensor meshes and dense regional event monitoring in Northeast India are currently in staging/standby, operational models are explicitly designated as `NOT_OPERATIONALLY_VALIDATED` (validated against deterministic unit and integration test fixtures).

### 2. Feature Provenance & Quality States
- **Feature Schema (`features-v1.0.0`)**: 5 authoritative features: `rainfall_accumulated_24h` (mm), `rainfall_accumulated_72h` (mm), `slope_angle_degrees` (°), `historical_landslide_count_5yr`, and `road_cut_height_meters` (m).
- **Cryptographic Snapshotting**: Inputs are captured in an immutable `RiskFeatureSnapshot` bound by a SHA-256 digest.
- **Quality Evaluation**: States include `VALID`, `PARTIAL`, `STALE`, `OUT_OF_RANGE`, and `DATA_INSUFFICIENT`. When 3 or more features are missing, the engine enforces an explicit **Refusal Policy** instead of inventing values.

### 3. Model Architecture, Calibration & Artifact Security
- **Algorithm**: Zero-dependency `TransparentLogisticRegression` providing linear log-odds decomposition.
- **Calibration**: Platt Scaling ($\sigma(A \cdot z + B)$) mapping raw model scores into calibrated probabilities.
- **Artifact Security**: Safe JSON weight loading (prohibiting Python `pickle` execution) with mandatory SHA-256 checksum tamper verification.
- **Model Lifecycle**: Explicit state machine (`DRAFT` $\to$ `VALIDATING` $\to$ `VALIDATED` $\to$ `APPROVED` $\to$ `ACTIVE` $\to$ `RETIRED`).
- **Leakage Prevention**: Strictly enforced temporal split ordering ($\max(T_{\text{train}}) < \min(T_{\text{val}}) \le \max(T_{\text{val}}) < \min(T_{\text{test}})$) and spatial cross-district separation.

---

### 5. Stage-Gate Progression

- **Stage 1 (Completed & Audited - PASS):** Repository, Architecture, Design System, Quality Gates
- **Stage 2 (Completed & Audited - PASS):** Identity, RBAC, Tenancy/Organization Model, Security Hardening
- **Stage 3 (Completed & Verified - PASS):** Core Domain Model and Geospatial Persistence Layer
- **Stage 4 (Completed & Verified - PASS):** Operational Geospatial Map & Dual-Mode Spatial Interface
- **Stage 5 (Completed & Verified - PASS):** Transparent Risk Engine, Uncertainty, Calibration, and Explainability
- **Stage 6:** Slope-Change Radar and Creep Watch
- **Stage 7:** Lifeline Graph, Consequence Engine, and Isolation Forecast
- **Stage 8:** Action Queue, Playbooks, Human Authorization, and Warning Ledger
- **Stage 9:** Alerting, Multilingual Messaging, Offline Field App
- **Stage 10:** Community Intelligence, Citizen Reporting, Sensor Operations, and Data Quality
- **Stage 11:** Scenario Simulation, Performance, and Model Governance
- **Stage 12:** Production Hardening and AWS Deployment


