/**
 * Sentinel NER — Design System Tokens & Semantic Mappings
 * Ensures consistent, WCAG 2.2 AA accessible operational indicators.
 */

export type OperationalPriority = "CRITICAL" | "URGENT" | "ELEVATED" | "STANDARD" | "NOMINAL";

export interface PriorityMetadata {
  label: string;
  badgeClass: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  ariaDescription: string;
}

export const OPERATIONAL_PRIORITIES: Record<OperationalPriority, PriorityMetadata> = {
  CRITICAL: {
    label: "P1 — Critical Action",
    badgeClass: "bg-op-critical/15 text-op-critical border-op-critical/40",
    textClass: "text-op-critical",
    borderClass: "border-op-critical/40",
    bgClass: "bg-op-critical/10",
    ariaDescription: "Priority 1: Immediate risk to life or lifeline infrastructure.",
  },
  URGENT: {
    label: "P2 — Urgent Action",
    badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/40",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/40",
    bgClass: "bg-orange-500/10",
    ariaDescription: "Priority 2: Rapid operational verification required within 2 hours.",
  },
  ELEVATED: {
    label: "P3 — Elevated Watch",
    badgeClass: "bg-op-warning/15 text-op-warning border-op-warning/40",
    textClass: "text-op-warning",
    borderClass: "border-op-warning/40",
    bgClass: "bg-op-warning/10",
    ariaDescription: "Priority 3: Elevated geotechnical or rainfall threshold alert.",
  },
  STANDARD: {
    label: "P4 — Standard Review",
    badgeClass: "bg-op-advisory/15 text-op-advisory border-op-advisory/40",
    textClass: "text-op-advisory",
    borderClass: "border-op-advisory/40",
    bgClass: "bg-op-advisory/10",
    ariaDescription: "Priority 4: Standard monitoring and routine survey action.",
  },
  NOMINAL: {
    label: "Nominal",
    badgeClass: "bg-op-nominal/15 text-op-nominal border-op-nominal/40",
    textClass: "text-op-nominal",
    borderClass: "border-op-nominal/40",
    bgClass: "bg-op-nominal/10",
    ariaDescription: "System normal. Telemetry and slope stability verified.",
  },
};
