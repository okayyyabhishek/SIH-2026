/**
 * Sentinel NER — Deterministic & Hydration-Safe Formatting Utilities
 * Standardizes date, time, and numeric formatting across SSR (Node.js) and CSR (Browser)
 * to prevent React hydration mismatch errors caused by differing OS or browser locales.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats date deterministically as "DD MMM YYYY" (e.g. "03 Jan 2026") in UTC.
 */
export function formatDateSafe(val?: string | number | Date | null): string {
  if (!val) return "N/A";
  const d = typeof val === "string" || typeof val === "number" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "N/A";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats time deterministically as "HH:mm UTC" (e.g. "14:30 UTC") in UTC.
 */
export function formatTimeSafe(val?: string | number | Date | null): string {
  if (!val) return "N/A";
  const d = typeof val === "string" || typeof val === "number" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "N/A";
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes} UTC`;
}

/**
 * Formats date and time deterministically as "DD MMM YYYY, HH:mm UTC".
 */
export function formatDateTimeSafe(val?: string | number | Date | null): string {
  if (!val) return "N/A";
  const d = typeof val === "string" || typeof val === "number" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "N/A";
  return `${formatDateSafe(d)}, ${formatTimeSafe(d)}`;
}

/**
 * Formats numbers with fixed en-US grouping to prevent server/client thousand separator divergence.
 */
export function formatNumberSafe(val?: number | string | null, decimals?: number): string {
  if (val == null) return "N/A";
  const n = Number(val);
  if (isNaN(n)) return "N/A";
  return decimals !== undefined
    ? n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : n.toLocaleString("en-US");
}
