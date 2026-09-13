<div align="center">

# Sentinel NER

### Operational Landslide Intelligence & Intervention Platform for Northeast India

**From scattered hazard signals to coordinated, evidence-backed action.**

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Project](https://img.shields.io/badge/Project-SIH--2026-111827)](#)

> Sentinel NER is designed to help disaster-management and infrastructure teams move from **“Where is the hazard?”** to **“What is affected, what should happen next, and how do we verify it?”**

</div>

---

## The Problem

Landslide response is not only a prediction problem. Operational teams must bring together terrain, rainfall, historical events, roads, settlements, critical assets, satellite observations, field reports, and response actions—often across disconnected systems.

That creates a costly gap between **hazard intelligence** and **operational decisions**.

Sentinel NER is built to close that gap with a single operational workflow:

```text
Detect → Assess Risk → Understand Consequences → Decide → Act → Verify → Learn
```

The platform is focused on **Northeast India**, with an initial operational orientation toward high-risk corridors in **Mizoram, Assam, Sikkim, Meghalaya, and Arunachal Pradesh**.

---

## What Sentinel NER Does

| Capability | What it provides |
|---|---|
| **Operational Geospatial Map** | Interactive views of districts, slope units, roads, chainages, villages, assets, and recorded landslide events. |
| **Risk Intelligence** | Transparent, uncertainty-aware risk estimates designed to support human decision-makers rather than replace them. |
| **Consequence Intelligence** | Connects a hazard with potentially affected roads, assets, settlements, and operational dependencies. |
| **Early-Warning Workflow** | Structures warning information and operational follow-through instead of treating an alert as the end of the process. |
| **Action Center** | Brings incidents and response tasks into an operational decision queue. |
| **Community Intelligence** | Captures field/community observations so local evidence can complement institutional sources. |
| **Satellite / InSAR Intelligence** | Provides an architecture for earth-observation and ground-deformation signals to contribute to the operational picture. |
| **Auditability & Provenance** | Keeps evidence and operational decisions traceable with explicit source/provenance boundaries. |
| **Health & Readiness** | Exposes system health/readiness signals for operational reliability and backend dependency checks. |

> **Important:** Risk outputs are decision-support signals. The platform is intentionally designed with a human-in-the-loop boundary and does not treat model output as an automatic evacuation order, road closure, or public-warning authority.

---

## Product Experience

### 1. Situation Awareness

The command interface brings together operational metrics, external feeds, alerts, spatial information, and the current action queue so teams can understand the situation without jumping between unrelated tools.

### 2. Spatial Understanding

The map is not merely a visualization layer. It is the spatial interface for querying and understanding relationships between hazards and infrastructure.

Core spatial entities include:

- **Districts** — administrative operational boundaries
- **Slope Units** — terrain management units
- **Roads** — transportation corridors
- **Road Chainages** — discrete route reference points
- **Villages** — habitation locations
- **Assets** — critical infrastructure and emergency facilities
- **Landslide Events** — historical or observed events with provenance

### 3. Risk Interpretation

The risk engine is designed for explainability and controlled use. Inputs are captured as immutable feature snapshots, data-quality states are explicit, and insufficient evidence can trigger refusal rather than fabricated values.

### 4. Consequence Analysis

A hazard becomes operationally meaningful when teams can determine **what it threatens**. Sentinel NER therefore models relationships between hazards, roads, assets, settlements, and other spatial entities to support consequence-oriented decisions.

### 5. Action & Verification

The workflow extends beyond detection: actions can be represented, tracked, audited, and verified so the system supports operational accountability rather than one-way alert broadcasting.

---

## Architecture at a Glance

```text
┌──────────────────────────────────────────────────────────────────┐
│                         Sentinel NER                              │
├──────────────────────────────────────────────────────────────────┤
│  Operational Web Application                                     │
│  Next.js • React • TypeScript • Tailwind • Zustand              │
│  Leaflet • TanStack Query • Playwright/Vitest                   │
├──────────────────────────────────────────────────────────────────┤
│  API & Decision Services                                         │
│  FastAPI • Pydantic • Structured Logging • RBAC • Audit         │
├──────────────────────────────────────────────────────────────────┤
│  Intelligence & Spatial Domain                                   │
│  Risk • Consequences • Alerts • InSAR • Satellite • Sensors     │
│  Landslide Events • Roads • Assets • Villages • Slope Units      │
├──────────────────────────────────────────────────────────────────┤
│  Persistence / Infrastructure                                    │
│  MongoDB Atlas • GeoJSON • 2dsphere indexes • AWS S3* • Redis*  │
└──────────────────────────────────────────────────────────────────┘

* Used by the architecture where configured / enabled.
```

### Technology Stack

**Frontend**  
Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, TanStack Query, Leaflet, Framer Motion, Lucide, Vitest, Testing Library, Playwright.

**Backend**  
Python 3.11+, FastAPI, Pydantic v2, Motor/PyMongo, Uvicorn, structured JSON logging, HTTPX, Pytest.

**Data & Infrastructure**  
MongoDB Atlas with GeoJSON and `2dsphere` indexes; AWS S3 integration; Redis/Celery architecture where enabled.

**Security & Quality**  
JWT/OAuth2-oriented authentication, RBAC boundaries, audit logging, secret scanning, API health/readiness checks, automated tests, linting, and type checking.

The repository currently separates the web and API applications and includes dedicated backend modules across alerts, assets, community, consequences, InSAR, landslide events, risk, roads, satellite, sensors, spatial queries, villages, and warning-ledger functionality. fileciteturn3file0 fileciteturn4file0 fileciteturn5file0

---

## Geospatial Intelligence

Sentinel NER uses **GeoJSON** as the spatial interchange model and standardizes canonical coordinates around **EPSG:4326 / WGS84**.

The domain model is built to support spatial indexing and proximity/intersection workflows in MongoDB Atlas.

### Supported spatial queries

- **Viewport / overview queries** for bounded operational areas
- **Nearby searches** using a configurable radius
- **Point-in-geometry queries** to determine which spatial entities contain or intersect a selected location

The operational map is implemented as a client-side Leaflet experience and is intended to expose these spatial domain relationships through an interactive command interface.

---

## Transparent Risk Engine

Sentinel NER treats predictive risk as **decision support**, not autonomous authority.

### Feature layer

The defined feature schema covers:

- 24-hour accumulated rainfall
- 72-hour accumulated rainfall
- slope angle
- historical landslide count over five years
- road-cut height

### Data quality

Risk inputs can carry explicit quality states such as:

`VALID` · `PARTIAL` · `STALE` · `OUT_OF_RANGE` · `DATA_INSUFFICIENT`

When the evidence base is insufficient, the engine is designed to refuse a misleading output instead of inventing missing observations.

### Model lifecycle

The architecture uses a transparent logistic-regression approach with calibrated probability output and human-readable contribution logic.

Model artifacts are protected by checksum validation, and the lifecycle is explicit:

```text
DRAFT → VALIDATING → VALIDATED → APPROVED → ACTIVE → RETIRED
```

Temporal and spatial separation are also part of the validation design to reduce leakage between training and evaluation data.

---

## Consequence Intelligence

Sentinel NER is built around a simple operational principle:

> **A hazard matters because of what it can affect.**

Instead of stopping at a risk score, the platform can reason about the downstream operational footprint of an event:

```text
Hazard
  ├── Road corridor
  │     └── Chainage / segment
  ├── Critical asset
  │     └── Facility / infrastructure dependency
  └── Settlement
        └── Population / local impact context
```

This supports practical incident-management questions:

- Which road corridor is exposed?
- Which chainage or segment needs attention?
- Which critical assets could be affected?
- Which settlements are within the consequence footprint?
- What action should be considered, by whom, and with what evidence?

---

## Community Intelligence

Not every useful signal originates in a centralized sensor network.

The platform includes a community-oriented pathway for capturing field observations and local intelligence, allowing users to contribute information through a workflow such as:

**Photo / evidence → location → observation → warning context → operational review**

The intended role is complementary: community submissions enrich the evidence picture while maintaining provenance and review boundaries.

---

## Operational Safety Principles

**Human-in-the-loop**  
Risk intelligence informs responsible operators; it does not silently become an autonomous public-safety order.

**Provenance before confidence**  
The source and quality of evidence matter as much as the number displayed on screen.

**Refuse rather than fabricate**  
Insufficient data should be visible as insufficient data.

**Actionability over dashboards**  
The goal is not another information wall. The goal is to move teams toward a defensible next action.

**Auditability by design**  
Important operational decisions should be traceable to the underlying evidence and workflow state.

---

## Repository Structure

```text
SIH-2026/
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI pipeline
│
├── apps/
│   ├── api/                       # FastAPI backend
│   │   ├── src/
│   │   │   ├── api/v1/            # Domain API modules
│   │   │   ├── core/              # Config, logging, middleware, errors
│   │   │   └── schemas/            # Validation / response models
│   │   └── tests/                 # Backend test suite
│   │
│   └── web/                       # Next.js frontend
│       ├── src/app/               # App Router pages
│       ├── src/components/        # Product UI / operational views
│       └── tests/                 # Unit & E2E tests
│
├── docker/                        # Container configuration
├── scripts/                       # Verification & security scripts
├── .env.example                   # Environment variable template
└── README.md
```

---

## Getting Started

### Prerequisites

- Python **3.11+**
- Node.js compatible with the Next.js 14 toolchain
- npm
- Git
- A MongoDB Atlas connection when persistence-backed functionality is enabled

### 1. Clone the repository

```bash
git clone https://github.com/okayyyabhishek/SIH-2026.git
cd SIH-2026
```

### 2. Configure environment variables

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Populate only the values required by your deployment. Never commit production credentials or secrets.

### 3. Start the backend

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r apps/api/requirements.txt

uvicorn src.main:app --app-dir apps/api --reload --port 8000
```

### 4. Start the frontend

```bash
npm.cmd --prefix apps/web install
npm.cmd --prefix apps/web run dev
```

Then open:

| Service | Address |
|---|---|
| Web application | `http://localhost:3000` |
| API | `http://localhost:8000` |
| Health endpoint | `http://localhost:8000/api/v1/health` |

The frontend scripts currently expose development, build, start, lint, typecheck, unit-test, and Playwright E2E commands. fileciteturn4file0

---

## Verification & Quality Gates

Run the project checks before treating a change as production-ready.

```bash
# Backend tests
python -m pytest apps/api/tests -v

# Frontend type checking
npm.cmd --prefix apps/web run typecheck

# Frontend linting
npm.cmd --prefix apps/web run lint

# Frontend unit tests
npm.cmd --prefix apps/web run test

# Frontend end-to-end tests
npm.cmd --prefix apps/web run test:e2e
```

Additional repository verification scripts include secret scanning and stage-specific checks, for example:

```powershell
python scripts/scan_secrets.py
powershell -ExecutionPolicy Bypass -File scripts/verify_stage1.ps1
powershell -ExecutionPolicy Bypass -File scripts/verify_stage3.ps1
```

---

## Project Maturity Roadmap

Sentinel NER is intentionally being developed as a staged operational platform rather than a single monolithic feature drop.

```text
Foundation
   ↓
Security & RBAC
   ↓
Authoritative Domain + Geospatial Data
   ↓
Operational Map
   ↓
Risk Intelligence
   ↓
Consequence Intelligence
   ↓
Warnings / Actions / Verification
   ↓
Broader Data Integrations & Operational Validation
```

This staged approach helps separate **what the system knows**, **what it predicts**, and **what a human operator is authorized to do**.

---

## Current Scope & Validation Boundary

Sentinel NER should be evaluated as an **operational decision-support platform under development**.

Some integrations, predictive models, and environmental data pipelines may be in staging, standby, or fixture-backed validation depending on deployment configuration. A model existing in code does not by itself constitute operational validation in a live regional monitoring program.

That distinction is deliberate: the platform aims to make uncertainty visible rather than hide it behind polished UI.

---

## Why This Project Matters

A useful disaster platform should do more than draw a hazard map.

It should answer, in sequence:

```text
What is happening?
        ↓
Where is it happening?
        ↓
How credible is the evidence?
        ↓
What could be affected?
        ↓
What should operators consider doing?
        ↓
Was the action completed?
        ↓
What did we learn?
```

That is the product philosophy behind Sentinel NER.

---

## Contributing

Contributions should preserve the platform's operational boundaries, especially around data provenance, validation, security, and human decision authority.

Before opening a pull request:

1. Keep changes scoped and documented.
2. Add or update tests for behavioral changes.
3. Avoid committing secrets, tokens, or production credentials.
4. Make uncertainty and validation status explicit where relevant.

---

## License

No license file is currently declared in the repository. Until a license is added, treat the source as **all rights reserved** and do not assume permission to redistribute or reuse it.

---

<div align="center">

### Sentinel NER

**Turning geospatial hazard intelligence into operationally accountable action.**

Built for the realities of landslide-prone corridors in Northeast India.

</div>
