import { describe, it, expect } from "vitest";
import {
  calculateDistanceMeters,
  generateProneAreaSMS,
  PRONE_AREAS_NER,
  ProneAreaZone,
} from "@/lib/community";

describe("Stage 10 Geofenced Landslide SMS Alert Service", () => {
  it("computes accurate geodesic distance between coordinates using Haversine formula", () => {
    // Exact same coordinates must have 0 distance
    const distZero = calculateDistanceMeters(23.7548, 92.7214, 23.7548, 92.7214);
    expect(distZero).toBe(0);

    // Durtlang Ridge [23.7548, 92.7214] to Ramhlun North [23.7489, 92.7301] is approx 1090m
    const dist = calculateDistanceMeters(23.7548, 92.7214, 23.7489, 92.7301);
    expect(dist).toBeGreaterThan(900);
    expect(dist).toBeLessThan(1300);
  });

  it("verifies authoritative Northeast prone areas contain situation descriptions and road status", () => {
    expect(PRONE_AREAS_NER.length).toBeGreaterThanOrEqual(4);

    const durtlang = PRONE_AREAS_NER.find((z) => z.id === "zone-durtlang-01");
    expect(durtlang).toBeDefined();
    expect(durtlang?.name).toContain("Durtlang");
    expect(durtlang?.currentSituation).toContain("Active scarp slip");
    expect(durtlang?.roadStatus).toBeDefined();
    expect(durtlang?.dangerRadiusMeters).toBeGreaterThan(0);
    expect(durtlang?.warningRadiusMeters).toBeGreaterThan(durtlang!.dangerRadiusMeters);

    const ranipool = PRONE_AREAS_NER.find((z) => z.id === "zone-ranipool-02");
    expect(ranipool).toBeDefined();
    expect(ranipool?.currentSituation).toContain("boulder detachments");
  });

  it("generates an official emergency SMS alert detailing what is happening in the prone area", () => {
    const testZone: ProneAreaZone = PRONE_AREAS_NER[0];
    const testPhone = "+91 98765 43210";
    const distanceMeters = 350; // Inside danger zone

    const sms = generateProneAreaSMS(testZone, testPhone, distanceMeters);

    expect(sms.recipientPhone).toBe(testPhone);
    expect(sms.proneAreaId).toBe(testZone.id);
    expect(sms.proneAreaName).toBe(testZone.name);
    expect(sms.senderId).toBe("GOI-NDMA");
    expect(sms.distanceMeters).toBe(350);

    // SMS body must contain critical operational details
    expect(sms.messageText).toContain("[GOI-NDMA / NLEWS EMERGENCY SMS ALERT]");
    expect(sms.messageText).toContain("CRITICAL RED ALERT • IMMEDIATE DANGER");
    expect(sms.messageText).toContain(testZone.name);
    expect(sms.messageText).toContain("WHAT IS HAPPENING:");
    expect(sms.messageText).toContain(testZone.currentSituation);
    expect(sms.messageText).toContain("ROAD STATUS:");
    expect(sms.messageText).toContain(testZone.roadStatus);
    expect(sms.messageText).toContain("1078");
  });

  it("differentiates warning proximity approach from critical danger zone", () => {
    const testZone: ProneAreaZone = PRONE_AREAS_NER[0]; // dangerRadius = 600m
    const testPhone = "+91 98765 43210";

    // 1500m is outside danger radius (600m) but inside warning radius (2500m)
    const sms = generateProneAreaSMS(testZone, testPhone, 1500);
    expect(sms.messageText).toContain("PROXIMITY WARNING • HAZARD ZONE APPROACH");
    expect(sms.messageText).toContain("1.5km");
  });
});
