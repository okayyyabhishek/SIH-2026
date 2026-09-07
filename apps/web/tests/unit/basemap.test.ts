import { describe, it, expect } from "vitest";
import { getBasemapConfig } from "@/lib/basemap";

describe("Sentinel NER — Authoritative Basemap Configuration Tests", () => {
  it("defaults to OpenStreetMap with tactical dark styling when no environment variables are set", () => {
    const config = getBasemapConfig({});

    expect(config.provider).toBe("osm");
    expect(config.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(config.attribution).toContain("OpenStreetMap");
    expect(config.className).toBe("sentinel-dark-tiles");
    expect(config.requiresKey).toBe(false);
    expect(config.hasKey).toBe(true);
    expect(config.fallbackNotice).toBeUndefined();
  });

  it("does not contain any hardcoded API keys or secrets in default configuration", () => {
    const config = getBasemapConfig({});

    expect(config.url).not.toContain("key=");
    expect(config.url).not.toContain("api_key");
    expect(config.url).not.toContain("token");
    expect(config.url).not.toContain("secret");
  });

  it("safely falls back to OpenStreetMap when CARTO is requested but NEXT_PUBLIC_CARTO_API_KEY is omitted", () => {
    const config = getBasemapConfig({
      NEXT_PUBLIC_BASEMAP_PROVIDER: "carto",
      NEXT_PUBLIC_CARTO_API_KEY: "",
    });

    // Must NOT request CARTO without key (which causes the "API KEY REQUIRED" watermark)
    expect(config.provider).toBe("osm");
    expect(config.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(config.url).not.toContain("cartocdn.com");
    expect(config.requiresKey).toBe(true);
    expect(config.hasKey).toBe(false);
    expect(config.fallbackNotice).toBeDefined();
    expect(config.fallbackNotice).toContain("CARTO API key not configured");
  });

  it("configures CARTO Dark Matter correctly when NEXT_PUBLIC_CARTO_API_KEY is provided", () => {
    const config = getBasemapConfig({
      NEXT_PUBLIC_BASEMAP_PROVIDER: "carto",
      NEXT_PUBLIC_CARTO_API_KEY: "test-carto-key-12345",
    });

    expect(config.provider).toBe("carto");
    expect(config.url).toContain("cartocdn.com");
    expect(config.url).toContain("rastertiles/dark_all");
    expect(config.url).toContain("key=test-carto-key-12345");
    expect(config.attribution).toContain("CARTO");
    expect(config.requiresKey).toBe(true);
    expect(config.hasKey).toBe(true);
    expect(config.fallbackNotice).toBeUndefined();
  });

  it("auto-selects CARTO when NEXT_PUBLIC_CARTO_API_KEY is present even if provider is not explicitly set", () => {
    const config = getBasemapConfig({
      NEXT_PUBLIC_CARTO_API_KEY: "auto-detected-key-999",
    });

    expect(config.provider).toBe("carto");
    expect(config.url).toContain("key=auto-detected-key-999");
  });

  it("honors custom tile server configuration when NEXT_PUBLIC_BASEMAP_TILE_URL is provided", () => {
    const config = getBasemapConfig({
      NEXT_PUBLIC_BASEMAP_TILE_URL: "https://geoserver.local/tiles/{z}/{x}/{y}.png",
      NEXT_PUBLIC_BASEMAP_ATTRIBUTION: "&copy; Local SDMA Offline Tile Cache",
    });

    expect(config.provider).toBe("custom");
    expect(config.url).toBe("https://geoserver.local/tiles/{z}/{x}/{y}.png");
    expect(config.attribution).toBe("&copy; Local SDMA Offline Tile Cache");
    expect(config.requiresKey).toBe(false);
    expect(config.hasKey).toBe(true);
  });
});
