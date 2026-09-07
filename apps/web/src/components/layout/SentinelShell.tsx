"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Radio,
  Clock,
  Menu,
  X,
  Compass,
  Activity,
  Layers,
  FileCheck2,
  ShieldCheck,
  Users,
  Server,
  Building2,
  LogOut,
  LogIn,
  Bell,
  Cpu,
  CloudRain,
  AlertTriangle,
  Gauge,
  Truck,
  Sun,
  Moon,
  Eye,
  Globe,
  ExternalLink,
  Phone,
  Mail,
  Search,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { SentinelMegaMenu } from "./SentinelMegaMenu";
import { CookieConsentBanner } from "./CookieConsentBanner";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

interface SentinelShellProps {
  children: React.ReactNode;
}

export interface NavItem {
  label: string;
  translationKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: "green" | "amber" | "blue" | "purple" | "red";
  description?: string;
}

export interface NavGroup {
  id: string;
  title: string;
  translationKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeType?: "green" | "amber" | "blue" | "purple" | "red";
  items: NavItem[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   ORGANIZED NAVIGATION DATA & FEATURE GROUPS
   ═══════════════════════════════════════════════════════════════════════════ */

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "surveillance",
    title: "Surveillance & GIS",
    translationKey: "nav.group.surveillance",
    icon: Compass,
    badge: "3D GIS",
    badgeType: "blue",
    items: [
      {
        label: "Command Center",
        translationKey: "nav.commandCenter",
        href: "/",
        icon: ShieldAlert,
        description: "National emergency command center & radar",
      },
      {
        label: "Spatial Map",
        translationKey: "nav.spatialMap",
        href: "/map",
        icon: Compass,
        badge: "3D GIS",
        badgeType: "blue",
        description: "Topological slope units & 3D terrain",
      },
      {
        label: "Creep Watch",
        translationKey: "nav.creepWatch",
        href: "/creep-watch",
        icon: Radio,
        badge: "InSAR",
        badgeType: "purple",
        description: "Sentinel-1 satellite surface deformation",
      },
    ],
  },
  {
    id: "early-warning",
    title: "Early Warning & Hazards",
    translationKey: "nav.group.earlyWarning",
    icon: AlertTriangle,
    badge: "96.4%",
    badgeType: "amber",
    items: [
      {
        label: "Early Warning",
        translationKey: "nav.earlyWarning",
        href: "/early-warning",
        icon: AlertTriangle,
        badge: "96.4%",
        badgeType: "amber",
        description: "GSI & IIT Mandi 4-tier threat matrix",
      },
      {
        label: "Satellite Hydrology",
        translationKey: "nav.hydrology",
        href: "/hydrology",
        icon: CloudRain,
        badge: "GPM IMERG",
        badgeType: "blue",
        description: "NASA LHASA v2 GPM rainfall & SMAP moisture",
      },
      {
        label: "Subsurface Geotech",
        translationKey: "nav.geotech",
        href: "/geotech",
        icon: Gauge,
        badge: "Fs 1.08",
        badgeType: "amber",
        description: "KIGAM slope stability & Amrita piezometers",
      },
      {
        label: "Risk Engine",
        translationKey: "nav.riskEngine",
        href: "/risk",
        icon: Activity,
        badge: "ML Engine",
        badgeType: "purple",
        description: "Transparent multivariate logistic regression",
      },
    ],
  },
  {
    id: "infrastructure",
    title: "Corridors & Lifelines",
    translationKey: "nav.group.infrastructure",
    icon: Truck,
    badge: "BRO",
    badgeType: "blue",
    items: [
      {
        label: "Highway Corridors",
        translationKey: "nav.highways",
        href: "/highways",
        icon: Truck,
        badge: "NH-54",
        badgeType: "amber",
        description: "BRO Pushpak highway status & scarp inventory",
      },
      {
        label: "Consequence Intel",
        translationKey: "nav.consequenceIntel",
        href: "/consequences",
        icon: Layers,
        badge: "Graph",
        badgeType: "purple",
        description: "Cascading lifeline failure dependency graphs",
      },
    ],
  },
  {
    id: "operations",
    title: "Operations & Response",
    translationKey: "nav.group.operations",
    icon: ShieldCheck,
    badge: "3",
    badgeType: "green",
    items: [
      {
        label: "Operations & Actions",
        translationKey: "nav.operations",
        href: "/operations",
        icon: ShieldCheck,
        badge: "3",
        badgeType: "green",
        description: "Human-authorized dual-custody action queue",
      },
      {
        label: "Warning Ledger",
        translationKey: "nav.warningLedger",
        href: "/ledger",
        icon: FileCheck2,
        badge: "Audit",
        badgeType: "purple",
        description: "Cryptographically sealed immutable warning log",
      },
      {
        label: "Alerts & Delivery",
        translationKey: "nav.alertsDelivery",
        href: "/alerts",
        icon: Bell,
        badge: "CAP/SMS",
        badgeType: "blue",
        description: "Multi-channel CAP broadcast & citizen alerts",
      },
      {
        label: "Field Sensors",
        translationKey: "nav.sensors",
        href: "/sensors",
        icon: Cpu,
        badge: "WSN Mesh",
        badgeType: "green",
        description: "LoRa tiltmeters, rain gauges & piezometer mesh",
      },
      {
        label: "Field & Community",
        translationKey: "nav.community",
        href: "/community",
        icon: Users,
        badge: "Reports",
        badgeType: "purple",
        description: "Decentralized crowdsourced ground-truth reports",
      },
    ],
  },
];

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const PRIMARY_TOP_LINKS: NavItem[] = [
  { label: "Command Center",   translationKey: "nav.commandCenter",  href: "/",            icon: ShieldAlert },
  { label: "Spatial Map",      translationKey: "nav.spatialMap",     href: "/map",          icon: Compass },
  { label: "Creep Watch",      translationKey: "nav.creepWatch",     href: "/creep-watch",  icon: Radio },
  { label: "Warning Ledger",   translationKey: "nav.warningLedger",  href: "/ledger",       icon: FileCheck2 },
  { label: "Field & Community", translationKey: "nav.community",     href: "/community",    icon: Users },
  { label: "Alerts & Delivery", translationKey: "nav.alertsDelivery", href: "/alerts",      icon: Bell },
];

const THEMES = [
  { key: "light" as const, label: "Light", icon: Sun, title: "Light Theme" },
  { key: "dark" as const, label: "Dark", icon: Moon, title: "Dark Theme" },
  { key: "high-contrast" as const, label: "Contrast", icon: Eye, title: "High Contrast Theme" },
] as const;

const LANGUAGES = [
  { code: "en" as const, label: "English" },
  { code: "hi" as const, label: "हिंदी" },
  { code: "mizo" as const, label: "Mizo" },
] as const;

const TEXT_SIZES = [
  { key: "sm" as const, label: "A-", title: "Decrease text size" },
  { key: "base" as const, label: "A", title: "Default text size" },
  { key: "lg" as const, label: "A+", title: "Increase text size" },
] as const;



const FOOTER_QUICK_LINKS = [
  { label: "Command Center", href: "/" },
  { label: "Early Warning System", href: "/early-warning" },
  { label: "Spatial GIS Map", href: "/map" },
  { label: "Risk Engine", href: "/risk" },
  { label: "Alerts & Notifications", href: "/alerts" },
] as const;

const FOOTER_GOV_PORTALS = [
  { label: "india.gov.in", href: "https://india.gov.in" },
  { label: "NDMA (ndma.gov.in)", href: "https://ndma.gov.in" },
  { label: "GSI (gsi.gov.in)", href: "https://www.gsi.gov.in" },
  { label: "ISRO Bhuvan", href: "https://bhuvan.nrsc.gov.in" },
  { label: "MHA (mha.gov.in)", href: "https://mha.gov.in" },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SHELL COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function SentinelShell({ children }: SentinelShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [mounted, setMounted] = useState(false);
  const [textSize, setTextSize] = useState<"sm" | "base" | "lg">("base");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Grouped feature accordion state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    surveillance: true,
    "early-warning": true,
    infrastructure: true,
    operations: true,
    governance: true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const allExpanded = Object.values(expandedGroups).every(Boolean);
  const toggleAllGroups = () => {
    const nextState = !allExpanded;
    const updated: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      updated[g.id] = nextState;
    });
    setExpandedGroups(updated);
  };

  const { user, isAuthenticated, logout } = useAuthStore();
  const { lang, setLang, t } = useTranslation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fmt: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      year: "numeric",
      month: "short",
      day: "2-digit",
    };
    const tick = () =>
      setCurrentTime(
        new Intl.DateTimeFormat("en-IN", fmt).format(new Date()) + " IST"
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);


  const textSizeClass =
    textSize === "sm" ? "text-xs" : textSize === "lg" ? "text-base" : "";

  return (
    <div
      className={`min-h-screen flex flex-col antialiased selection:bg-blue-100 selection:text-gov-blue transition-colors ${textSizeClass}`}
    >
      {/* Skip Link (GIGW 3.0 & WCAG 2.2 AA) */}
      <a href="#main-content" className="skip-to-content">
        {t("skip.content", "Skip to main content")}
      </a>

      {/* ── Official Indian Tricolor Ribbon ── */}
      <TricolorRibbon />

      {/* ── GIGW 3.0 Top Governance & Accessibility Bar ── */}
      <GovernanceBar
        t={t}
        textSize={textSize}
        setTextSize={setTextSize}
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
      />

      {/* ── National Masthead Header (Official White Banner) ── */}
      <header
        role="banner"
        className="w-full bg-white dark:bg-[#070E1E] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-xs transition-colors"
      >
        {/* Left: Ashoka Emblem & Bilingual Ministry Title */}
        <div className="flex items-center space-x-2 sm:space-x-3.5 min-w-0">
          <button
            type="button"
            className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-gov-blue dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-gov-blue rounded-lg shrink-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>

          <Link href="/" className="flex items-center space-x-2 sm:space-x-3.5 group min-w-0">
            {/* Ashoka Lion Capital Vector Emblem */}
            <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 flex items-center justify-center text-gov-blue dark:text-amber-400 shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <AshokaChakraIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-heading font-black tracking-tight text-base sm:text-xl text-gov-blue dark:text-white leading-tight">
                  {t("brand.title", "SENTINEL NER")}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded bg-amber-100 dark:bg-cyan-950 text-gov-blue dark:text-cyan-300 border border-amber-300 dark:border-cyan-800 hidden sm:inline-block">
                  GOI NLEWS
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 font-semibold leading-tight truncate max-w-[180px] xs:max-w-[280px] sm:max-w-none">
                {t("brand.subtitle", "National Landslide Early Warning & Risk Management Platform")}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Geological Survey of India (GSI) • NDMA Disaster Management System
              </p>
            </div>
          </Link>
        </div>

        {/* Right: IST Clock & Compact User Avatar Dropdown (Snapshot 2 Style) */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-sm">

          {/* IST Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 text-slate-600 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <Clock className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" aria-hidden="true" />
            <span className="text-slate-800 dark:text-slate-200" suppressHydrationWarning>
              {currentTime || "Loading..."}
            </span>
          </div>

          {/* Sign In / User Badge */}
          <UserBadge
            mounted={mounted}
            isAuthenticated={isAuthenticated}
            user={user}
            logout={logout}
            t={t}
          />
        </div>
      </header>

      {/* ── Full-Width Horizontal Government Navigation Bar with Dropdown Options ── */}
      <nav
        aria-label="Primary Portal Navigation"
        className="sentinel-top-nav w-full bg-gov-blue text-white shadow-md z-40 sticky top-0 hidden md:block"
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between relative gap-3">
          <div className="flex items-center space-x-1 py-1 min-w-0">
            {/* Primary Command Center Link */}
            <Link
              href="/"
              className={`sentinel-nav-link flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                pathname === "/"
                  ? "active bg-gov-blue-dark text-amber-300 border-b-2 border-gov-saffron font-bold shadow-inner"
                  : "text-white/95 hover:text-white hover:bg-white/10"
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-amber-300 shrink-0" />
              <span>{t("nav.commandCenter", "Command Center")}</span>
            </Link>

            {/* Mega Dropdown Menus (Multi-Column Domain Clusters) */}
            <div className="hidden lg:block ml-1 min-w-0">
              <SentinelMegaMenu />
            </div>
          </div>

          {/* Quick Disaster Helpline in Nav Bar */}
          <div className="flex items-center space-x-1.5 text-xs text-amber-300 font-bold pr-2 shrink-0 whitespace-nowrap">
            <Phone className="h-3.5 w-3.5 text-gov-saffron shrink-0" />
            <span>NDMA Helpline: 1078</span>
          </div>
        </div>
      </nav>

      {/* ── Body: Sidebar + Main Content Canvas ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Organized Accordions, Single-line Labels & Modern Search/Toggle Style) */}
        <aside
          role="navigation"
          aria-label="Sidebar Navigation"
          className={`hidden md:flex flex-col ${
            sidebarCollapsed ? "w-16 p-2" : "w-64 p-3"
          } border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#050A14] space-y-2.5 shrink-0 transition-all duration-200 shadow-2xs`}
        >
          {/* Top Header: Image 2 Style (Search + PanelLeft Toggle) */}
          <div
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center w-full" : "justify-between"
            } pb-2 border-b border-slate-200 dark:border-slate-800/80`}
          >
            <div
              className={`flex items-center ${
                sidebarCollapsed ? "justify-center gap-1.5 w-full" : "space-x-1"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (sidebarCollapsed) {
                    setSidebarCollapsed(false);
                    setShowSearchInput(true);
                  } else {
                    setShowSearchInput(!showSearchInput);
                  }
                }}
                className={`${
                  sidebarCollapsed ? "p-1" : "p-1.5"
                } rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer`}
                aria-label="Search navigation"
                title="Search navigation"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`${
                  sidebarCollapsed ? "p-1" : "p-1.5"
                } rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer`}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>

            {!sidebarCollapsed && (
              <div className="flex items-center space-x-1.5 text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                <span>{t("sidebar.workspace", "Navigation")}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-gov-blue dark:bg-cyan-400 animate-pulse" />
              </div>
            )}
          </div>

          {/* Quick Search Input (when search icon is toggled or filtering) */}
          {!sidebarCollapsed && showSearchInput && (
            <div className="relative animate-in fade-in duration-150">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter features..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full text-xs py-1.5 pl-8 pr-7 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-gov-blue dark:focus:ring-cyan-500"
                autoFocus
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Feature Quick-Jump Dropdown & Collapse All (accessible & test compatible) */}
          <div className={`space-y-2 ${sidebarCollapsed ? "sr-only" : ""}`}>
            <div className="relative">
              <label htmlFor="sidebar-feature-select" className="sr-only">
                Quick Feature Select
              </label>
              <select
                id="sidebar-feature-select"
                value={pathname}
                onChange={(e) => {
                  if (e.target.value && typeof window !== "undefined") {
                    window.location.href = e.target.value;
                  }
                }}
                className="w-full text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-blue appearance-none cursor-pointer"
                aria-label="Quick Feature Select Dropdown"
              >
                <option value="" disabled>
                  ⚡ Jump to Feature...
                </option>
                {NAV_GROUPS.map((group) => (
                  <optgroup key={group.id} label={group.title}>
                    {group.items.map((item) => (
                      <option key={item.href} value={item.href}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Expand / Collapse All Controls */}
            <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-slate-400">
              <span>Features ({NAV_ITEMS.length})</span>
              <button
                type="button"
                onClick={toggleAllGroups}
                className="hover:text-gov-blue dark:hover:text-cyan-400 underline underline-offset-2 transition-colors cursor-pointer"
              >
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
            </div>
          </div>

          {/* Grouped Collapsible Accordion Navigation */}
          <nav className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
            {NAV_GROUPS.map((group) => {
              const isOpen = expandedGroups[group.id] !== false;
              const hasActiveItem = group.items.some((i) => pathname === i.href);
              const GroupIcon = group.icon;

              const visibleItems = sidebarSearch.trim()
                ? group.items.filter((i) =>
                    i.label.toLowerCase().includes(sidebarSearch.toLowerCase())
                  )
                : group.items;

              if (sidebarSearch.trim() && visibleItems.length === 0) return null;

              if (sidebarCollapsed) {
                return (
                  <div
                    key={group.id}
                    className="space-y-1 py-1 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0"
                    title={group.title}
                  >
                    {visibleItems.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        isActive={pathname === item.href}
                        t={t}
                        isCollapsed={true}
                      />
                    ))}
                  </div>
                );
              }

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden bg-slate-50/40 dark:bg-slate-900/30 transition-all"
                >
                  {/* Dropdown Accordion Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-bold transition-all cursor-pointer ${
                      hasActiveItem
                        ? "text-gov-blue dark:text-cyan-300 bg-blue-50/70 dark:bg-cyan-950/40"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <GroupIcon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          hasActiveItem ? "text-gov-blue dark:text-cyan-400" : "text-slate-400"
                        }`}
                      />
                      <span className="text-[11px] font-semibold tracking-tight uppercase truncate">
                        {group.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        {group.items.length}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-gov-blue dark:text-cyan-400" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="p-1 space-y-0.5 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#050A14]">
                      {visibleItems.map((item) => (
                        <SidebarLink
                          key={item.href}
                          item={item}
                          isActive={pathname === item.href}
                          t={t}
                          isCollapsed={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {!sidebarCollapsed && (
            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-1 px-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gov-blue dark:text-cyan-400">Sentinel NER v2.0</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 font-bold">
                  SECURE
                </span>
              </div>
              <p>GIGW 3.0 &amp; NIST Aligned</p>
            </div>
          )}
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <MobileDrawer
            pathname={pathname}
            t={t}
            onClose={() => setMobileMenuOpen(false)}
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
          />
        )}

        {/* Main Content Area */}
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 space-y-6 sm:space-y-8 focus:outline-none bg-[#F4F6F9] dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors"
          tabIndex={-1}
        >
          {children}
          <GovFooter t={t} />
        </main>
      </div>

      {/* ── Mobile Application Persistent Bottom Navigation Dock (Thumb-Friendly, md:hidden) ── */}
      <MobileBottomNav
        pathname={pathname}
        t={t}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />

      <CookieConsentBanner />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Ashoka Chakra Style Crest Vector */
function AshokaChakraIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="2"
          x2="12"
          y2="9"
          stroke="currentColor"
          strokeWidth="1"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  );
}

/** Official Indian Tricolor Ribbon Strip */
function TricolorRibbon() {
  return (
    <div className="h-1.5 w-full flex z-50 shrink-0 shadow-xs" aria-hidden="true">
      <div className="flex-1 bg-[#FF9933]" />
      <div className="flex-1 bg-[#FFFFFF] border-y border-slate-200 dark:border-slate-800" />
      <div className="flex-1 bg-[#138808]" />
    </div>
  );
}

/** Government of India Top Governance Bar */
function GovernanceBar({
  t,
  textSize,
  setTextSize,
  theme,
  setTheme,
  lang,
  setLang,
}: {
  t: (key: string, fallback?: string) => string;
  textSize: "sm" | "base" | "lg";
  setTextSize: (s: "sm" | "base" | "lg") => void;
  theme: string;
  setTheme: (t: "light" | "dark" | "high-contrast") => void;
  lang: string;
  setLang: (l: "en" | "hi" | "mizo") => void;
}) {
  return (
    <div className="w-full bg-gov-blue text-white px-4 py-1.5 flex items-center justify-between text-xs z-40 shrink-0 shadow-sm">
      {/* Left: Official Ministry Designation */}
      <div className="flex items-center space-x-2.5 truncate">
        <div
          className="h-6 w-6 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0"
          aria-label="Emblem of India"
        >
          <AshokaChakraIcon className="w-4 h-4" />
        </div>
        <div className="truncate">
          <div className="font-bold tracking-wide text-xs leading-tight text-white flex items-center gap-1.5">
            <span>{t("gov.india", "भारत सरकार | GOVERNMENT OF INDIA")}</span>
          </div>
          <div className="text-white/80 text-[10px] leading-tight truncate hidden sm:block">
            Ministry of Earth Sciences — Geological Survey of India
          </div>
        </div>
      </div>

      {/* Right: GIGW 3.0 Accessibility Suite & Language Switcher */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Text Size Controls */}
        <div
          className="hidden sm:flex items-center space-x-1 border-r border-white/20 pr-3"
          aria-label="Text Size Controls"
        >
          {TEXT_SIZES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setTextSize(s.key)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                textSize === s.key
                  ? "bg-white text-gov-blue"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              title={s.title}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Theme Controls (WCAG 2.2 AA / GIGW 3.0 Standard) */}
        <div
          className="flex items-center space-x-1 border-r border-white/20 pr-3"
          aria-label="Theme Controls"
        >
          {THEMES.map((th) => {
            const Icon = th.icon;
            const isHidden = th.key === "high-contrast";
            return (
              <button
                key={th.key}
                type="button"
                onClick={() => setTheme(th.key)}
                className={
                  isHidden
                    ? "sr-only"
                    : `flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        theme === th.key
                          ? "bg-white text-gov-blue shadow-xs"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      }`
                }
                title={th.title}
              >
                <Icon className="h-3 w-3" />
                <span>{th.label}</span>
              </button>
            );
          })}
        </div>

        {/* Language Switcher */}
        <div className="flex items-center space-x-1 text-[11px]">
          {LANGUAGES.map((l, idx) => {
            const isHidden = l.code === "mizo";
            return (
              <React.Fragment key={l.code}>
                {!isHidden && idx > 0 && <span className="text-white/40">|</span>}
                <button
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={
                    isHidden
                      ? "sr-only"
                      : `px-1 rounded transition-colors ${
                          lang === l.code
                            ? "text-amber-300 font-bold underline underline-offset-2"
                            : "text-white/80 hover:text-white"
                        }`
                  }
                >
                  {l.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** User Avatar / Sign-In Dropdown (Snapshot 2 Style) */
function UserBadge({
  mounted,
  isAuthenticated,
  user,
  logout,
  t,
}: {
  mounted: boolean;
  isAuthenticated: boolean;
  user: { full_name: string; role: string } | null;
  logout: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className="flex items-center pl-2 border-l border-slate-200 dark:border-slate-800">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 bg-gov-blue hover:bg-gov-blue-dark text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs transition-all dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>{t("auth.signin", "Sign In")}</span>
        </Link>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center pl-2 border-l border-slate-200 dark:border-slate-800">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 bg-gov-blue hover:bg-gov-blue-dark text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-xs transition-all dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>{t("auth.signin", "Sign In")}</span>
        </Link>
      </div>
    );
  }

  // Compute initials from full name or role
  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "PA";

  return (
    <div ref={dropdownRef} className="relative flex items-center pl-2 border-l border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User profile menu for ${user.full_name}`}
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-hidden focus:ring-2 focus:ring-gov-blue/40"
      >
        {/* Compact Circular User Avatar (Snapshot 2 Style) */}
        <div className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-tr from-[#0a3d52] via-[#0d5672] to-[#12809e] text-white flex items-center justify-center font-bold text-[11px] shadow-xs border border-teal-300/40 ring-1 ring-slate-900/15 overflow-hidden shrink-0">
          <span>{initials}</span>
          <span
            className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900"
            aria-hidden="true"
          />
        </div>

        {/* Small Downward Chevron */}
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* User Details Header */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#0a3d52] via-[#0d5672] to-[#12809e] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border border-teal-300/30">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {user.full_name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-gov-blue dark:bg-cyan-950 dark:text-cyan-300 border border-blue-200 dark:border-cyan-800">
                  {user.role}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

          {/* Sign Out Option */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Single Sidebar Navigation Link (Without badges, strictly single-line) */
function SidebarLink({
  item,
  isActive,
  t,
  isCollapsed = false,
}: {
  item: NavItem;
  isActive: boolean;
  t: (key: string, fallback?: string) => string;
  isCollapsed?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={t(item.translationKey, item.label)}
      className={`flex items-center ${
        isCollapsed ? "justify-center px-2 py-2" : "px-2.5 py-1.5 space-x-2.5"
      } rounded-lg text-xs font-medium transition-all whitespace-nowrap group ${
        isActive
          ? "bg-blue-50 text-gov-blue border border-blue-200 font-bold dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-800 shadow-2xs"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          isActive
            ? "text-gov-blue dark:text-cyan-400"
            : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
        }`}
      />
      {!isCollapsed && (
        <span className="truncate whitespace-nowrap leading-tight">
          {t(item.translationKey, item.label)}
        </span>
      )}
    </Link>
  );
}

/** Comprehensive All-Features Dropdown Menu Component */
function FeaturesDropdownMenu({
  pathname,
  t,
}: {
  pathname: string;
  t: (key: string, fallback?: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(filterText.toLowerCase()) ||
        group.title.toLowerCase().includes(filterText.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(filterText.toLowerCase()))
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div ref={dropdownRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Features Directory Dropdown"
        className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
          isOpen
            ? "bg-white/20 text-white shadow-inner"
            : "text-white/90 hover:text-white hover:bg-white/10"
        }`}
      >
        <Layers className="h-4 w-4 text-amber-300" />
        <span className="font-bold">Features Directory</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Features Directory"
          className="absolute left-0 sm:left-auto sm:right-0 lg:left-0 top-full mt-1.5 w-[92vw] max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#070E1E] border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 text-slate-900 dark:text-white"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-gov-blue dark:text-cyan-400 uppercase tracking-wider">
                Full Feature Directory (16 Modules)
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ">
              5 Categorized Domains
            </span>
          </div>

          {/* Quick Filter Input */}
          <div className="mb-3 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search features (e.g., Hydrology, InSAR, Ledger, Geotech)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gov-blue dark:focus:ring-cyan-500"
            />
          </div>

          <div className="space-y-4">
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase px-1">
                    <GroupIcon className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
                    <span>{group.title}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ml-auto">
                      {group.items.length} items
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-start space-x-2.5 p-2 rounded-xl text-xs transition-all border ${
                            isActive
                              ? "bg-blue-50 dark:bg-cyan-950/70 border-blue-200 dark:border-cyan-800 text-gov-blue dark:text-cyan-300 font-semibold shadow-2xs"
                              : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700"
                          }`}
                        >
                          <div
                            className={`mt-0.5 p-1 rounded-lg ${
                              isActive
                                ? "bg-blue-100 dark:bg-cyan-900/60 text-gov-blue dark:text-cyan-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            } shrink-0`}
                          >
                            <ItemIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-semibold text-xs">
                                {t(item.translationKey, item.label)}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0 font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile Navigation Drawer with Grouped Accordions, Emergency Actions & Settings */
function MobileDrawer({
  pathname,
  t,
  onClose,
  theme,
  setTheme,
  lang,
  setLang,
}: {
  pathname: string;
  t: (key: string, fallback?: string) => string;
  onClose: () => void;
  theme: string;
  setTheme: (t: "light" | "dark" | "high-contrast") => void;
  lang: string;
  setLang: (l: "en" | "hi" | "mizo") => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    surveillance: true,
    "early-warning": true,
    infrastructure: false,
    operations: false,
    governance: false,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
    >
      <div className="w-[85%] max-w-sm bg-white dark:bg-[#070E1E] p-4 sm:p-5 flex flex-col shadow-2xl border-r border-slate-200 dark:border-slate-800 h-full overflow-hidden animate-in slide-in-from-left duration-200">
        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-gov-blue dark:bg-cyan-600 flex items-center justify-center text-white shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="font-heading font-black text-sm text-gov-blue dark:text-white block leading-tight">
                SENTINEL NER
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">
                Govt. of India • NLEWS
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Emergency 24/7 Helpline Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 mb-3 text-xs shadow-2xs">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <Phone className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-amber-900 dark:text-amber-200 block truncate">
                Disaster Helpline
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-mono">
                Toll-Free 24/7: 1078
              </span>
            </div>
          </div>
          <a
            href="tel:1078"
            className="px-2.5 py-1.5 rounded-lg bg-gov-saffron hover:bg-amber-600 text-white font-bold text-xs shadow-xs shrink-0 transition-transform active:scale-95"
          >
            Call 1078
          </a>
        </div>

        {/* Mobile Quick Feature Jump Dropdown */}
        <div className="mb-3">
          <label htmlFor="mobile-feature-select" className="sr-only">
            Quick Feature Jump
          </label>
          <div className="relative">
            <select
              id="mobile-feature-select"
              value={pathname}
              onChange={(e) => {
                if (e.target.value && typeof window !== "undefined") {
                  window.location.href = e.target.value;
                  onClose();
                }
              }}
              className="w-full text-xs font-semibold py-2 pl-2.5 pr-7 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-blue appearance-none cursor-pointer"
              aria-label="Quick Feature Select"
            >
              <option value="" disabled>
                ⚡ Jump to Feature...
              </option>
              {NAV_GROUPS.map((group) => (
                <optgroup key={group.id} label={group.title}>
                  {group.items.map((item) => (
                    <option key={item.href} value={item.href}>
                      {item.label} {item.badge ? `(${item.badge})` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Mobile Grouped Collapsible Accordions */}
        <nav className="space-y-2 flex-1 overflow-y-auto pr-0.5" aria-label="Mobile Navigation Modules">
          {NAV_GROUPS.map((group) => {
            const isOpen = expandedGroups[group.id] !== false;
            const hasActiveItem = group.items.some((i) => pathname === i.href);
            const GroupIcon = group.icon;

            return (
              <div
                key={group.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/60 dark:bg-slate-900/40"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                    hasActiveItem
                      ? "text-gov-blue dark:text-cyan-300 bg-blue-50 dark:bg-cyan-950/50"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <GroupIcon className="h-4 w-4 text-gov-blue dark:text-cyan-400 shrink-0" />
                    <span className="text-[11px] uppercase tracking-wide">{group.title}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-gov-blue dark:text-cyan-400" : ""
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="p-1 space-y-1 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070E1E]">
                    {group.items.map((item) => (
                      <div key={item.href} onClick={onClose}>
                        <SidebarLink
                          item={item}
                          isActive={pathname === item.href}
                          t={t}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Mobile Drawer Footer: Quick Theme & Language Controls */}
        <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Theme:
            </span>
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                  theme === "light"
                    ? "bg-white text-gov-blue shadow-2xs dark:bg-slate-800 dark:text-cyan-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Sun className="h-3 w-3" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                  theme === "dark"
                    ? "bg-white text-gov-blue shadow-2xs dark:bg-slate-800 dark:text-cyan-400"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Moon className="h-3 w-3" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Language:
            </span>
            <div className="flex items-center space-x-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                    lang === l.code
                      ? "bg-gov-blue text-white dark:bg-cyan-500 dark:text-slate-950"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop tap to dismiss */}
      <div className="flex-1" onClick={onClose} aria-hidden="true" />
    </div>
  );
}

/** Mobile Application Persistent Bottom Navigation Dock (md:hidden) */
function MobileBottomNav({
  pathname,
  t,
  onOpenMenu,
}: {
  pathname: string;
  t: (key: string, fallback?: string) => string;
  onOpenMenu: () => void;
}) {
  const isHome = pathname === "/";
  const isMap = pathname === "/map";
  const isCommunity = pathname === "/community";
  const isOperations = pathname === "/operations";
  const isDrawerActive = !isHome && !isMap && !isCommunity && !isOperations;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070E1E]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)] transition-colors"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-5 items-center justify-around px-1 pt-1.5 pb-1">
        {/* 1. Command Center */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] ${
            isHome
              ? "text-gov-blue dark:text-cyan-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          aria-current={isHome ? "page" : undefined}
        >
          {isHome && (
            <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-gov-blue dark:bg-cyan-400" />
          )}
          <ShieldAlert className={`h-5 w-5 mb-0.5 transition-transform ${isHome ? "scale-110 text-gov-blue dark:text-cyan-400" : ""}`} />
          <span className="text-[10px] tracking-tight truncate max-w-[56px]">
            {t("nav.commandCenter", "Command")}
          </span>
        </Link>

        {/* 2. Spatial 3D Map */}
        <Link
          href="/map"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] ${
            isMap
              ? "text-gov-blue dark:text-cyan-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          aria-current={isMap ? "page" : undefined}
        >
          {isMap && (
            <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-gov-blue dark:bg-cyan-400" />
          )}
          <Compass className={`h-5 w-5 mb-0.5 transition-transform ${isMap ? "scale-110 text-gov-blue dark:text-cyan-400" : ""}`} />
          <span className="text-[10px] tracking-tight truncate max-w-[56px]">
            {t("nav.spatialMap", "3D Map")}
          </span>
        </Link>

        {/* 3. Community Hazard Intel */}
        <Link
          href="/community"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] ${
            isCommunity
              ? "text-gov-blue dark:text-cyan-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          aria-current={isCommunity ? "page" : undefined}
        >
          {isCommunity && (
            <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-gov-blue dark:bg-cyan-400" />
          )}
          <Users className={`h-5 w-5 mb-0.5 transition-transform ${isCommunity ? "scale-110 text-gov-blue dark:text-cyan-400" : ""}`} />
          <span className="text-[10px] tracking-tight truncate max-w-[56px]">
            {t("nav.community", "Hazards")}
          </span>
        </Link>

        {/* 4. Operations Command */}
        <Link
          href="/operations"
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] ${
            isOperations
              ? "text-gov-blue dark:text-cyan-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          aria-current={isOperations ? "page" : undefined}
        >
          {isOperations && (
            <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-gov-blue dark:bg-cyan-400" />
          )}
          <Activity className={`h-5 w-5 mb-0.5 transition-transform ${isOperations ? "scale-110 text-gov-blue dark:text-cyan-400" : ""}`} />
          <span className="text-[10px] tracking-tight truncate max-w-[56px]">
            {t("nav.operations", "Operations")}
          </span>
        </Link>

        {/* 5. Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMenu}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[44px] cursor-pointer ${
            isDrawerActive
              ? "text-gov-blue dark:text-cyan-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          aria-label="Open Full Navigation Menu"
        >
          {isDrawerActive && (
            <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-gov-blue dark:bg-cyan-400" />
          )}
          <Menu className={`h-5 w-5 mb-0.5 transition-transform ${isDrawerActive ? "scale-110 text-gov-blue dark:text-cyan-400" : ""}`} />
          <span className="text-[10px] tracking-tight truncate max-w-[56px]">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}

/** GIGW-Compliant Government Footer */
function GovFooter({ t }: { t: (key: string, fallback?: string) => string }) {
  return (
    <footer className="mt-16 pt-8 border-t-4 border-gov-blue bg-white dark:bg-[#050A14] rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 text-sm">
        {/* About Column */}
        <div>
          <h3 className="font-heading font-bold text-gov-blue dark:text-white text-base mb-3">
            About Sentinel NER
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
            National Landslide Early Warning & Risk Management Platform for Northeast India.
            An initiative of the Government of India for disaster resilience, infrastructure
            protection, and community safety.
          </p>
          <div className="mt-3 flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
              {t("footer.status", "STATUS: OPERATIONAL")}
            </span>
          </div>
        </div>

        {/* Quick Links Column */}
        <div>
          <h3 className="font-heading font-bold text-gov-blue dark:text-white text-base mb-3">
            Quick Links
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            {FOOTER_QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-gov-blue hover:underline dark:hover:text-cyan-400 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Related Portals Column */}
        <div>
          <h3 className="font-heading font-bold text-gov-blue dark:text-white text-base mb-3">
            Related Portals
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            {FOOTER_GOV_PORTALS.map((portal) => (
              <li key={portal.href}>
                <a
                  href={portal.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gov-blue hover:underline dark:hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
                >
                  {portal.label} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Column */}
        <div>
          <h3 className="font-heading font-bold text-gov-blue dark:text-white text-base mb-3">
            Contact
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
              <span>Helpline: 1078 (NDMA)</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
              <span>sentinel-ner@gov.in</span>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
              <span>sentinel-ner.gov.in</span>
            </li>
          </ul>
          <div className="mt-4 p-2.5 rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-bold text-gov-blue dark:text-slate-200 mb-1">
              Accessibility Statement
            </p>
            <p className="text-[10px] leading-relaxed">
              This website conforms to WCAG 2.2 Level AA guidelines as per GIGW standards.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Copyright & NIC Hosting Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2 py-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          {t(
            "footer.consortium",
            "© 2026 Sentinel NER — Government of India & Academic Disaster Resilience Consortium."
          )}
        </div>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px]">
          <Link href="/privacy" className="hover:text-gov-blue dark:hover:text-cyan-400 hover:underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-gov-blue dark:hover:text-cyan-400 hover:underline">
            Terms of Service
          </Link>
          <span>•</span>
          <span>Designed per GIGW 3.0</span>
          <span>•</span>
          <span>{t("footer.security", "NIST SP 800-53 / CERT-In Aligned")}</span>
          <span>•</span>
          <span>Hosted by NIC</span>
        </div>
      </div>
    </footer>
  );
}
