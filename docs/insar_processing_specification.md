# Sentinel NER — InSAR Processing Pipeline Specification

## 1. Scope & Mathematical Foundations

This specification defines the SAR interferometry (InSAR) and differential InSAR (DInSAR) processing architecture implemented in **Sentinel NER Stage 6**.

### 1.1 Interferometric Phase Formulation
When two co-registered Single Look Complex (SLC) SAR images ($s_1, s_2$) are combined, the resulting interferogram phase $\phi_{\text{int}}$ decomposes into:

$$\phi_{\text{int}} = \arg(s_1 \cdot s_2^*) = \phi_{\text{topo}} + \phi_{\text{def}} + \phi_{\text{atm}} + \phi_{\text{orbit}} + \phi_{\text{noise}}$$

Where:
- $\phi_{\text{topo}}$ is the topographic phase component, proportional to perpendicular baseline $B_\perp$ and terrain elevation $z$.
- $\phi_{\text{def}}$ is the surface displacement phase along the satellite Line-of-Sight (LOS).
- $\phi_{\text{atm}}$ is the atmospheric phase delay (ionospheric and tropospheric moisture variations).
- $\phi_{\text{orbit}}$ is the residual orbital ramp phase resulting from baseline inaccuracies.
- $\phi_{\text{noise}}$ is the decorrelation noise phase.

### 1.2 Differential Phase & Line-of-Sight (LOS) Displacement
After subtracting the synthetic topographic phase derived from an external DEM (e.g., CartoDEM or SRTM 30m):

$$\Delta \phi_{\text{diff}} = \phi_{\text{int}} - \phi_{\text{topo,synth}} \approx \phi_{\text{def}} + \phi_{\text{atm,res}} + \phi_{\text{noise}}$$

The resulting Line-of-Sight range change $\Delta R_{\text{LOS}}$ relates directly to radar carrier wavelength ($\lambda = 0.055465\text{ m}$ for Sentinel-1 C-band):

$$\Delta R_{\text{LOS}} = -\frac{\lambda}{4\pi} \Delta \phi_{\text{def}}$$

Annualized mean LOS velocity $v_{\text{LOS}}$ is computed over temporal separation $\Delta t = (t_2 - t_1)$ in years:

$$v_{\text{LOS}} = \frac{\Delta R_{\text{LOS}}}{\Delta t} \quad [\text{mm/year}]$$

---

## 2. Geometric & Physical Processing Constraints

The InSAR processing engine enforces strict physical constraints prior to executing differential phase unwrapping:

### 2.1 Critical Perpendicular Baseline ($B_\perp$)
For Sentinel-1 C-band with orbital altitude $h \approx 693\text{ km}$, radar wavelength $\lambda = 55.465\text{ mm}$, and chirp bandwidth $W \approx 48\text{ MHz}$:
- Theoretical critical baseline: $B_{\perp,\text{crit}} \approx 5000\text{ m}$.
- **Stage 6 Operational Quality Constraint**: The subsystem enforces $B_\perp \le 500.0\text{ m}$ ($10\%$ of critical baseline) to avoid severe spatial decorrelation, geometric distortion, and excessive topographic fringe density.
- Any interferometric pair exceeding $500\text{ m}$ is rejected with `BASELINE_CONSTRAINT_EXCEEDED`.

### 2.2 Temporal Baseline ($\Delta T$)
In the heavily vegetated, tropical monsoon environment of Northeast India (Mizoram):
- Temporal decorrelation increases rapidly during wet periods.
- Optimal pair separation: $\Delta T = 12\text{ days}$ or $24\text{ days}$ (matching Sentinel-1 orbital repeat cycles).
- Upper bound for standard two-pass interferometry: $\Delta T \le 36\text{ days}$.

### 2.3 Sensor & Mode Consistency
- **Product Type**: Both primary and secondary acquisitions must be `SLC` (Single Look Complex).
- **Beam Mode**: Acquisition mode must match (default: `IW` — Interferometric Wide swath).
- **Orbit Direction**: Both acquisitions must share the identical orbit pass (`ASCENDING` or `DESCENDING`).
- **Relative Orbit**: Both acquisitions must share the identical relative orbit track.
- **Temporal Order**: $t_{\text{primary}} < t_{\text{secondary}}$ strictly enforced (prevents temporal inversion).

---

## 3. Coherence Estimation & Quality Assessment

Interferometric coherence $\gamma$ quantifies phase correlation and signal-to-noise ratio across an estimation window:

$$\gamma = \frac{\left| \sum_{k=1}^N s_1(k) s_2^*(k) \right|}{\sqrt{\sum_{k=1}^N |s_1(k)|^2 \cdot \sum_{k=1}^N |s_2(k)|^2}}, \quad 0 \le \gamma \le 1$$

### Quality Thresholds:
| Metric | Threshold | Consequence |
| :--- | :--- | :--- |
| Mean Coherence $\bar{\gamma}$ | $\ge 0.30$ | Passes `COHERENCE_SUFFICIENT` quality gate |
| Mean Coherence $\bar{\gamma}$ | $< 0.30$ | Tagged as `LOW_COHERENCE`; masked from critical analysis |
| Valid Pixel Ratio | $\ge 0.70$ | Tagged as `VALID` quality state |
| Valid Pixel Ratio | $< 0.70$ | Tagged as `DEGRADED` quality state |

---

## 4. Phase Unwrapping & Geocoding

1. **Phase Filtering**: Goldstein-Werner adaptive phase filter applied to reduce high-frequency noise.
2. **Phase Unwrapping**: Minimum Cost Flow (MCF) or Statistical-cost Network-flow Algorithm for Phase Unwrapping (SNAPHU) algorithm resolves $2\pi$ phase ambiguities:
   $$\phi_{\text{unwrapped}} = \phi_{\text{wrapped}} + 2\pi k, \quad k \in \mathbb{Z}$$
3. **Geocoding**: Range-Doppler terrain correction transforms radar coordinates (range, azimuth) to geographic coordinates (EPSG:4326 WGS 84).

---

## 5. Uncertainty Quantification

Uncertainty in LOS displacement incorporates thermal noise, phase unwrapping residuals, and atmospheric delay:

$$\sigma_{v} = \frac{\lambda}{4\pi \Delta t} \sqrt{\frac{1 - \gamma^2}{2N \gamma^2}} + \sigma_{\text{atm}}$$

- **`LOW` Uncertainty**: $\sigma_v \le 3.0\text{ mm/year}$ (high coherence $\gamma \ge 0.6$, short temporal baseline, good baseline geometry).
- **`MEDIUM` Uncertainty**: $3.0 < \sigma_v \le 8.0\text{ mm/year}$ (moderate coherence $0.3 \le \gamma < 0.6$).
- **`HIGH` Uncertainty**: $\sigma_v > 8.0\text{ mm/year}$ (sparse coherence, marginal baseline).
- **`UNCERTAINTY_NOT_AVAILABLE`**: Assigned when raw phase standard deviation cannot be reliably calculated.

---

## 6. Implementation Status & Limitations

### What is Operational:
- Full data validation, SAR metadata schemas, interferometric pair eligibility checks, perpendicular baseline constraints, zero-dependency GeoTIFF IFD validation, SSRF safety guards, and deterministic processing execution.
- Deterministic test fixtures for Champhai and Aizawl corridors with verifiable SHA-256 lineage.

### What is Deferred:
- Massive continuous multi-temporal PSI (Persistent Scatterer Interferometry) and SBAS (Small Baseline Subset) time-series solvers (such as MintPy, ISCE2, or SNAP) are architected as asynchronous pipeline targets.
- They will be connected once dedicated high-memory GPU/HPC worker pools and multi-terabyte raw SLC storage are provisioned.
