"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudRain,
  AlertTriangle,
  Compass,
  Radio,
  Activity,
  Truck,
  Layers,
  Cpu,
  Gauge,
  Wifi,
  Users,
  ShieldCheck,
  FileCheck2,
  Bell,
  Building2,
  Server,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface MegaMenuItem {
  title: string;
  href: string;
  description?: string;
  badge?: string;
  badgeColor?: "cyan" | "amber" | "emerald" | "purple" | "rose";
  icon?: React.ComponentType<{ className?: string }>;
}

interface MegaMenuColumn {
  heading: string;
  headingTranslationKey?: string;
  items: MegaMenuItem[];
}

interface MegaMenuCategory {
  id: string;
  label: string;
  translationKey?: string;
  href: string;
  accentColor: string;
  accentBorder: string;
  accentText: string;
  columns: MegaMenuColumn[];
  featuredCard?: {
    title: string;
    description: string;
    tag: string;
    href: string;
  };
}

const MEGA_MENU_DATA: MegaMenuCategory[] = [
  {
    id: "early-warning",
    label: "EARLY WARNING & INTEL",
    translationKey: "mega.earlyWarning",
    href: "/early-warning",
    accentColor: "border-cyan-500 text-cyan-400",
    accentBorder: "border-cyan-500/30",
    accentText: "text-cyan-400",
    columns: [
      {
        heading: "SATELLITE HYDROLOGY",
        headingTranslationKey: "mega.col.satHydrology",
        items: [
          {
            title: "Precipitation Telemetry",
            href: "/hydrology",
            description: "NASA LHASA v2 GPM IMERG 7-day ARI",
            badge: "GPM IMERG",
            badgeColor: "cyan",
            icon: CloudRain,
          },
          {
            title: "SMAP Soil Saturation",
            href: "/hydrology",
            description: "82.4% Volumetric pore water saturation",
            badge: "L-Band",
            badgeColor: "cyan",
            icon: Activity,
          },
          {
            title: "Antecedent Rainfall Trend",
            href: "/hydrology",
            description: "7-day cumulative rainfall decay index",
            icon: CloudRain,
          },
        ],
      },
      {
        heading: "GSI & IIT MANDI LEWS",
        headingTranslationKey: "mega.col.gsiLews",
        items: [
          {
            title: "Landslide Threat Matrix",
            href: "/early-warning",
            description: "4-Tier intensity-duration threshold forecasts",
            badge: "4-Tier",
            badgeColor: "amber",
            icon: AlertTriangle,
          },
          {
            title: "Operational Bulletin Horizons",
            href: "/early-warning",
            description: "24h Active, 48h Extended & 72h Synoptic outlook",
            icon: AlertTriangle,
          },
          {
            title: "AI Natural Language Briefing",
            href: "/early-warning",
            description: "Automated situational dispatch briefing",
            badge: "AI Briefing",
            badgeColor: "emerald",
            icon: Sparkles,
          },
        ],
      },
      {
        heading: "SPATIAL & INSAR RADAR",
        headingTranslationKey: "mega.col.spatialRadar",
        items: [
          {
            title: "3D GIS Spatial Map",
            href: "/map",
            description: "High-resolution slope units & terrain elevation",
            badge: "3D GIS",
            badgeColor: "cyan",
            icon: Compass,
          },
          {
            title: "InSAR Creep Watch",
            href: "/creep-watch",
            description: "Interferometric line-of-sight surface creep",
            badge: "Sentinel-1",
            badgeColor: "purple",
            icon: Radio,
          },
          {
            title: "Quantitative Risk Engine",
            href: "/risk",
            description: "Transparent model provenance and weight calibration",
            icon: Activity,
          },
        ],
      },
    ],
    featuredCard: {
      title: "GSI Operational Advisory",
      description: "Aizawl Western Ridge peak instability at 96.4%. Mandatory dual-custody alert stage active.",
      tag: "HIGH THREAT",
      href: "/early-warning",
    },
  },
  {
    id: "infrastructure",
    label: "INFRASTRUCTURE & LIFELINES",
    translationKey: "mega.infrastructure",
    href: "/highways",
    accentColor: "border-amber-500 text-amber-400",
    accentBorder: "border-amber-500/30",
    accentText: "text-amber-400",
    columns: [
      {
        heading: "HIGHWAY CORRIDORS",
        headingTranslationKey: "mega.col.highways",
        items: [
          {
            title: "Arterial Highway Status",
            href: "/highways",
            description: "NH-54, NH-108 and Lengpui Express corridors",
            badge: "BRO Pushpak",
            badgeColor: "amber",
            icon: Truck,
          },
          {
            title: "NH-54 (Aizawl–Lunglei)",
            href: "/highways",
            description: "KM 42.4 single-lane restricted (650m³ debris)",
            badge: "SINGLE LANE",
            badgeColor: "amber",
            icon: Truck,
          },
          {
            title: "Lengpui Airport Lifeline",
            href: "/highways",
            description: "KM 9.8 (Tanhril) clear nominal traffic flow",
            badge: "CLEAR",
            badgeColor: "emerald",
            icon: Truck,
          },
        ],
      },
      {
        heading: "SATELLITE SCARP INVENTORY",
        headingTranslationKey: "mega.col.scarpInventory",
        items: [
          {
            title: "ISRO NRSC Bhuvan DMS",
            href: "/highways",
            description: "Satellite scarp identification & scarp inventory",
            badge: "NRSC Bhuvan",
            badgeColor: "cyan",
            icon: Layers,
          },
          {
            title: "Durtlang Scarp Zone A",
            href: "/highways",
            description: "Active scarp displacement detection",
            icon: AlertTriangle,
          },
          {
            title: "Bairabi–Sairang Rail Link",
            href: "/highways",
            description: "Strategic rail corridor access links",
            icon: Truck,
          },
        ],
      },
      {
        heading: "CONSEQUENCE INTELLIGENCE",
        headingTranslationKey: "mega.col.consequence",
        items: [
          {
            title: "Lifeline Consequence Graph",
            href: "/consequences",
            description: "Cross-sector cascading failure dependencies",
            badge: "Graph Engine",
            badgeColor: "purple",
            icon: Layers,
          },
          {
            title: "Hospital & Supply Cutoffs",
            href: "/consequences",
            description: "Civic lifeline exposure & isolation risk",
            icon: Layers,
          },
          {
            title: "Critical Asset Matrix",
            href: "/consequences",
            description: "Bridge, culvert and power line assets",
            icon: Layers,
          },
        ],
      },
    ],
    featuredCard: {
      title: "BRO Project Pushpak Alert",
      description: "Heavy excavators pre-staged at KM 40 depot. 4-hour clearance ETA for Selesih obstruction.",
      tag: "BRO LOGISTICS",
      href: "/highways",
    },
  },
  {
    id: "geotech",
    label: "GEOTECHNICAL & IOT",
    translationKey: "mega.geotech",
    href: "/geotech",
    accentColor: "border-emerald-500 text-emerald-400",
    accentBorder: "border-emerald-500/30",
    accentText: "text-emerald-400",
    columns: [
      {
        heading: "SUBSURFACE STABILITY (Fs)",
        headingTranslationKey: "mega.col.subsurfaceFs",
        items: [
          {
            title: "KIGAM Slope Stability Meter",
            href: "/geotech",
            description: "Real-time Factor of Safety (Fs = 1.08)",
            badge: "Fs 1.08 WATCH",
            badgeColor: "amber",
            icon: Gauge,
          },
          {
            title: "Limit Equilibrium Model",
            href: "/geotech",
            description: "Infinite slope slip plane shear physics",
            icon: Activity,
          },
          {
            title: "Critical Creep Thresholds",
            href: "/geotech",
            description: "Pore pressure vs effective stress analysis",
            icon: Gauge,
          },
        ],
      },
      {
        heading: "AMRITA AWNA PIEZOMETERS",
        headingTranslationKey: "mega.col.piezometers",
        items: [
          {
            title: "Subsurface Pressure Profile",
            href: "/geotech",
            description: "3.0m, 6.0m and 9.0m depth piezometer array",
            badge: "IoT Array",
            badgeColor: "emerald",
            icon: Cpu,
          },
          {
            title: "Bedrock Slip Plane (9.0m)",
            href: "/geotech",
            description: "42.1 kPa (+75% over baseline saturation)",
            badge: "ELEVATED",
            badgeColor: "rose",
            icon: Cpu,
          },
          {
            title: "LoRa WSN Mesh Health",
            href: "/geotech",
            description: "Solar battery 12.8V, RSSI -82 dBm, 99.9% delivery",
            badge: "99.9% LIVE",
            badgeColor: "emerald",
            icon: Wifi,
          },
        ],
      },
      {
        heading: "FIELD SENSORS & COMMUNITY",
        headingTranslationKey: "mega.col.sensorNetwork",
        items: [
          {
            title: "Field Sensor Network",
            href: "/sensors",
            description: "Geotechnical tiltmeters, rain gauges and piezometers",
            badge: "Field Network",
            badgeColor: "cyan",
            icon: Wifi,
          },
          {
            title: "Community Hazard Reports",
            href: "/community",
            description: "Crowdsourced ground-truth hazard validation",
            badge: "Crowdsourced",
            badgeColor: "purple",
            icon: Users,
          },
          {
            title: "Verification Clustering",
            href: "/community",
            description: "AI spatial clustering of citizen hazard tickets",
            icon: Users,
          },
        ],
      },
    ],
    featuredCard: {
      title: "Subsurface Pore Pressure",
      description: "Continuous monsoon rainfall has elevated pore water pressure along the 34° sandstone bedding plane.",
      tag: "LIMIT EQUILIBRIUM",
      href: "/geotech",
    },
  },
  {
    id: "operations",
    label: "OPERATIONS & DISPATCH",
    translationKey: "mega.operations",
    href: "/operations",
    accentColor: "border-purple-500 text-purple-400",
    accentBorder: "border-purple-500/30",
    accentText: "text-purple-400",
    columns: [
      {
        heading: "DECISION SUPPORT & ACTIONS",
        headingTranslationKey: "mega.col.actions",
        items: [
          {
            title: "Operational Action Center",
            href: "/#action-center",
            description: "Real-time decision queue and situation overview",
            badge: "Command Center",
            badgeColor: "cyan",
            icon: ShieldCheck,
          },
          {
            title: "Human-Authorized Actions",
            href: "/operations",
            description: "Dual-custody action control and road closures",
            badge: "Dual-Custody",
            badgeColor: "amber",
            icon: ShieldCheck,
          },
          {
            title: "Incident Commander Queue",
            href: "/operations",
            description: "Ranked time-bound actions awaiting sign-off",
            icon: ShieldCheck,
          },
        ],
      },
      {
        heading: "WARNING LEDGER & BROADCAST",
        headingTranslationKey: "mega.col.ledger",
        items: [
          {
            title: "Audit-Grade Warning Ledger",
            href: "/ledger",
            description: "Cryptographically sealed, tamper-evident log",
            badge: "Immutable",
            badgeColor: "purple",
            icon: FileCheck2,
          },
          {
            title: "Multi-Channel Warning Delivery",
            href: "/alerts",
            description: "CAP, SMS, Cell Broadcast, Siren dispatches",
            badge: "Multi-Channel",
            badgeColor: "emerald",
            icon: Bell,
          },
          {
            title: "Delivery Receipts & Offline Queue",
            href: "/alerts",
            description: "SMS delivery tracking and telemetry",
            icon: Bell,
          },
        ],
      },
      {
        heading: "FIELD & COMMUNITY",
        headingTranslationKey: "mega.col.field",
        items: [
          {
            title: "Crowdsourced Field Reports",
            href: "/community",
            description: "Decentralized citizen ground-truth reports",
            badge: "Reports",
            badgeColor: "purple",
            icon: Users,
          },
          {
            title: "Field Sensors & Telemetry",
            href: "/sensors",
            description: "LoRa tiltmeters, rain gauges & piezometers",
            badge: "WSN Mesh",
            badgeColor: "emerald",
            icon: Cpu,
          },
        ],
      },
    ],
    featuredCard: {
      title: "Dual-Custody Governance",
      description: "Zero autonomous action: public alerts and arterial road closures strictly require verified Duty Officer authorization.",
      tag: "DUAL-CUSTODY",
      href: "/operations",
    },
  },
];

export function SentinelMegaMenu() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close menu when navigating to a new path
  useEffect(() => {
    setActiveCategory(null);
  }, [pathname]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setActiveCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveCategory(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMouseEnter = (catId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveCategory(catId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 200);
  };

  const toggleCategory = (catId: string) => {
    setActiveCategory((prev) => (prev === catId ? null : catId));
  };

  const activeCategoryData = MEGA_MENU_DATA.find((c) => c.id === activeCategory);

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case "cyan":
        return "badge-cyan bg-cyan-50 text-cyan-700 border-cyan-200/90 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800/80";
      case "amber":
        return "badge-amber bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80";
      case "emerald":
        return "badge-emerald bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80";
      case "purple":
        return "badge-purple bg-purple-50 text-purple-800 border-purple-200/90 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/80";
      case "rose":
        return "badge-rose bg-rose-50 text-rose-800 border-rose-200/90 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const getDomainTheme = (catId: string) => {
    switch (catId) {
      case "early-warning":
        return {
          gradient: "from-cyan-500 via-blue-600 to-indigo-600",
          ping: "bg-cyan-400",
          dot: "bg-cyan-500",
          tagLabel: "TACTICAL ALERT",
          colDot: "bg-cyan-500",
          featuredTag: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700",
          cardBg: "bg-gradient-to-br from-amber-50/90 via-rose-50/40 to-white dark:from-amber-950/30 dark:via-slate-900/90 dark:to-slate-950 border-amber-300/70 dark:border-amber-700/50",
          statusChannel: "NDMA National Protocol",
          verification: "GSI Certified",
        };
      case "infrastructure":
        return {
          gradient: "from-amber-500 via-orange-600 to-rose-600",
          ping: "bg-amber-400",
          dot: "bg-amber-500",
          tagLabel: "CORRIDOR CLEARANCE",
          colDot: "bg-amber-500",
          featuredTag: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700",
          cardBg: "bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white dark:from-amber-950/30 dark:via-slate-900/90 dark:to-slate-950 border-amber-300/70 dark:border-amber-700/50",
          statusChannel: "BRO Project Pushpak",
          verification: "NHIDCL Verified",
        };
      case "geotech":
        return {
          gradient: "from-emerald-500 via-teal-600 to-cyan-600",
          ping: "bg-emerald-400",
          dot: "bg-emerald-500",
          tagLabel: "SUBSURFACE ARRAY",
          colDot: "bg-emerald-500",
          featuredTag: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700",
          cardBg: "bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/30 dark:via-slate-900/90 dark:to-slate-950 border-emerald-300/70 dark:border-emerald-700/50",
          statusChannel: "Amrita AWNA LoRa WSN",
          verification: "KIGAM Calibrated",
        };
      case "operations":
        return {
          gradient: "from-purple-500 via-indigo-600 to-blue-600",
          ping: "bg-purple-400",
          dot: "bg-purple-500",
          tagLabel: "DUAL-CUSTODY",
          colDot: "bg-purple-500",
          featuredTag: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700",
          cardBg: "bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-white dark:from-purple-950/30 dark:via-slate-900/90 dark:to-slate-950 border-purple-300/70 dark:border-purple-700/50",
          statusChannel: "Duty Officer Ledger",
          verification: "Multi-Signature Sealed",
        };
      default:
        return {
          gradient: "from-gov-blue via-cyan-500 to-gov-saffron",
          ping: "bg-gov-blue",
          dot: "bg-gov-blue",
          tagLabel: "INTELLIGENCE",
          colDot: "bg-gov-blue",
          featuredTag: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700",
          cardBg: "bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800",
          statusChannel: "Sentinel Core Feed",
          verification: "GSI Verified",
        };
    }
  };

  return (
    <div
      ref={menuContainerRef}
      className="static select-none"
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Category Strip */}
      <nav
        aria-label="Domain Intelligence Navigation"
        className="flex items-center space-x-1 xl:space-x-1.5 text-xs font-bold overflow-x-auto no-scrollbar py-0.5"
      >
        {MEGA_MENU_DATA.map((cat) => {
          const isOpen = activeCategory === cat.id;
          const isCategoryActive = cat.columns.some((col) =>
            col.items.some((item) => pathname === item.href)
          );

          return (
            <div key={cat.id} className="static" onMouseEnter={() => handleMouseEnter(cat.id)}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                aria-expanded={isOpen}
                aria-controls={`mega-menu-${cat.id}`}
                className={`sentinel-category-btn flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all uppercase text-[11px] font-bold tracking-wide whitespace-nowrap ${
                  isOpen
                    ? "bg-white/20 text-white shadow-sm ring-1 ring-white/30 backdrop-blur-sm"
                    : isCategoryActive
                    ? "active text-amber-300 bg-white/10 ring-1 ring-amber-400/30 font-bold"
                    : "text-white/95 hover:text-white hover:bg-white/15"
                }`}
              >
                <span className="font-bold tracking-wide">{cat.translationKey ? t(cat.translationKey, cat.label) : cat.label}</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-amber-300" : "text-white/70"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </nav>

      {/* Multi-Column Mega Dropdown Panel */}
      {activeCategory && activeCategoryData && (() => {
        const theme = getDomainTheme(activeCategoryData.id);

        return (
          <div
            id={`mega-menu-${activeCategoryData.id}`}
            role="region"
            aria-label={`${activeCategoryData.label} Navigation Menu`}
            onMouseEnter={() => {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            }}
            className="sentinel-mega-dropdown absolute left-0 right-0 top-full w-full max-h-[85vh] overflow-y-auto bg-white/98 dark:bg-slate-950/98 backdrop-blur-2xl border-x border-b border-slate-200 dark:border-slate-800/90 rounded-b-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] z-50 text-slate-900 dark:text-white transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1"
          >
            {/* Top Domain Gradient Accent Stripe */}
            <div className={`h-1 w-full bg-gradient-to-r ${theme.gradient}`} />

            <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6 sm:py-7">
              {/* Top Domain Context Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-200/90 dark:border-slate-800/80 gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3 items-center justify-center shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.ping}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.dot}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black tracking-wider text-slate-900 dark:text-white uppercase font-heading">
                        {activeCategoryData.translationKey ? t(activeCategoryData.translationKey, activeCategoryData.label) : activeCategoryData.label}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                        {theme.tagLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Curated operational domain telemetry &amp; decision support
                    </p>
                  </div>
                </div>

                <Link
                  href={activeCategoryData.href}
                  onClick={() => setActiveCategory(null)}
                  className="mega-action-link group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-gov-blue dark:text-cyan-400 bg-blue-50/80 hover:bg-gov-blue hover:text-white dark:bg-cyan-950/40 dark:hover:bg-cyan-500 dark:hover:text-slate-950 border border-blue-200/80 dark:border-cyan-800/60 transition-all duration-200 shadow-2xs hover:shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <span>{t("mega.exploreDomain", "Explore Domain Overview")}</span>
                  <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              {/* Multi-Column Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8">
                {activeCategoryData.columns.map((col, colIdx) => (
                  <div key={colIdx} className="space-y-3.5">
                    {/* Column Heading with Accent Highlight */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/90 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${theme.colDot}`} />
                        <h4 className="mega-column-heading text-[11px] font-mono font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                          {col.headingTranslationKey ? t(col.headingTranslationKey, col.heading) : col.heading}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
                        0{colIdx + 1}
                      </span>
                    </div>

                    {/* Column Items */}
                    <ul className="space-y-1.5">
                      {col.items.map((item, itemIdx) => {
                        const Icon = item.icon;
                        const isItemActive = pathname === item.href;

                        return (
                          <li key={itemIdx}>
                            <Link
                              href={item.href}
                              onClick={() => setActiveCategory(null)}
                              className={`mega-item-link group flex items-start gap-2.5 p-2 rounded-xl transition-all duration-200 border ${
                                isItemActive
                                  ? "active bg-blue-50/90 dark:bg-cyan-950/60 border-blue-300 dark:border-cyan-700/80 text-blue-900 dark:text-cyan-200 shadow-2xs"
                                  : "hover:bg-slate-50/90 dark:hover:bg-slate-900/70 hover:border-slate-200/80 dark:hover:border-slate-800 border-transparent text-slate-700 dark:text-slate-300 hover:shadow-2xs"
                              }`}
                            >
                              {Icon && (
                                <div className="mega-item-icon-box mt-0.5 p-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-gov-blue group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-slate-950 group-hover:border-transparent group-hover:scale-105 group-hover:shadow-2xs transition-all duration-200 shrink-0">
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="mega-item-title text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-gov-blue dark:group-hover:text-cyan-300 transition-colors">
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <span
                                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 tracking-wide uppercase ${getBadgeClass(
                                        item.badgeColor
                                      )}`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="mega-item-desc text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 leading-snug mt-0.5 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                {/* Featured Domain Highlight Card (4th Column) */}
                {activeCategoryData.featuredCard && (
                  <div className={`mega-featured-card flex flex-col justify-between p-5 rounded-2xl border shadow-xs transition-all duration-200 relative overflow-hidden ${theme.cardBg}`}>
                    {/* Ambient Glow */}
                    <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-current opacity-5 blur-2xl pointer-events-none" />

                    <div className="space-y-3.5 relative z-10">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-2xs ${theme.featuredTag}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          {activeCategoryData.featuredCard.tag}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                          INTELLIGENCE
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h5 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                          {activeCategoryData.featuredCard.title}
                        </h5>
                        <p className="mega-item-desc text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {activeCategoryData.featuredCard.description}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2 text-[11px] font-sans">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Protocol:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{theme.statusChannel}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Verification:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> {theme.verification}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={activeCategoryData.featuredCard.href}
                      onClick={() => setActiveCategory(null)}
                      className="mega-featured-btn mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gov-blue hover:bg-gov-blue-dark !text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:!text-slate-950 font-bold text-xs shadow-sm hover:shadow-md transition-all group relative z-10"
                    >
                      <span>Open Operational View</span>
                      <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Bottom Quick-Telemetry Status Bar */}
              <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Multi-Agency Satellite &amp; IoT Feed Active</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
                    <span>Dual-Custody Decision Authorization</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  <span>DISPATCH: LIVE</span>
                  <span>•</span>
                  <span>NDMA PROTOCOL v3.2</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
