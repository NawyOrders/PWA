import { describe, expect, it } from "vitest";
import {
  areaName,
  areas,
  defaultCenter,
  distanceKm,
  formatCoords,
  nearestArea,
  type LatLng,
} from "@/lib/geo";

const smouha = areas.find((area) => area.id === "smouha")!;
const maadi = areas.find((area) => area.id === "maadi")!;

describe("geo domain", () => {
  it("returns zero distance for the same point", () => {
    expect(distanceKm(defaultCenter, defaultCenter)).toBeCloseTo(0, 8);
  });

  it("is symmetric and uses kilometres", () => {
    const forward = distanceKm(smouha, maadi);
    const backward = distanceKm(maadi, smouha);
    expect(forward).toBeCloseTo(backward, 8);
    expect(forward).toBeGreaterThan(150);
    expect(forward).toBeLessThan(220);
  });

  it("labels a pin with its nearest district", () => {
    expect(nearestArea({ lat: smouha.lat, lng: smouha.lng }).id).toBe("smouha");
    expect(nearestArea(defaultCenter).id).toBe("zanqu");
  });

  it("localizes district names", () => {
    expect(areaName(smouha, "ar")).toBe("سموحة");
    expect(areaName(smouha, "en")).toBe("Smouha");
  });

  it("formats coordinates to four decimals", () => {
    expect(formatCoords({ lat: 31.123456, lng: 29.987654 })).toBe("31.1235,29.9877");
    expect(formatCoords({ lat: -31.5, lng: -29.5 })).toBe("-31.5000,-29.5000");
  });

  it("keeps the area catalog unique and geographically valid", () => {
    const ids = areas.map((area) => area.id);
    expect(new Set(ids).size).toBe(ids.length);
    areas.forEach((area: LatLng & { name: string; nameEn: string }) => {
      expect(area.lat).toBeGreaterThan(-90);
      expect(area.lat).toBeLessThan(90);
      expect(area.lng).toBeGreaterThan(-180);
      expect(area.lng).toBeLessThan(180);
      expect(area.name.length).toBeGreaterThan(0);
      expect(area.nameEn.length).toBeGreaterThan(0);
    });
  });
});
