import { describe, expect, it } from "vitest";
import { colorScale, contrastRatio, readableTextOn } from "@/lib/color-scale";

/** HSL lightness of a `#rrggbb` value, for checking the ramp's ordering. */
function lightness(hex: string): number {
  const value = hex.slice(1);
  const int = Number.parseInt(value, 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((part) => part / 255);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

describe("colorScale", () => {
  it("keeps the input as the 500 step", () => {
    expect(colorScale("#4C1354")[500]).toBe("#4C1354");
    expect(colorScale("#4c1354")[500]).toBe("#4C1354");
  });

  it("orders every step from lightest to darkest", () => {
    const scale = colorScale("#4C1354");
    const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
    for (let index = 1; index < steps.length; index += 1) {
      expect(lightness(scale[steps[index]])).toBeLessThan(lightness(scale[steps[index - 1]]));
    }
  });

  it("keeps the hue and a usable saturation across the ramp", () => {
    const scale = colorScale("#4C1354");
    for (const step of [50, 100, 200, 300, 400, 600, 700, 800, 900] as const) {
      expect(scale[step]).toMatch(/^#[0-9A-F]{6}$/);
      expect(scale[step]).not.toBe("#FFFFFF");
      expect(scale[step]).not.toBe("#000000");
    }
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG endpoint for white on black", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("is symmetric and 1:1 for a colour against itself", () => {
    expect(contrastRatio("#4C1354", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#4C1354"),
      5,
    );
    expect(contrastRatio("#4C1354", "#4C1354")).toBeCloseTo(1, 5);
  });
});

describe("readableTextOn", () => {
  it("picks white on a dark brand colour", () => {
    expect(readableTextOn("#4C1354")).toBe("#FFFFFF");
  });

  it("picks the app ink on a light surface", () => {
    expect(readableTextOn("#FBF3EA")).toBe("#201A16");
  });
});
