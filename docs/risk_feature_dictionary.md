# Sentinel NER — Risk Feature Dictionary (Version 1.0.0)

## 1. Scope & Standards
This dictionary establishes the authoritative definitions, measurement units, expected physical domains, freshness criteria, and provenance tracking policies for all mathematical features consumed by Sentinel NER Stage 5 Risk Engines.

---

## 2. Feature Definitions

### 1. `rainfall_accumulated_24h`
- **Identifier**: `feat-precip-24h`
- **Definition**: Total cumulative precipitation observed or interpolated over the preceding 24-hour temporal window terminating at the prediction execution timestamp.
- **Physical Unit**: Millimeters ($mm$)
- **Data Type**: Float (64-bit IEEE 754)
- **Valid Physical Domain**: $[0.0, 1000.0]$
- **Authoritative Source**: IMD Automatic Weather Station (AWS) network / Satellite GPM IMERG calibrated product.
- **Aggregation Window**: 24 hours ($T_{-24h} \to T_0$).
- **Freshness Policy**: Stale if observation timestamp is $>48$ hours older than model execution time.
- **Missing Data Policy**: If missing and fewer than 3 features are absent, imputed using neutral median ($10.0\text{ mm}$); if 3 or more features are absent, triggers `DATA_INSUFFICIENT` refusal.
- **Expected Relationship**: Positive ($\beta > 0$); increases pore-water pressure and promotes shallow translational slip.

---

### 2. `rainfall_accumulated_72h`
- **Identifier**: `feat-precip-72h`
- **Definition**: Cumulative antecedent precipitation over the preceding 72-hour window, capturing deep soil saturation and groundwater recharge.
- **Physical Unit**: Millimeters ($mm$)
- **Data Type**: Float
- **Valid Physical Domain**: $[0.0, 2500.0]$
- **Authoritative Source**: IMD AWS / Regional rain gauge network.
- **Aggregation Window**: 72 hours ($T_{-72h} \to T_0$).
- **Freshness Policy**: Stale if $>72$ hours old.
- **Missing Data Policy**: Imputed with neutral default ($25.0\text{ mm}$) if partial data; tracked in provenance.
- **Expected Relationship**: Positive ($\beta > 0$).

---

### 3. `slope_angle_degrees`
- **Identifier**: `feat-topo-slope`
- **Definition**: Topographic inclination of the slope unit terrain surface relative to horizontal, calculated as the spatial mean over the polygon geometry.
- **Physical Unit**: Degrees ($^\circ$)
- **Data Type**: Float
- **Valid Physical Domain**: $[0.0, 90.0]$
- **Authoritative Source**: CartoDEM (30m) / SRTM 1-ArcSecond Digital Elevation Model.
- **Aggregation Window**: Static morphological metric (re-evaluated upon DEM updates).
- **Freshness Policy**: Static surface (validity 365 days).
- **Missing Data Policy**: Replaced with regional median ($28.0^\circ$) if DEM coverage is unavailable.
- **Expected Relationship**: Positive ($\beta > 0$); steeper angles increase tangential shear stress components.

---

### 4. `historical_landslide_count_5yr`
- **Identifier**: `feat-geo-event-hist`
- **Definition**: Total count of verified historical landslide events occurring within the subject polygon boundary over the preceding 5 operational years.
- **Physical Unit**: Integer count
- **Data Type**: Integer
- **Valid Physical Domain**: $[0, 100]$
- **Authoritative Source**: Geological Survey of India (GSI) National Landslide Susceptibility Mapping (NLSM) and district disaster management historical incident rosters.
- **Aggregation Window**: 5 calendar years ($T_{-5y} \to T_0$).
- **Freshness Policy**: Annual catalog refresh.
- **Missing Data Policy**: Defaulted to $0$ if no historical records exist; tracked in evidence.
- **Expected Relationship**: Positive ($\beta > 0$); historical scars reflect weakened shear strength along recurring failure planes.

---

### 5. `road_cut_height_meters`
- **Identifier**: `feat-anthro-roadcut`
- **Definition**: Estimated or surveyed vertical height of artificial toe excavation cut into the slope base for roadway engineering.
- **Physical Unit**: Meters ($m$)
- **Data Type**: Float
- **Valid Physical Domain**: $[0.0, 100.0]$
- **Authoritative Source**: PWD / BRO highway survey cross-sections.
- **Aggregation Window**: Static road corridor survey.
- **Freshness Policy**: 180 days after monsoon maintenance.
- **Missing Data Policy**: Defaulted to $0.0$ for non-road-adjacent terrain slope units.
- **Expected Relationship**: Positive ($\beta > 0$); toe debuttressing removes lateral confining stress.

---

## 3. Provenance & Immutability Standard
Every feature value consumed by an inference run is packaged into an immutable `RiskFeatureSnapshot` containing:
- Exact feature value and unit
- Observation and ingestion timestamps
- Source system identifier
- Missingness indicator and quality flag (`VALID`, `STALE`, `OUT_OF_RANGE`, `MISSING`)
- Deterministic SHA-256 snapshot digest verifying integrity across audit lifecycles.
