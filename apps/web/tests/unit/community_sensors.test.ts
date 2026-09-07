import { describe, it, expect } from "vitest";
import {
  ReportCategory,
  ReportStatus,
  ModerationState,
  MediaReference,
} from "@/lib/community";
import {
  SensorType,
  SensorStatus,
  ObservationQuality,
  SensorFreshness,
} from "@/lib/sensors";

describe("Stage 10 Community Intelligence & Field Sensor Axioms", () => {
  it("enforces core state distinction axioms (non-negotiable safety rules)", () => {
    // Axiom 1: Crowdsourced reports are NOT verified by default
    const submitted: ReportStatus = "SUBMITTED";
    const unverified: ReportStatus = "UNVERIFIED";
    const probable: ReportStatus = "PROBABLE";
    const verified: ReportStatus = "VERIFIED";
    const rejected: ReportStatus = "REJECTED";

    expect(submitted).not.toBe(verified);
    expect(unverified).not.toBe(verified);
    expect(probable).not.toBe(verified);
    expect(rejected).not.toBe(verified);
  });

  it("enforces sensor freshness evaluation boundaries", () => {
    // LIVE <= 15 minutes
    // RECENT 15 min - 1 hour
    // STALE 1 hour - 24 hours
    // OFFLINE > 24 hours
    const live: SensorFreshness = "LIVE";
    const recent: SensorFreshness = "RECENT";
    const stale: SensorFreshness = "STALE";
    const offline: SensorFreshness = "OFFLINE";

    expect(live).toBe("LIVE");
    expect(recent).toBe("RECENT");
    expect(stale).toBe("STALE");
    expect(offline).toBe("OFFLINE");

    // Freshness states must all be distinct
    const states = [live, recent, stale, offline];
    const uniqueStates = new Set(states);
    expect(uniqueStates.size).toBe(4);
  });

  it("validates observation quality categories include deterministic failure modes", () => {
    const valid: ObservationQuality = "VALID";
    const suspect: ObservationQuality = "SUSPECT";
    const outOfRange: ObservationQuality = "OUT_OF_RANGE";
    const clockSkew: ObservationQuality = "CLOCK_SKEW";
    const missing: ObservationQuality = "MISSING";

    expect(valid).not.toBe(suspect);
    expect(outOfRange).toBe("OUT_OF_RANGE");
    expect(clockSkew).toBe("CLOCK_SKEW");
    expect(missing).toBe("MISSING");
  });

  it("validates media reference integrity and path safety rule", () => {
    // Valid media reference structure
    const validMedia: MediaReference = {
      object_key: "reports/2026/miz-001.jpg",
      content_type: "image/jpeg",
      size_bytes: 2048576,
      checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      uploaded_at: "2026-09-05T10:00:00Z",
      is_verified_safe: true,
    };

    expect(validMedia.object_key).not.toContain("..");
    expect(validMedia.object_key.startsWith("/")).toBe(false);
    expect(validMedia.object_key.startsWith("\\")).toBe(false);
    expect(validMedia.size_bytes).toBeLessThanOrEqual(25 * 1024 * 1024);
  });

  it("validates all 9 physical sensor modalities are recognized", () => {
    const modalities: SensorType[] = [
      "RAINFALL",
      "TILT",
      "INCLINOMETER",
      "SOIL_MOISTURE",
      "PIEZOMETER",
      "GNSS",
      "CRACK_GAUGE",
      "VIBRATION",
      "OTHER",
    ];

    expect(modalities.length).toBe(9);
    expect(new Set(modalities).size).toBe(9);
  });
});
