/**
 * Sentinel NER — Authoritative Basemap Configuration & Resolution
 *
 * Resolves geographic basemap tile endpoints:
 * 1. Default (Local Dev & Production): OpenStreetMap raster tiles with high-contrast
 *    dark tactical styling (CSS filter). Zero proprietary API keys required.
 * 2. CARTO Dark Matter: Used when NEXT_PUBLIC_CARTO_API_KEY is provided.
 *    (As of August 2026, CARTO requires a key for direct raster tile requests;
 *    unauthenticated requests receive an "API KEY REQUIRED" watermark).
 * 3. Custom Tile Server: Used when NEXT_PUBLIC_BASEMAP_TILE_URL is provided (e.g. offline/GeoServer).
 * 4. Graceful Fallback: If CARTO is requested without a key, the system falls back
 *    to OpenStreetMap to prevent the "API KEY REQUIRED" watermark.
 *
 * Operational Separation:
 * Basemap tiles provide pure spatial context and are completely decoupled from
 * Sentinel NER backend operational APIs and domain entities.
 */

export interface BasemapConfig {
  provider: "osm" | "carto" | "custom" | "google_satellite";
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string | string[];
  className?: string;
  fallbackNotice?: string;
  requiresKey: boolean;
  hasKey: boolean;
}

export function getBasemapConfig(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {}
): BasemapConfig {
  const customUrl = env.NEXT_PUBLIC_BASEMAP_TILE_URL?.trim();
  const customAttribution = env.NEXT_PUBLIC_BASEMAP_ATTRIBUTION?.trim();
  const cartoApiKey = env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  const providerPreference = env.NEXT_PUBLIC_BASEMAP_PROVIDER?.trim().toLowerCase();

  // 1. Custom Operator / Offline Tile Server
  if (customUrl) {
    return {
      provider: "custom",
      url: customUrl,
      attribution: customAttribution || "Custom Basemap Provider",
      maxZoom: 19,
      subdomains: customUrl.includes("{s}") ? "abc" : undefined,
      requiresKey: false,
      hasKey: true,
    };
  }

  // 2. CARTO Dark Matter (requires valid API key as of August 2026)
  if (providerPreference === "carto" || (cartoApiKey && providerPreference !== "osm")) {
    if (cartoApiKey) {
      return {
        provider: "carto",
        url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoApiKey)}`,
        attribution:
          '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
        subdomains: "abcd",
        requiresKey: true,
        hasKey: true,
      };
    }

    // CARTO was requested, but no API key was provided.
    // Gracefully degrade to OpenStreetMap to prevent "API KEY REQUIRED" watermark.
    return {
      provider: "osm",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: "abc",
      className: "sentinel-dark-tiles",
      fallbackNotice:
        "CARTO API key not configured (NEXT_PUBLIC_CARTO_API_KEY). Showing OpenStreetMap basemap.",
      requiresKey: true,
      hasKey: false,
    };
  }

  // 3. Google Maps Satellite
  if (providerPreference === "google_satellite") {
    return {
      provider: "google_satellite",
      url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      attribution: '&copy; <a href="https://www.google.com/intl/en_us/help/terms_maps/">Google Maps</a>',
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      requiresKey: false,
      hasKey: true,
    };
  }

  // 4. Default: OpenStreetMap with tactical dark styling (Zero credentials required)
  return {
    provider: "osm",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abc",
    className: "sentinel-dark-tiles",
    requiresKey: false,
    hasKey: true,
  };
}
