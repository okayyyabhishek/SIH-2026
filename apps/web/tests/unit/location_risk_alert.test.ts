import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDistanceMeters,
  evaluateLocationRisk,
  HAZARD_ZONES_NER,
  LOCATION_PRESETS,
  LocationCoordinates,
  saveLocationAlert,
  getStoredLocationAlerts,
  clearStoredLocationAlerts,
  LocationAlertNotification,
} from '@/lib/locationRiskAlert';

describe('Location-Based Landslide Risk Alert Engine', () => {
  beforeEach(() => {
    clearStoredLocationAlerts();
  });

  it('calculates geodesic distance accurately using Haversine formula', () => {
    // Distance between Aizawl center (23.7271, 92.7176) and Durtlang Ridge (23.7533, 92.7188)
    const dist = calculateDistanceMeters(23.7271, 92.7176, 23.7533, 92.7188);
    // Should be approximately 2.9 km
    expect(dist).toBeGreaterThan(2800);
    expect(dist).toBeLessThan(3100);

    // Identical coordinates should yield 0 meters
    expect(calculateDistanceMeters(23.7533, 92.7188, 23.7533, 92.7188)).toBe(0);
  });

  it('detects user inside Critical Danger Zone at Durtlang Ridge', () => {
    const durtlangCoords: LocationCoordinates = {
      latitude: 23.7545,
      longitude: 92.7201,
      name: 'Durtlang Ridge Crest',
    };

    const evaluation = evaluateLocationRisk(durtlangCoords);

    expect(evaluation.nearestZone.id).toBe('zone-durtlang-01');
    expect(evaluation.isInsideDangerZone).toBe(true);
    expect(evaluation.overallRiskLevel).toBe('CRITICAL');
    expect(evaluation.headline).toContain('DANGER: YOU ARE INSIDE ACTIVE LANDSLIDE HAZARD ZONE');
    expect(evaluation.nearestShelter).not.toBeNull();
    expect(evaluation.nearestShelter?.name).toContain('Durtlang');
  });

  it('detects user approaching High Risk Zone at Ramhlun North', () => {
    const approachingRamhlun: LocationCoordinates = {
      latitude: 23.7431,
      longitude: 92.7352,
      name: 'Ramhlun Approach Corridor',
    };

    const evaluation = evaluateLocationRisk(approachingRamhlun);

    expect(evaluation.nearestZone.id).toBe('zone-ramhlun-03');
    expect(evaluation.isInsideDangerZone).toBe(false);
    expect(evaluation.isInsideWarningZone).toBe(true);
    expect(evaluation.overallRiskLevel).toBe('MODERATE');
    expect(evaluation.headline).toContain('CAUTION: APPROACHING LANDSLIDE HAZARD CORRIDOR');
  });

  it('confirms safe status in Guwahati with zero hazard', () => {
    const guwahatiCoords: LocationCoordinates = {
      latitude: 26.1445,
      longitude: 91.7362,
      name: 'Guwahati Dispur Valley',
    };

    const evaluation = evaluateLocationRisk(guwahatiCoords);

    expect(evaluation.isInsideDangerZone).toBe(false);
    expect(evaluation.isInsideWarningZone).toBe(false);
    expect(evaluation.overallRiskLevel).toBe('LOW');
    expect(evaluation.headline).toContain('Low-Risk Safe Area');
  });

  it('saves and clears location alert notifications persistently', () => {
    const mockAlert: LocationAlertNotification = {
      id: 'test-alert-1',
      timestamp: new Date().toISOString(),
      zoneId: 'zone-durtlang-01',
      zoneName: 'Durtlang Ridge Corridor',
      riskLevel: 'CRITICAL',
      distanceMeters: 350,
      headline: '⚠️ Critical Landslide Hazard Detected',
      message: 'Active slope displacement 14.8 mm/day',
      actionRequired: 'Evacuate to Durtlang Secondary School',
      read: false,
    };

    const updated = saveLocationAlert(mockAlert);
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe('test-alert-1');

    const retrieved = getStoredLocationAlerts();
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].zoneName).toBe('Durtlang Ridge Corridor');

    clearStoredLocationAlerts();
    expect(getStoredLocationAlerts().length).toBe(0);
  });
});
