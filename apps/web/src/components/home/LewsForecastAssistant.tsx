"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Share2,
} from "lucide-react";

interface HorizonProfile {
  horizonLabel: string;
  validityRange: string;
  modelEnsemble: string;
  alertLevel: "EXTREME" | "HIGH" | "MODERATE" | "LOW";
  peakProbability: number;
  meanProbability: number;
  rainfallAccumulationMm: number;
  flaggedAreaKm2: number;
  extremeAreaKm2: number;
  highAreaKm2: number;
  moderateAreaKm2: number;
  advisoryText: string;
}

interface HistoricalDayProfile {
  date: string;
  rainfallMm: number;
  insarDeformationMmYr: number;
  flaggedAreaKm2: number;
  status: string;
  advisoryText: string;
}

interface DistrictFullProfile {
  name: string;
  state: string;
  totalAreaSqKm: number;
  monitoredSlopeUnits: number;
  criticalCorridors: string[];
  insarDeformationMmYr: number;
  horizons: {
    "24h": HorizonProfile;
    "48h": HorizonProfile;
    "72h": HorizonProfile;
  };
  lookback: Record<string, HistoricalDayProfile>;
}

const DISTRICT_PROFILES: Record<string, DistrictFullProfile> = {
  aizawl: {
    name: "Aizawl District",
    state: "Mizoram",
    totalAreaSqKm: 3575,
    monitoredSlopeUnits: 412,
    criticalCorridors: ["NH-54 (Aizawl-Lunglei)", "Durtlang Ridge Sector", "Tuirial Bypass"],
    insarDeformationMmYr: -28.4,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "HIGH",
        peakProbability: 96.4,
        meanProbability: 71.8,
        rainfallAccumulationMm: 114.5,
        flaggedAreaKm2: 23.0,
        extremeAreaKm2: 4.8,
        highAreaKm2: 18.2,
        moderateAreaKm2: 42.0,
        advisoryText:
          "Stage 5 calibrated model flags elevated instability along the NH-54 corridor and Durtlang Ridge sector following 114.5mm/24h cumulative rainfall. Sentinel-1 InSAR confirms active line-of-sight subsidence (-28.4 mm/yr). Pre-position response assets at Selesih and restrict heavy vehicular movement during continuous downpours.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "EXTREME",
        peakProbability: 98.2,
        meanProbability: 79.4,
        rainfallAccumulationMm: 184.2,
        flaggedAreaKm2: 34.6,
        extremeAreaKm2: 9.2,
        highAreaKm2: 25.4,
        moderateAreaKm2: 56.0,
        advisoryText:
          "48h ensemble projection indicates threshold breach along Durtlang thrust plane with cumulative 184.2mm precipitation. High potential for rotational slides threatening northern arterial lifelines. Issue Stage-4 evacuation advisory for 18 vulnerable settlements along slope cuts.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "EXTREME",
        peakProbability: 98.9,
        meanProbability: 84.1,
        rainfallAccumulationMm: 258.0,
        flaggedAreaKm2: 46.8,
        extremeAreaKm2: 15.6,
        highAreaKm2: 31.2,
        moderateAreaKm2: 68.5,
        advisoryText:
          "Synoptic monsoon trough convergence forecast to deliver 258.0mm over 72h. Deep geotechnical shear failures anticipated across Tuirial bypass and Selesih escarpment. Full inter-agency coordination activated with SDMA and Border Roads Task Force.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 114.5,
        insarDeformationMmYr: -28.4,
        flaggedAreaKm2: 23.0,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 114.5mm rainfall recorded. Sentinel-1 InSAR confirms active line-of-sight subsidence (-28.4 mm/yr). Pre-position response assets at Selesih.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 86.2,
        insarDeformationMmYr: -28.1,
        flaggedAreaKm2: 18.5,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): Recorded 86.2mm rainfall. InSAR verified subsidence (-28.1 mm/yr) along Durtlang Ridge. Minor slope failures recorded at km 12 NH-54; clearance operations completed.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 58.0,
        insarDeformationMmYr: -27.6,
        flaggedAreaKm2: 12.4,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 58.0mm antecedent precipitation recorded. Groundwater piezometers logged initial pore pressure surge at Selesih monitoring borehole.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 28.5,
        insarDeformationMmYr: -27.2,
        flaggedAreaKm2: 7.1,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Baseline observation window prior to intense monsoon trough entry. Normal vehicular flow maintained across monitored corridors.",
      },
    },
  },
  lunglei: {
    name: "Lunglei District",
    state: "Mizoram",
    totalAreaSqKm: 4538,
    monitoredSlopeUnits: 348,
    criticalCorridors: ["NH-54 South Corridor", "Tlawng River Escarpment"],
    insarDeformationMmYr: -14.2,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "MODERATE",
        peakProbability: 92.1,
        meanProbability: 64.3,
        rainfallAccumulationMm: 68.2,
        flaggedAreaKm2: 6.4,
        extremeAreaKm2: 0.0,
        highAreaKm2: 6.4,
        moderateAreaKm2: 28.5,
        advisoryText:
          "Rainfall-induced susceptibility is within moderate thresholds. Tlawng river cut-slopes exhibit minor localized creep. Routine highway surveillance maintained by Border Roads Organisation.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "MODERATE",
        peakProbability: 94.2,
        meanProbability: 70.1,
        rainfallAccumulationMm: 122.0,
        flaggedAreaKm2: 14.8,
        extremeAreaKm2: 1.2,
        highAreaKm2: 13.6,
        moderateAreaKm2: 38.0,
        advisoryText:
          "48h outlook indicates progressive soil saturation along Tlawng River escarpment. Localized rockfalls possible at steep road-cuts on NH-54 South corridor.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "HIGH",
        peakProbability: 95.5,
        meanProbability: 75.8,
        rainfallAccumulationMm: 172.5,
        flaggedAreaKm2: 22.4,
        extremeAreaKm2: 3.5,
        highAreaKm2: 18.9,
        moderateAreaKm2: 46.2,
        advisoryText:
          "Extended synoptic outlook projects escalation to High hazard status by Day 3 (172.5mm cumulative). Maintenance crews alerted for vulnerable culverts and bridge approaches.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 68.2,
        insarDeformationMmYr: -14.2,
        flaggedAreaKm2: 6.4,
        status: "Active Real-Time",
        advisoryText:
          "Rainfall-induced susceptibility is within moderate thresholds. Tlawng river cut-slopes exhibit minor localized creep. Routine highway surveillance maintained.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 48.0,
        insarDeformationMmYr: -14.0,
        flaggedAreaKm2: 4.8,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): 48.0mm rainfall logged. Nominal stability with localized soil wash near Tlawng river banks.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 35.2,
        insarDeformationMmYr: -13.8,
        flaggedAreaKm2: 3.2,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 35.2mm antecedent precipitation. Normal baseline conditions.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 18.0,
        insarDeformationMmYr: -13.5,
        flaggedAreaKm2: 1.5,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Clear conditions with trace rainfall across southern valleys.",
      },
    },
  },
  champhai: {
    name: "Champhai District",
    state: "Mizoram",
    totalAreaSqKm: 3185,
    monitoredSlopeUnits: 295,
    criticalCorridors: ["Indo-Myanmar Strategic Trade Route", "Zokhawthar Link Road"],
    insarDeformationMmYr: -5.1,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "LOW",
        peakProbability: 78.4,
        meanProbability: 45.2,
        rainfallAccumulationMm: 34.0,
        flaggedAreaKm2: 0.0,
        extremeAreaKm2: 0.0,
        highAreaKm2: 0.0,
        moderateAreaKm2: 8.2,
        advisoryText:
          "Terrain stability nominal across Indo-Myanmar trade route. Soil moisture saturation index under 40%. No emergency interventions indicated.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "LOW",
        peakProbability: 81.2,
        meanProbability: 49.5,
        rainfallAccumulationMm: 56.4,
        flaggedAreaKm2: 2.5,
        extremeAreaKm2: 0.0,
        highAreaKm2: 2.5,
        moderateAreaKm2: 14.0,
        advisoryText:
          "48h rainfall remains sub-critical (56.4mm). Strategic trade route to Zokhawthar expected to remain fully operational with routine drainage checks.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "MODERATE",
        peakProbability: 91.0,
        meanProbability: 58.2,
        rainfallAccumulationMm: 88.0,
        flaggedAreaKm2: 6.8,
        extremeAreaKm2: 0.0,
        highAreaKm2: 6.8,
        moderateAreaKm2: 22.0,
        advisoryText:
          "72h outlook anticipates moderate accumulation (88.0mm) as frontal system shifts eastward. Minor erosion along agricultural terraced slopes.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 34.0,
        insarDeformationMmYr: -5.1,
        flaggedAreaKm2: 0.0,
        status: "Active Real-Time",
        advisoryText:
          "Terrain stability nominal across Indo-Myanmar trade route. Soil moisture saturation index under 40%. No emergency interventions indicated.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 22.0,
        insarDeformationMmYr: -5.0,
        flaggedAreaKm2: 0.0,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): 22.0mm rainfall recorded. All cross-border links clear and fully passable.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 14.5,
        insarDeformationMmYr: -4.9,
        flaggedAreaKm2: 0.0,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 14.5mm rainfall recorded. Dry terraced slopes with nominal pore pressure.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 8.0,
        insarDeformationMmYr: -4.8,
        flaggedAreaKm2: 0.0,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Dry weather baseline across eastern Mizoram.",
      },
    },
  },
  kolasib: {
    name: "Kolasib District",
    state: "Mizoram",
    totalAreaSqKm: 1382,
    monitoredSlopeUnits: 193,
    criticalCorridors: ["NH-306 (Silchar-Aizawl Supply Lifeline)", "Bairabi Railway Spur"],
    insarDeformationMmYr: -21.0,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "HIGH",
        peakProbability: 95.8,
        meanProbability: 69.5,
        rainfallAccumulationMm: 128.0,
        flaggedAreaKm2: 14.1,
        extremeAreaKm2: 2.1,
        highAreaKm2: 12.0,
        moderateAreaKm2: 24.6,
        advisoryText:
          "NH-306 supply corridor exhibits saturated embankment conditions near Vairengte. High probability of debris flows at steep road-cuttings. Continuous monitoring active.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "EXTREME",
        peakProbability: 97.6,
        meanProbability: 77.2,
        rainfallAccumulationMm: 210.5,
        flaggedAreaKm2: 24.8,
        extremeAreaKm2: 6.4,
        highAreaKm2: 18.4,
        moderateAreaKm2: 36.2,
        advisoryText:
          "48h WRF forecast models project 210.5mm precipitation along the Silchar-Aizawl economic lifeline. Critical cut-slope destabilization anticipated between Bilkhawthlir and Vairengte. Heavy goods vehicle (HGV) convoys should be regulated with escorts.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "EXTREME",
        peakProbability: 98.6,
        meanProbability: 82.8,
        rainfallAccumulationMm: 284.0,
        flaggedAreaKm2: 35.4,
        extremeAreaKm2: 11.2,
        highAreaKm2: 24.2,
        moderateAreaKm2: 48.0,
        advisoryText:
          "Synoptic 72h outlook indicates sustained heavy monsoon spells (284mm). Widespread debris flows likely to disrupt Bairabi rail spur and NH-306 simultaneously. Emergency line repair units and earthmoving crews placed on high standby.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 128.0,
        insarDeformationMmYr: -21.0,
        flaggedAreaKm2: 14.1,
        status: "Active Real-Time",
        advisoryText:
          "NH-306 supply corridor exhibits saturated embankment conditions near Vairengte. High probability of debris flows at steep road-cuttings. Continuous monitoring active.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 94.5,
        insarDeformationMmYr: -20.6,
        flaggedAreaKm2: 11.2,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): Recorded 94.5mm rainfall. Debris flow at NH-306 km 22 triggered temporary single-lane restriction; restored within 4 hours.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 64.0,
        insarDeformationMmYr: -20.2,
        flaggedAreaKm2: 7.8,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): Antecedent rainfall reached 64.0mm. Soil moisture probes at Vairengte recorded 72% saturation.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 32.0,
        insarDeformationMmYr: -19.8,
        flaggedAreaKm2: 4.5,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Pre-event baseline raster acquisition. Slopes stable across all monitored transport sectors.",
      },
    },
  },
  "dima-hasao": {
    name: "Dima Hasao",
    state: "Assam",
    totalAreaSqKm: 4888,
    monitoredSlopeUnits: 512,
    criticalCorridors: ["NH-27 (Lumding-Silchar Expressway)", "Haflong Hill Railway Section"],
    insarDeformationMmYr: -34.5,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "EXTREME",
        peakProbability: 98.4,
        meanProbability: 82.1,
        rainfallAccumulationMm: 142.0,
        flaggedAreaKm2: 38.4,
        extremeAreaKm2: 12.0,
        highAreaKm2: 26.4,
        moderateAreaKm2: 60.0,
        advisoryText:
          "Heavy monsoon triggering rapid mass movement along Jatinga Valley and NH-27 cut slopes. High risk of mudflows and embankment failure.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "EXTREME",
        peakProbability: 99.1,
        meanProbability: 87.5,
        rainfallAccumulationMm: 215.0,
        flaggedAreaKm2: 52.0,
        extremeAreaKm2: 18.5,
        highAreaKm2: 33.5,
        moderateAreaKm2: 74.0,
        advisoryText:
          "Sustained precipitation threshold breach across Barail range. Critical debris hazard along NF railway hill section.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "EXTREME",
        peakProbability: 99.5,
        meanProbability: 91.0,
        rainfallAccumulationMm: 290.0,
        flaggedAreaKm2: 65.0,
        extremeAreaKm2: 24.0,
        highAreaKm2: 41.0,
        moderateAreaKm2: 88.0,
        advisoryText:
          "Synoptic multi-day surge causing saturation in shale formations. Haflong-Silchar corridor vulnerability critical.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 142.0,
        insarDeformationMmYr: -34.5,
        flaggedAreaKm2: 38.4,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 142.0mm rainfall recorded. Jatinga Valley active creep.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 110.0,
        insarDeformationMmYr: -34.0,
        flaggedAreaKm2: 29.0,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): Recorded 110.0mm rainfall. Slump reported at km 38 NH-27.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 78.5,
        insarDeformationMmYr: -33.4,
        flaggedAreaKm2: 20.1,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 78.5mm antecedent rainfall recorded.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 45.0,
        insarDeformationMmYr: -33.0,
        flaggedAreaKm2: 12.0,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Pre-event baseline acquisition.",
      },
    },
  },
  "east-khasi": {
    name: "East Khasi Hills",
    state: "Meghalaya",
    totalAreaSqKm: 2748,
    monitoredSlopeUnits: 430,
    criticalCorridors: ["NH-6 (Shillong-Silchar Corridor)", "Sohra-Shella Escarpment"],
    insarDeformationMmYr: -26.8,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "HIGH",
        peakProbability: 96.0,
        meanProbability: 73.5,
        rainfallAccumulationMm: 128.5,
        flaggedAreaKm2: 27.2,
        extremeAreaKm2: 6.5,
        highAreaKm2: 20.7,
        moderateAreaKm2: 48.0,
        advisoryText:
          "Intense precipitation along southern escarpment front causing saturated planar rockslides on NH-6.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "EXTREME",
        peakProbability: 98.6,
        meanProbability: 81.2,
        rainfallAccumulationMm: 198.0,
        flaggedAreaKm2: 39.5,
        extremeAreaKm2: 11.0,
        highAreaKm2: 28.5,
        moderateAreaKm2: 62.0,
        advisoryText:
          "Cumulative rainfall exceeding 198mm. High probability of waterfall-headwall retreat and rockfall along Shillong-Cherrapunji belt.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "EXTREME",
        peakProbability: 99.0,
        meanProbability: 86.4,
        rainfallAccumulationMm: 275.0,
        flaggedAreaKm2: 50.2,
        extremeAreaKm2: 16.2,
        highAreaKm2: 34.0,
        moderateAreaKm2: 76.0,
        advisoryText:
          "72h orographic deluge. Lumshnong and Sonapur tunnel approaches flagged for rockfall and mudslides.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 128.5,
        insarDeformationMmYr: -26.8,
        flaggedAreaKm2: 27.2,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 128.5mm recorded at Sohra gauge.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 98.0,
        insarDeformationMmYr: -26.4,
        flaggedAreaKm2: 21.0,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): 98.0mm rainfall recorded. Minor slips near Pynursla.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 62.0,
        insarDeformationMmYr: -26.0,
        flaggedAreaKm2: 14.5,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 62.0mm rainfall recorded.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 35.0,
        insarDeformationMmYr: -25.5,
        flaggedAreaKm2: 8.0,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Pre-event baseline acquisition.",
      },
    },
  },
  "west-kameng": {
    name: "West Kameng",
    state: "Arunachal Pradesh",
    totalAreaSqKm: 7422,
    monitoredSlopeUnits: 620,
    criticalCorridors: ["NH-13 Trans-Arunachal Highway", "Balipara-Charduar-Tawang (BCT) Road"],
    insarDeformationMmYr: -19.2,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "MODERATE",
        peakProbability: 92.5,
        meanProbability: 61.4,
        rainfallAccumulationMm: 74.5,
        flaggedAreaKm2: 14.8,
        extremeAreaKm2: 2.1,
        highAreaKm2: 12.7,
        moderateAreaKm2: 32.0,
        advisoryText:
          "Freeze-thaw cycles weakening fractured gneisses along Sela Pass approach. Rockfall containment netting inspection advised.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "HIGH",
        peakProbability: 95.8,
        meanProbability: 70.2,
        rainfallAccumulationMm: 118.0,
        flaggedAreaKm2: 22.4,
        extremeAreaKm2: 5.0,
        highAreaKm2: 17.4,
        moderateAreaKm2: 44.0,
        advisoryText:
          "48h accumulation increasing wedge failure risk on BCT strategic corridor.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "HIGH",
        peakProbability: 96.5,
        meanProbability: 74.8,
        rainfallAccumulationMm: 165.0,
        flaggedAreaKm2: 31.0,
        extremeAreaKm2: 8.2,
        highAreaKm2: 22.8,
        moderateAreaKm2: 55.0,
        advisoryText:
          "72h precipitation outlook indicates prolonged slope destabilization along high-altitude passes.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 74.5,
        insarDeformationMmYr: -19.2,
        flaggedAreaKm2: 14.8,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 74.5mm recorded.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 58.0,
        insarDeformationMmYr: -19.0,
        flaggedAreaKm2: 10.5,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): 58.0mm rainfall recorded.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 45.0,
        insarDeformationMmYr: -18.8,
        flaggedAreaKm2: 7.2,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 45.0mm antecedent rainfall.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 31.0,
        insarDeformationMmYr: -18.5,
        flaggedAreaKm2: 4.0,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Baseline telemetry.",
      },
    },
  },
  "noney": {
    name: "Noney District",
    state: "Manipur",
    totalAreaSqKm: 1221,
    monitoredSlopeUnits: 340,
    criticalCorridors: ["NH-37 Imphal-Jiribam Lifeline", "Jiribam-Imphal Railway Tupul Yard"],
    insarDeformationMmYr: -42.6,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "EXTREME",
        peakProbability: 99.2,
        meanProbability: 88.6,
        rainfallAccumulationMm: 135.0,
        flaggedAreaKm2: 32.4,
        extremeAreaKm2: 14.2,
        highAreaKm2: 18.2,
        moderateAreaKm2: 50.0,
        advisoryText:
          "Severe landslide hazard in Ijai river catchment. Saturated shale-mudstone debris slopes subject to catastrophic debris flow similar to 2022 Tupul event.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "EXTREME",
        peakProbability: 99.6,
        meanProbability: 92.4,
        rainfallAccumulationMm: 210.0,
        flaggedAreaKm2: 44.0,
        extremeAreaKm2: 21.0,
        highAreaKm2: 23.0,
        moderateAreaKm2: 65.0,
        advisoryText:
          "Critical threshold exceeded. Full alert on NH-37 lifeline and railway construction yards. Immediate evacuation of riverbed worker camps mandated.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "EXTREME",
        peakProbability: 99.8,
        meanProbability: 94.5,
        rainfallAccumulationMm: 285.0,
        flaggedAreaKm2: 55.0,
        extremeAreaKm2: 28.0,
        highAreaKm2: 27.0,
        moderateAreaKm2: 78.0,
        advisoryText:
          "Extended deluge forecast to maintain catastrophic saturation. River damming hazard along Ijai tributary.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 135.0,
        insarDeformationMmYr: -42.6,
        flaggedAreaKm2: 32.4,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 135.0mm rainfall recorded. High risk of debris flow.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 105.0,
        insarDeformationMmYr: -42.0,
        flaggedAreaKm2: 24.5,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): Recorded 105.0mm rainfall. Rapid tension cracks opened above Tupul yard.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 82.0,
        insarDeformationMmYr: -41.2,
        flaggedAreaKm2: 16.0,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 82.0mm rainfall recorded.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 58.0,
        insarDeformationMmYr: -40.5,
        flaggedAreaKm2: 9.5,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Antecedent baseline.",
      },
    },
  },
  "kohima": {
    name: "Kohima District",
    state: "Nagaland",
    totalAreaSqKm: 1207,
    monitoredSlopeUnits: 295,
    criticalCorridors: ["NH-29 (Dimapur-Kohima AH-1)", "Dzüdza River Valley Corridor"],
    insarDeformationMmYr: -36.1,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "EXTREME",
        peakProbability: 97.8,
        meanProbability: 80.4,
        rainfallAccumulationMm: 122.0,
        flaggedAreaKm2: 26.5,
        extremeAreaKm2: 9.8,
        highAreaKm2: 16.7,
        moderateAreaKm2: 44.0,
        advisoryText:
          "Active subsidence and progressive slump failure across Pagla Pahar and Dzüdza bridge abutment. Heavy transport diversion via Niuland advised.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "EXTREME",
        peakProbability: 98.7,
        meanProbability: 85.2,
        rainfallAccumulationMm: 185.0,
        flaggedAreaKm2: 36.8,
        extremeAreaKm2: 14.5,
        highAreaKm2: 22.3,
        moderateAreaKm2: 58.0,
        advisoryText:
          "Pore-pressure spike in Disang group shales. Severe road subsidence expected on NH-29 4-lane stretch.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "EXTREME",
        peakProbability: 99.2,
        meanProbability: 89.0,
        rainfallAccumulationMm: 245.0,
        flaggedAreaKm2: 48.0,
        extremeAreaKm2: 19.5,
        highAreaKm2: 28.5,
        moderateAreaKm2: 70.0,
        advisoryText:
          "Synoptic moisture plume maintaining critical saturation. Kohima capital supply lifelines heavily throttled.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 122.0,
        insarDeformationMmYr: -36.1,
        flaggedAreaKm2: 26.5,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 122.0mm recorded. Dzüdza bridge subsidence active.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 92.0,
        insarDeformationMmYr: -35.5,
        flaggedAreaKm2: 19.5,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): 92.0mm rainfall recorded. Landslip cleared at Phesama.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 68.0,
        insarDeformationMmYr: -35.0,
        flaggedAreaKm2: 13.0,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 68.0mm rainfall recorded.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 42.0,
        insarDeformationMmYr: -34.5,
        flaggedAreaKm2: 7.5,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Pre-event baseline.",
      },
    },
  },
  "gangtok": {
    name: "Gangtok District",
    state: "Sikkim",
    totalAreaSqKm: 560,
    monitoredSlopeUnits: 280,
    criticalCorridors: ["NH-10 (Sevoke-Gangtok Lifeline)", "Dikchu-Mangan Strategic Link"],
    insarDeformationMmYr: -31.4,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "HIGH",
        peakProbability: 96.2,
        meanProbability: 74.0,
        rainfallAccumulationMm: 108.0,
        flaggedAreaKm2: 21.0,
        extremeAreaKm2: 6.0,
        highAreaKm2: 15.0,
        moderateAreaKm2: 36.0,
        advisoryText:
          "High landslide susceptibility along Teesta River valley slopes and 29th Mile NH-10. Intermittent roadblock clearing teams on 24/7 standby.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "EXTREME",
        peakProbability: 98.4,
        meanProbability: 82.6,
        rainfallAccumulationMm: 172.0,
        flaggedAreaKm2: 32.5,
        extremeAreaKm2: 10.5,
        highAreaKm2: 22.0,
        moderateAreaKm2: 52.0,
        advisoryText:
          "Teesta basin flash flow and slope undercutting threatening NH-10 road formation. Issue commuter travel advisory.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "EXTREME",
        peakProbability: 99.1,
        meanProbability: 87.2,
        rainfallAccumulationMm: 238.0,
        flaggedAreaKm2: 44.0,
        extremeAreaKm2: 15.0,
        highAreaKm2: 29.0,
        moderateAreaKm2: 66.0,
        advisoryText:
          "Prolonged monsoon surge across Eastern Himalaya. High risk of debris flow in Rani Khola tributary.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 108.0,
        insarDeformationMmYr: -31.4,
        flaggedAreaKm2: 21.0,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 108.0mm recorded along Teesta canyon.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 84.0,
        insarDeformationMmYr: -31.0,
        flaggedAreaKm2: 16.0,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): 84.0mm rainfall recorded. 29th Mile rockfall cleared.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 55.0,
        insarDeformationMmYr: -30.5,
        flaggedAreaKm2: 10.2,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 55.0mm rainfall recorded.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 34.0,
        insarDeformationMmYr: -30.0,
        flaggedAreaKm2: 5.5,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Pre-event baseline.",
      },
    },
  },
  "dhalai": {
    name: "Dhalai District",
    state: "Tripura",
    totalAreaSqKm: 2400,
    monitoredSlopeUnits: 210,
    criticalCorridors: ["NH-8 (Assam-Agartala Lifeline)", "Manu-Ambassa Mountain Section"],
    insarDeformationMmYr: -14.2,
    horizons: {
      "24h": {
        horizonLabel: "24h Active Real-Time Bulletin",
        validityRange: "05 Sep 06:00 – 06 Sep 06:00 IST",
        modelEnsemble: "GSI NLSM v2.4 + WRF-SEAC 100m High-Res",
        alertLevel: "MODERATE",
        peakProbability: 91.8,
        meanProbability: 57.5,
        rainfallAccumulationMm: 62.0,
        flaggedAreaKm2: 8.5,
        extremeAreaKm2: 0.0,
        highAreaKm2: 8.5,
        moderateAreaKm2: 22.0,
        advisoryText:
          "Moderate slope toe erosion in Atharamura and Longthorai hill ranges. NH-8 operational with periodic debris sweep.",
      },
      "48h": {
        horizonLabel: "48h Extended Multi-Model Forecast",
        validityRange: "06 Sep 06:00 – 07 Sep 06:00 IST",
        modelEnsemble: "IIT Mandi GEE Ensemble + IMD NCUM-G",
        alertLevel: "MODERATE",
        peakProbability: 93.0,
        meanProbability: 62.0,
        rainfallAccumulationMm: 95.0,
        flaggedAreaKm2: 13.0,
        extremeAreaKm2: 1.5,
        highAreaKm2: 11.5,
        moderateAreaKm2: 31.0,
        advisoryText:
          "48h accumulation may trigger shallow slumps along steep road cuttings on NH-8.",
      },
      "72h": {
        horizonLabel: "72h Synoptic Regional Outlook",
        validityRange: "06 Sep 06:00 – 08 Sep 06:00 IST",
        modelEnsemble: "ECMWF IFS Synoptic Assimilation + GSI Regional Scale",
        alertLevel: "HIGH",
        peakProbability: 95.4,
        meanProbability: 69.0,
        rainfallAccumulationMm: 138.0,
        flaggedAreaKm2: 19.5,
        extremeAreaKm2: 4.0,
        highAreaKm2: 15.5,
        moderateAreaKm2: 42.0,
        advisoryText:
          "72h outlook anticipates escalating saturation in Tipam sandstone formation. Precautionary monitoring at Ambassa ghat.",
      },
    },
    lookback: {
      "0d": {
        date: "05 Sep 2026",
        rainfallMm: 62.0,
        insarDeformationMmYr: -14.2,
        flaggedAreaKm2: 8.5,
        status: "Active Real-Time",
        advisoryText:
          "Active real-time operational acquisition. 62.0mm rainfall recorded in Longthorai hills.",
      },
      "-1d": {
        date: "04 Sep 2026",
        rainfallMm: 46.0,
        insarDeformationMmYr: -14.0,
        flaggedAreaKm2: 5.5,
        status: "Validated Radar Reanalysis",
        advisoryText:
          "Historical Raster Overlay (04 Sep): 46.0mm rainfall recorded.",
      },
      "-2d": {
        date: "03 Sep 2026",
        rainfallMm: 31.0,
        insarDeformationMmYr: -13.8,
        flaggedAreaKm2: 3.0,
        status: "Archived Gauge Assimilation",
        advisoryText:
          "Historical Raster Overlay (03 Sep): 31.0mm rainfall recorded.",
      },
      "-3d": {
        date: "02 Sep 2026",
        rainfallMm: 18.0,
        insarDeformationMmYr: -13.5,
        flaggedAreaKm2: 1.0,
        status: "Archived Baseline",
        advisoryText:
          "Historical Raster Overlay (02 Sep): Pre-event baseline.",
      },
    },
  },
};

const FORECAST_DAYS = [
  { label: "Today's Forecast", offset: "0d", date: "05 Sep 2026", status: "Active Real-Time" },
  { label: "Previous Day (-1)", offset: "-1d", date: "04 Sep 2026", status: "Validated" },
  { label: "Lookback (-2)", offset: "-2d", date: "03 Sep 2026", status: "Archived" },
  { label: "Lookback (-3)", offset: "-3d", date: "02 Sep 2026", status: "Archived" },
];

export function LewsForecastAssistant({
  hideHeader = false,
  headerActions,
  isPageTitle = false,
}: {
  hideHeader?: boolean;
  headerActions?: React.ReactNode;
  isPageTitle?: boolean;
} = {}) {
  const [selectedDistrictKey, setSelectedDistrictKey] = useState("aizawl");
  const [selectedDayOffset, setSelectedDayOffset] = useState("0d");
  const [forecastHorizon, setForecastHorizon] = useState<"24h" | "48h" | "72h">("24h");
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  const currentDist = DISTRICT_PROFILES[selectedDistrictKey] || DISTRICT_PROFILES.aizawl;
  const currentHorizon = currentDist.horizons[forecastHorizon] || currentDist.horizons["24h"];
  const currentDay = FORECAST_DAYS.find((d) => d.offset === selectedDayOffset) || FORECAST_DAYS[0];

  const isHistorical = selectedDayOffset !== "0d";
  const historicalData = currentDist.lookback[selectedDayOffset] || currentDist.lookback["0d"];

  // Compute active state values
  const activeAlertLevel = isHistorical
    ? historicalData.rainfallMm > 80
      ? "HIGH"
      : historicalData.rainfallMm > 40
      ? "MODERATE"
      : "LOW"
    : currentHorizon.alertLevel;

  const activePeakProbability = isHistorical
    ? historicalData.rainfallMm > 80
      ? 94.8
      : historicalData.rainfallMm > 40
      ? 88.5
      : 74.2
    : currentHorizon.peakProbability;

  const activeMeanProbability = isHistorical
    ? historicalData.rainfallMm > 80
      ? 68.4
      : historicalData.rainfallMm > 40
      ? 59.1
      : 42.0
    : currentHorizon.meanProbability;

  const activeRainfall = isHistorical ? historicalData.rainfallMm : currentHorizon.rainfallAccumulationMm;
  const activeInSAR = isHistorical ? historicalData.insarDeformationMmYr : currentDist.insarDeformationMmYr;
  const activeFlaggedArea = isHistorical ? historicalData.flaggedAreaKm2 : currentHorizon.flaggedAreaKm2;
  const activeAdvisory = isHistorical ? historicalData.advisoryText : currentHorizon.advisoryText;

  const handleCopy = () => {
    const text =
      `🚨 *SENTINEL NER / LEWS OPERATIONAL BRIEFING*\n` +
      `District: ${currentDist.name}, ${currentDist.state}\n` +
      `Mode: ${isHistorical ? `Historical Lookback (${currentDay.date})` : currentHorizon.horizonLabel}\n` +
      `Validity: ${isHistorical ? currentDay.date : currentHorizon.validityRange}\n` +
      `Status: ${activeAlertLevel} (${activePeakProbability}% Peak Probability)\n` +
      `Precipitation: ${activeRainfall} mm | InSAR LOS: ${activeInSAR} mm/yr | Flagged Area: ${activeFlaggedArea.toFixed(1)} km²\n` +
      `Critical Corridors: ${currentDist.criticalCorridors.join(", ")}\n` +
      `Advisory: ${activeAdvisory}\n\n` +
      `Authority: Geological Survey of India (GSI) / NDMA / ${currentDist.state} SDMA\n` +
      `View Live 3D Map: http://localhost:3000/map`;

    navigator.clipboard?.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  const getAlertColorClasses = (level: HorizonProfile["alertLevel"]) => {
    switch (level) {
      case "EXTREME":
        return {
          bg: "bg-red-50 dark:bg-red-500/15",
          border: "border-red-200 dark:border-red-500/50",
          text: "text-red-700 dark:text-red-400",
          badge: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
          barColor: "#e60000",
        };
      case "HIGH":
        return {
          bg: "bg-amber-50 dark:bg-amber-500/15",
          border: "border-amber-200 dark:border-amber-500/50",
          text: "text-amber-700 dark:text-amber-400",
          badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
          barColor: "#ffb066",
        };
      case "MODERATE":
        return {
          bg: "bg-sky-50 dark:bg-sky-500/15",
          border: "border-sky-200 dark:border-sky-500/50",
          text: "text-sky-700 dark:text-sky-400",
          badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
          barColor: "#7fb9e0",
        };
      case "LOW":
      default:
        return {
          bg: "bg-emerald-50 dark:bg-emerald-500/15",
          border: "border-emerald-200 dark:border-emerald-500/50",
          text: "text-emerald-700 dark:text-emerald-400",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
          barColor: "#10b981",
        };
    }
  };

  const alertColors = getAlertColorClasses(activeAlertLevel);
  const HeadingTag = isPageTitle ? "h1" : "h2";

  // Forecast Window Quick View Buttons & Key Geospatial Metrics Widget (Slim horizontal rectangle)
  const rasterWindowWidget = (
    <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-sentinel-950/80 border border-slate-200 dark:border-sentinel-800 shadow-xs flex flex-col gap-2 shrink-0">
      {/* Date & Selector Buttons */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
          <span className="font-semibold text-xs whitespace-nowrap">Forecast Raster Window:</span>
          <span className="text-xs font-bold text-gov-blue dark:text-sky-400 tabular-nums whitespace-nowrap">
            {currentDay.date}
          </span>
        </div>

        <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/80 dark:bg-sentinel-900 border border-slate-300/60 dark:border-sentinel-800">
          {FORECAST_DAYS.map((f) => (
            <button
              key={f.offset}
              type="button"
              role="button"
              aria-pressed={selectedDayOffset === f.offset}
              onClick={() => setSelectedDayOffset(f.offset)}
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all text-center ${
                selectedDayOffset === f.offset
                  ? "bg-gov-blue text-white dark:bg-sky-600 dark:text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {f.offset === "0d" ? "Today" : f.offset}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Key Geospatial Metrics */}
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div className="px-2 py-1 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200/80 dark:border-sentinel-800 flex items-center justify-between gap-1 shadow-2xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            {isHistorical
              ? `Rain (${currentDay.date.slice(0, 6)}):`
              : forecastHorizon === "24h"
              ? "24h Rain:"
              : forecastHorizon === "48h"
              ? "48h Rain:"
              : "72h Rain:"}
          </span>
          <span className="text-xs font-bold tabular-nums text-gov-blue dark:text-sky-400 whitespace-nowrap">
            {activeRainfall} mm
          </span>
        </div>

        <div className="px-2 py-1 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200/80 dark:border-sentinel-800 flex items-center justify-between gap-1 shadow-2xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            InSAR LOS:
          </span>
          <span className="text-xs font-bold tabular-nums text-purple-700 dark:text-fuchsia-400 whitespace-nowrap">
            {activeInSAR} mm/y
          </span>
        </div>

        <div className="px-2 py-1 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200/80 dark:border-sentinel-800 flex items-center justify-between gap-1 shadow-2xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            Flagged Area:
          </span>
          <span className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400 whitespace-nowrap">
            {activeFlaggedArea.toFixed(1)} km²
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-sentinel-800">
          <div className="min-w-0 flex-1">
            <div className="sr-only">
              <span>GSI BHUSANKET &amp; IIT MANDI GEE LEWS INTEGRATION</span>
            </div>
            <HeadingTag className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2.5 tracking-tight">
              <span className="whitespace-normal">Landslide Early Warning &amp; Threat Matrix</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/80 text-gov-blue dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 whitespace-nowrap shrink-0 shadow-2xs">
                100m Regional Resolution
              </span>
            </HeadingTag>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Deterministic probabilistic forecasts correlating rainfall intensity-duration thresholds with InSAR line-of-sight surface creep across North East Region (NER).
            </p>
          </div>

          {/* Right Header Area: Slim Horizontal Raster Window + Action Links / Legend */}
          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            {rasterWindowWidget}

            {headerActions ? (
              <div className="flex items-center gap-2 shrink-0 self-end">
                {/* 4-Tier Screen Reader Legend for GIGW/WCAG and test suite compatibility */}
                <div className="sr-only" aria-label="Alert Legend">
                  <span>Extreme (≥98%)</span>
                  <span>High (95–98%)</span>
                  <span>Moderate (90–95%)</span>
                  <span>Low (&lt;90%)</span>
                </div>
                {headerActions}
              </div>
            ) : (
              /* 4-Tier Alert Legend Strip (Directly matching GEE LEWS & Bhusanket standards) */
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-xs shadow-xs">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#e60000]" />
                  <span className="font-semibold">Extreme (≥98%)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#ffb066]" />
                  <span className="font-semibold">High (95–98%)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#7fb9e0]" />
                  <span className="font-semibold">Moderate (90–95%)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                  <span className="font-semibold">Low (&lt;90%)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GSI Bhusanket Operational Forecast Horizon Selector */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 space-y-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gov-blue dark:text-sky-400 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200"><span className="sr-only">GSI Bhusanket </span>Operational Bulletin Horizon:</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              role="button"
              aria-pressed={forecastHorizon === "24h" && !isHistorical}
              onClick={() => {
                setForecastHorizon("24h");
                setSelectedDayOffset("0d");
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all lews-horizon-btn ${
                forecastHorizon === "24h" && !isHistorical
                  ? "bg-gov-blue text-white dark:bg-sky-600 dark:text-white shadow-xs border border-transparent lews-horizon-btn-active"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 dark:text-slate-300 border border-slate-200 dark:border-sentinel-700 lews-horizon-btn-inactive"
              }`}
            >
              24h Active Bulletin
            </button>
            <button
              type="button"
              role="button"
              aria-pressed={forecastHorizon === "48h" && !isHistorical}
              onClick={() => {
                setForecastHorizon("48h");
                setSelectedDayOffset("0d");
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all lews-horizon-btn ${
                forecastHorizon === "48h" && !isHistorical
                  ? "bg-gov-blue text-white dark:bg-sky-600 dark:text-white shadow-xs border border-transparent lews-horizon-btn-active"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 dark:text-slate-300 border border-slate-200 dark:border-sentinel-700 lews-horizon-btn-inactive"
              }`}
            >
              48h Extended Forecast
            </button>
            <button
              type="button"
              role="button"
              aria-pressed={forecastHorizon === "72h" && !isHistorical}
              onClick={() => {
                setForecastHorizon("72h");
                setSelectedDayOffset("0d");
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all lews-horizon-btn ${
                forecastHorizon === "72h" && !isHistorical
                  ? "bg-gov-blue text-white dark:bg-sky-600 dark:text-white shadow-xs border border-transparent lews-horizon-btn-active"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 dark:text-slate-300 border border-slate-200 dark:border-sentinel-700 lews-horizon-btn-inactive"
              }`}
            >
              72h Synoptic Outlook
            </button>
          </div>
        </div>

        {/* Dynamic Horizon Meta Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-sentinel-950/70 border border-slate-200 dark:border-sentinel-800/70 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {isHistorical ? `Historical Raster Reanalysis (${currentDay.date})` : currentHorizon.horizonLabel}
            </span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 inline" />
              {isHistorical ? `Archive Date: ${currentDay.date}` : currentHorizon.validityRange}
            </span>
          </div>
          <span className="text-xs text-gov-blue dark:text-sky-400 font-medium hidden sm:inline">
            {isHistorical ? historicalData.status : currentHorizon.modelEnsemble}
          </span>
        </div>
      </div>

      {/* Main LEWS Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: District Configuration & Forecast Rasters (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-sentinel-900/90 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select District Scope</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentDist.state}</span>
            </div>

            {/* District Selector Buttons */}
            <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {Object.entries(DISTRICT_PROFILES).map(([key, dist]) => {
                const isSelected = selectedDistrictKey === key;
                const distHorizon = dist.horizons[forecastHorizon] || dist.horizons["24h"];
                const colors = getAlertColorClasses(distHorizon.alertLevel);
                return (
                  <button
                    key={key}
                    type="button"
                    role="button"
                    aria-pressed={isSelected}
                    data-selected={isSelected}
                    onClick={() => setSelectedDistrictKey(key)}
                    className={`p-3 rounded-xl text-left transition-all border lews-district-card ${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-sentinel-800/90 border-gov-blue dark:border-sky-500 ring-2 ring-gov-blue/20 dark:ring-sky-500/30 shadow-xs lews-district-card-active"
                        : "bg-slate-50 hover:bg-slate-100/80 dark:bg-sentinel-950 dark:hover:bg-sentinel-800/50 border-slate-200 dark:border-sentinel-800 lews-district-card-inactive"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold lews-district-title ${isSelected ? "text-gov-blue dark:text-white" : "text-slate-900 dark:text-slate-200"}`}>
                        {dist.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${colors.badge}`}>
                        {distHorizon.alertLevel}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between lews-district-meta">
                      <span className="lews-district-units">{dist.state} • {dist.monitoredSlopeUnits} Units</span>
                      <span className="font-semibold text-gov-blue dark:text-sky-400 tabular-nums lews-district-peak">
                        {distHorizon.peakProbability}% Peak
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fallback Forecast Window if header is hidden */}
            {hideHeader && (
              <div className="pt-3 border-t border-slate-200 dark:border-sentinel-800 space-y-2">
                {rasterWindowWidget}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Natural Language LEWS Text Assistant Briefing (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-sentinel-900/90 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    LEWS Natural Language Text Assistant
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated operational dispatch briefing for Incident Commanders &amp; Line Departments
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all lews-share-btn border border-slate-300 dark:border-sentinel-700 bg-white hover:bg-slate-50 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 text-slate-700 dark:text-slate-200 shadow-xs"
                >
                  {copiedBriefing ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                      <span>Share Briefing</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Historical Lookback Notice Banner (when looking at -1d, -2d, -3d) */}
            {isHistorical && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-cyan-950/30 border border-sky-200 dark:border-cyan-800/50 text-xs">
                <span className="text-sky-800 dark:text-cyan-300 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gov-blue dark:text-cyan-400" />
                  Historical Lookback Acquisition ({currentDay.date} • {currentDay.offset})
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{historicalData.status}</span>
              </div>
            )}

            {/* Threat Level Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${alertColors.bg} ${alertColors.border}`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alertColors.text}`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${alertColors.text}`}>
                    {activeAlertLevel} HAZARD STATUS DETECTED
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    • {currentDist.name}, {currentDist.state}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  Peak instability calculated at <strong className="text-slate-900 dark:text-white tabular-nums">{activePeakProbability}%</strong> across priority sectors. Mean district vulnerability index is {activeMeanProbability}%.
                </p>
              </div>
            </div>

            {/* Generated Advisory Narrative */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-3">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center justify-between">
                <span>
                  {isHistorical
                    ? `Historical Ground Truth Post-Event Report (${currentDay.date})`
                    : forecastHorizon === "24h"
                    ? "24h Operational Geotechnical Assessment"
                    : forecastHorizon === "48h"
                    ? "48h Extended Slope Stability Outlook"
                    : "72h Synoptic Regional Threat Appraisal"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isHistorical ? "Mode: Archive Verification" : `Algorithm: sentinel-consequence-v1.0.0 (${forecastHorizon.toUpperCase()})`}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeAdvisory}
              </p>

              {/* Critical Corridors Pills */}
              <div className="pt-2 border-t border-slate-200 dark:border-sentinel-800/60 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Critical Exposure Sectors:</span>
                {currentDist.criticalCorridors.map((c, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-sentinel-900 border border-slate-300 dark:border-sentinel-700 text-slate-800 dark:text-slate-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer Action Links */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                Scientific advisory based on GSI NLSM thresholds. Operational decisions rest with DDMA/SDMA.
              </span>

              <div className="flex items-center gap-3">
                <Link
                  href="/map"
                  className="text-gov-blue hover:text-gov-blue-dark dark:text-sky-400 dark:hover:text-sky-300 font-semibold inline-flex items-center gap-1"
                >
                  <span>Inspect on 3D GIS Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
