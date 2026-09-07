# Sentinel NER — Stage 7 Architecture: Road & Asset Consequence Intelligence

## 1. Executive Mission & System Boundary

Sentinel NER Stage 7 implements an auditable, truthful, and scientifically grounded **Road & Asset Consequence Intelligence Subsystem** for Northeast India (with initial deployment focusing on the geomorphically active transport corridors of Mizoram, including Aizawl and Champhai districts).

Stage 7 operates strictly as a **Decision Support & Consequence Intelligence Engine**:
- **Answers**:
  - **IF** a location or slope unit is affected:
    - Which roads are nearby or intersecting?
    - Which road chainages may be affected?
    - Which villages are exposed spatially?
    - Which critical assets are potentially affected?
    - Which infrastructure belongs to which organization (PWD, BRO, NHIDCL, etc.)?
    - What is the estimated spatial/operational consequence?
    - What evidence supports that relationship?
    - How certain is the relationship?
    - What assumptions were used?
- **Strict Non-Autonomous Operational Boundary**:
  Stage 7 **MAY** determine:
  - Spatial exposure and proximity
  - Affected/nearby infrastructure
  - Road chainage relationships
  - Asset criticality and village proximity
  - Deterministic consequence categories
  - Multi-stage evidence linkage and confidence/uncertainty
  
  Stage 7 **MUST NOT**:
  - Automatically close roads
  - Automatically evacuate people or villages
  - Automatically dispatch emergency personnel or field crews
  - Automatically issue public warnings or broadcast emergency alerts
  - Automatically execute interventions or generate intervention playbooks
  - Create warning ledgers or citizen/community reporting mechanisms
  - Create sensor networks or autonomous control loops

All operational interventions, road closures, and civilian alerts remain the sole responsibility of authorized human incident commanders (DDMA, PWD, BRO, State Disaster Management Authorities).

---

## 2. Architectural Pipeline & Evidence Integration

The subsystem enforces a unidirectional, auditable consequence reasoning chain:

```
STAGE 3 GEOGRAPHY
(SlopeUnit, Road, RoadChainage, Village, Asset)
        +
STAGE 5 RISK ESTIMATE
(RiskPrediction, FeatureSnapshot, Calibrated Probability)
        +
STAGE 6 SATELLITE EVIDENCE
(SatelliteObservation, InSAR LOS Displacement, Coherence)
        │
        ▼
CONSEQUENCE GRAPH
(Explicit, queryable graph of spatial & operational linkages)
        │
        ▼
SPATIAL RELATIONSHIP ANALYSIS
(BBox prefiltering, 2dsphere indexing, segment-level distance/intersection)
        │
        ▼
IMPACT ASSESSMENT
(Categorical classification, criticality mapping, chainage attribution)
        │
        ▼
OPERATIONAL CONSEQUENCE
(Non-alarmist exposure reasoning, multi-stage evidence compilation)
        │
        ▼
HUMAN DECISION SUPPORT
(Consequence Command Center, audit logs, explainable provenance)
```

---

## 3. Consequence Graph Design

The Consequence Graph is an explicit, queryable network of spatial and operational relationships. It is persisted in database collections and queryable via REST APIs, never confined to client-side presentation code.

### Core Graph Nodes & Edges:
1. **SlopeUnit $\rightarrow$ Road**:
   - Relationship: `SLOPE_UNIT_TO_ROAD`
   - Spatial Relation: `INTERSECTS` (distance = 0 m) or `NEARBY` (distance $\le 500\text{ m}$)
   - Attributes: Distance, intersection ratio, affected road segments, road ownership.
2. **Road $\rightarrow$ RoadChainage**:
   - Relationship: `ROAD_TO_CHAINAGE`
   - Attributes: Chainage markers (km/m), relative offset, chainage status (`AVAILABLE` or `CHAINAGE_DATA_UNAVAILABLE`).
3. **SlopeUnit $\rightarrow$ Village**:
   - Relationship: `SLOPE_UNIT_TO_VILLAGE`
   - Spatial Relation: `CONTAINS`, `OVERLAPS`, or `NEARBY` (distance $\le 2000\text{ m}$)
   - Guard: Village is labeled *"SPATIALLY EXPOSED"*, **NEVER** *"UNSAFE"* or *"EVACUATE"*.
4. **SlopeUnit $\rightarrow$ Asset**:
   - Relationship: `SLOPE_UNIT_TO_ASSET`
   - Spatial Relation: `WITHIN`, `NEARBY` (distance $\le 1000\text{ m}$)
   - Attributes: Asset type, responsible organization, authoritative criticality class.
5. **RiskPrediction $\rightarrow$ Exposed Entity**:
   - Edge linking Stage 5 model predictions (`HIGH`, `VERY_HIGH`, `MODERATE`, `LOW`) to consequence relationships.
   - If missing: Tagged with explicit `RISK_DATA_UNAVAILABLE`.
6. **SatelliteObservation $\rightarrow$ Spatially Related Entity**:
   - Edge linking Stage 6 InSAR LOS deformation footprints to exposed infrastructure.
   - Guard: Observed LOS deformation $\neq$ confirmed landslide; spatial overlap $\neq$ physical destruction.

---

## 4. Domain Data Contracts

### 4.1 ConsequenceRelationship Model
```python
class ConsequenceRelationship(BaseModel):
    id: str = Field(default_factory=lambda: f"cr-{uuid4().hex[:12]}")
    source_type: ConsequenceSourceType    # SLOPE_UNIT, RISK_PREDICTION, SATELLITE_OBSERVATION, LANDSLIDE_EVENT
    source_id: str
    target_type: ConsequenceTargetType    # ROAD, ROAD_CHAINAGE, ASSET, VILLAGE
    target_id: str
    relationship_type: str                # SLOPE_UNIT_TO_ROAD, SLOPE_UNIT_TO_ASSET, etc.
    spatial_relation: SpatialRelationType # INTERSECTS, WITHIN, NEARBY, CONTAINS, OVERLAPS, UPSTREAM, DOWNSTREAM
    distance_meters: float                # 0.0 for intersections, precise geodesic distance otherwise
    intersection_ratio: Optional[float]
    consequence_category: ConsequenceCategory # ROAD_EXPOSURE, ASSET_EXPOSURE, VILLAGE_PROXIMITY, etc.
    exposure_basis: str                   # Human-readable non-alarmist exposure explanation
    criticality: AssetCriticality         # LOW, MODERATE, HIGH, CRITICAL, UNKNOWN
    evidence_ids: List[str]               # Linked Stage 3, 5, 6 entity and observation IDs
    risk_prediction_id: Optional[str]     # Stage 5 reference or None
    satellite_evidence_id: Optional[str]  # Stage 6 reference or None
    confidence: ConsequenceConfidence     # HIGH, MEDIUM, LOW, UNCERTAIN
    uncertainty: UncertaintyLevel         # LOW, MEDIUM, HIGH, UNKNOWN
    uncertainty_reasons: List[str]        # Stale prediction, approximate distance, missing chainage, etc.
    district_id: str
    state_id: str = "IN-MZ"
    organization_id: Optional[str]        # PWD, BRO, NHIDCL, etc.
    generated_at: datetime
    valid_from: datetime
    valid_until: Optional[datetime]
    algorithm_version: str = "sentinel-consequence-v1.0.0"
    status: RelationshipStatus = RelationshipStatus.ACTIVE
```

### 4.2 Non-Alarmist Terminology & Guard Constants
Stage 7 enforces strict non-alarmist guard strings defined directly in the schema contracts:
- `ROAD_EXPOSURE_TERMINOLOGY`: *"POTENTIALLY AFFECTED / SPATIALLY EXPOSED (Road is NOT designated as CLOSED without authoritative field order)"*
- `ASSET_EXPOSURE_TERMINOLOGY`: *"POTENTIALLY EXPOSED (Asset is NOT designated as DAMAGED without authoritative physical inspection)"*
- `VILLAGE_EXPOSURE_TERMINOLOGY`: *"SPATIALLY EXPOSED / NEARBY (Village is NOT designated as UNSAFE without authoritative civil directive)"*
- Explicit Missing-Data Codes:
  - `CHAINAGE_DATA_UNAVAILABLE`
  - `RISK_DATA_UNAVAILABLE`
  - `SATELLITE_EVIDENCE_UNAVAILABLE`
  - `CRITICALITY_UNKNOWN`

---

## 5. Criticality vs. Risk vs. Consequence

Stage 7 maintains strict conceptual and mathematical separation across dimensions:

| Dimension | Source Stage | Definition | Allowed Values | Anti-Pattern to Avoid |
| :--- | :--- | :--- | :--- | :--- |
| **Risk** | Stage 5 | Model-estimated hazard probability | `LOW`, `MODERATE`, `HIGH`, `VERY_HIGH` | Never treat risk as guaranteed physical impact. |
| **Criticality** | Stage 3 / Authoritative Metadata | Operational significance of the physical facility | `LOW`, `MODERATE`, `HIGH`, `CRITICAL`, `UNKNOWN` | Never infer criticality from asset name alone. |
| **Consequence** | Stage 7 | Potential operational exposure if hazard materializes | Deterministic categories (`ROAD_EXPOSURE`, `ASSET_EXPOSURE`, etc.) | **NEVER** collapse $\text{Risk} \times \text{Criticality}$ into an arbitrary "danger score". |

---

## 6. Provenance & Immutability

1. **Algorithm Versioning**: Every relationship and run records `algorithm_version: "sentinel-consequence-v1.0.0"`. Any future methodology adjustment will increment the semantic version.
2. **Deterministic Reproducibility**: Given identical spatial geometries, Stage 5 risk predictions, and Stage 6 observations, the engine produces byte-for-byte identical consequence relationships.
3. **Immutable History**: Historical consequence assessments are immutable. When re-analyzed, historical records are updated to `status: RelationshipStatus.SUPERSEDED` and new records are issued with updated timestamps.
4. **Evidence Lineage**: Each consequence relationship lists exact `evidence_ids`, `risk_prediction_id`, and `satellite_evidence_id`, allowing auditing backwards into raw STAC granules and model feature snapshots.

---

## 7. Security & Multi-Tenancy Architecture

### 7.1 Role-Based Access Control (RBAC)
Stage 7 introduces two granular permissions:
- `consequence:read`: Granted to `STATE_AUTHORITY`, `DDMA`, `PWD`, `BRO`, `NHIDCL`, `RAILWAY_AUTHORITY`, `INFRASTRUCTURE_AUTHORITY`, `FIELD_OFFICER`, and `OBSERVER_AUDITOR`.
- `consequence:run`: Granted to `STATE_AUTHORITY`, `DDMA`, `PWD`, `BRO`, `NHIDCL`, and `INFRASTRUCTURE_AUTHORITY`.
- **Public & Citizen Isolation**: `CITIZEN_REPORTER` and unauthenticated actors are strictly denied access to consequence intelligence endpoints (HTTP 403 Forbidden).

### 7.2 Tenancy & IDOR / BOLA Defenses
- **District Scoping**: District-level actors (e.g. `ROLE_DDMA` scoped to `district-aizawl`) are prohibited from querying or executing consequence runs in other districts (e.g. `district-champhai`), returning HTTP 403.
- **Organization Scoping**: Departmental users (e.g. PWD, BRO) are scoped to their authoritative infrastructure ownership.
- **Client Input Distrust**: Frontend-supplied consequence categories, criticality classifications, distance metrics, and risk values are rejected. All attributes are computed server-side from authoritative repositories.
- **Bounding & Sanitization**: Spatial query radiuses are clamped (max 5000 m), bounding boxes validated against WGS84 coordinate bounds, and candidate entity limits strictly capped at 500.

---

## 8. Database Architecture & Indexing

Stage 7 provisions two collections with optimal spatial and relational indexing:

1. `consequenceRelationships`:
   - `[("district_id", 1), ("status", 1)]`
   - `[("source_type", 1), ("source_id", 1)]`
   - `[("target_type", 1), ("target_id", 1)]`
   - `[("relationship_type", 1), ("district_id", 1)]`
   - `[("organization_id", 1)]`
   - `[("generated_at", -1)]`
2. `consequenceRuns`:
   - `[("district_id", 1), ("status", 1)]`
   - `[("created_by", 1)]`
   - `[("created_at", -1)]`
