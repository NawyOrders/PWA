import { describe, expect, it } from "vitest";
import {
  brandingBackgroundColor,
  brandingIcon,
  brandingMetadataIcons,
  brandingThemeColor,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_FAVICON,
  DEFAULT_THEME_COLOR,
} from "@/lib/branding-metadata";

describe("brandingIcon", () => {
  it("uses the tenant favicon for both the tab and touch icon", () => {
    expect(
      brandingMetadataIcons({ faviconUrl: "https://cdn.example.com/icon.png" }),
    ).toEqual({
      icon: [{ url: "https://cdn.example.com/icon.png", type: "image/png" }],
      apple: [{ url: "https://cdn.example.com/icon.png", type: "image/png" }],
    });
  });

  it("falls back to the logo when faviconUrl is null", () => {
    expect(brandingIcon({ logoUrl: "https://cdn.example.com/logo.jpg", faviconUrl: null })).toEqual({
      url: "https://cdn.example.com/logo.jpg",
      type: "image/jpeg",
    });
    expect(brandingIcon({ logoUrl: "https://cdn.example.com/logo.jpg" })).toEqual({
      url: "https://cdn.example.com/logo.jpg",
      type: "image/jpeg",
    });
  });

  it("falls back to the shipped icon when both URLs are missing", () => {
    expect(brandingIcon({})).toEqual(DEFAULT_FAVICON);
  });

  it("ignores an unsafe favicon and uses the logo instead", () => {
    expect(
      brandingIcon({
        faviconUrl: "http://cdn.example.com/icon.png",
        logoUrl: "https://cdn.example.com/logo.png",
      }),
    ).toEqual({ url: "https://cdn.example.com/logo.png", type: "image/png" });
    expect(brandingIcon({ faviconUrl: "http://cdn.example.com/icon.png" })).toEqual(DEFAULT_FAVICON);
  });

  it("falls back to the shipped icon without a tenant", () => {
    expect(brandingMetadataIcons(null)).toEqual({
      icon: [DEFAULT_FAVICON],
      apple: [DEFAULT_FAVICON],
    });
  });
});

describe("manifest colours", () => {
  it("uses the tenant palette", () => {
    expect(
      brandingThemeColor({ primaryColor: "#4C1354" }),
    ).toBe("#4C1354");
    expect(
      brandingBackgroundColor({ backgroundColor: "#4C1354" }),
    ).toBe("#4C1354");
  });

  it("uses the app defaults when the fields are missing or invalid", () => {
    expect(brandingThemeColor(null)).toBe(DEFAULT_THEME_COLOR);
    expect(brandingThemeColor({ primaryColor: null })).toBe(DEFAULT_THEME_COLOR);
    expect(brandingThemeColor({ primaryColor: "red" })).toBe(DEFAULT_THEME_COLOR);
    expect(brandingBackgroundColor({})).toBe(DEFAULT_BACKGROUND_COLOR);
  });
});
