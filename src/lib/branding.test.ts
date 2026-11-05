import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyBranding,
  brandingName,
  brandingVars,
  brandingVarNames,
  decodeBrandingCache,
  darken,
  lighten,
  safeColor,
  type BrandingCache,
} from "@/lib/branding";

afterEach(() => {
  applyBranding(null);
  document.head.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("safeColor", () => {
  it("accepts only real hex literals", () => {
    expect(safeColor("#E8452C")).toBe("#E8452C");
    expect(safeColor("#e8452c")).toBe("#E8452C");
    expect(safeColor("  #f80  ")).toBe("#F80");
  });

  it("rejects anything that could smuggle CSS into a style attribute", () => {
    for (const value of [
      "red",
      "javascript:alert(1)",
      "#12345",
      "#GGGGGG",
      "rgb(1,2,3)",
      "#E8452C; position:absolute",
      "",
      null,
      undefined,
      42,
      { color: "#E8452C" },
    ]) {
      expect(safeColor(value)).toBeNull();
    }
  });
});

describe("color math", () => {
  it("blends towards white for soft tints", () => {
    expect(lighten("#000000", 0.5)).toBe("#808080");
    expect(lighten("#FFFFFF", 0.5)).toBe("#FFFFFF");
  });

  it("blends towards black for pressed states", () => {
    expect(darken("#FFFFFF", 0.5)).toBe("#808080");
    expect(darken("#000000", 0.5)).toBe("#000000");
  });

  it("expands a shorthand hex before blending", () => {
    expect(lighten("#f80", 0)).toBe("#FF8800");
    expect(darken("#f80", 0)).toBe("#FF8800");
  });

  it("stays inside the byte range", () => {
    expect(lighten("#0A0A0A", 1)).toBe("#FFFFFF");
    expect(darken("#0A0A0A", 2)).toBe("#000000");
  });
});

describe("brandingVars", () => {
  it("derives the whole brand ramp from the primary colour", () => {
    const vars = brandingVars({ primaryColor: "#E8452C" });
    expect(vars["--color-brand"]).toBe("#E8452C");
    expect(vars["--color-brand-soft"]).toBe(lighten("#E8452C", 0.84));
    expect(vars["--color-brand-dark"]).toBe(darken("#E8452C", 0.14));
  });

  it("uses the tenant secondary colour as the dark brand step", () => {
    const vars = brandingVars({ primaryColor: "#E8452C", secondaryColor: "#102A56" });
    expect(vars["--color-brand-dark"]).toBe("#102A56");
  });

  it("keeps the dark step without a primary colour", () => {
    expect(brandingVars({ secondaryColor: "#102A56" })).toEqual({ "--color-brand-dark": "#102A56" });
  });

  it("ignores a secondary colour that is not a hex literal", () => {
    const vars = brandingVars({ primaryColor: "#E8452C", secondaryColor: "crimson" });
    expect(vars["--color-brand-dark"]).toBe(darken("#E8452C", 0.14));
  });

  it("maps accent, background, surface and on-brand text", () => {
    const vars = brandingVars({
      accentColor: "#F2B705",
      backgroundColor: "#FFF7ED",
      surfaceColor: "#FFFBF5",
      textOnPrimaryColor: "#FFFFFF",
    });
    expect(vars).toEqual({
      "--color-gold": "#F2B705",
      "--color-cream": "#FFF7ED",
      "--color-cream-50": "#FFFBF5",
      "--color-brand-contrast": "#FFFFFF",
    });
  });

  it("returns nothing for a branding object with no usable colours", () => {
    expect(brandingVars({ nameAr: "ناوي", tenantId: "t-1" })).toEqual({});
  });
});

describe("applyBranding", () => {
  it("writes the palette inline on <html> and the theme colour meta", () => {
    document.head.innerHTML = '<meta name="theme-color" content="#E8452C">';
    applyBranding({ primaryColor: "#123456", accentColor: "#ABCDEF" });

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--color-brand")).toBe("#123456");
    expect(root.style.getPropertyValue("--color-gold")).toBe("#ABCDEF");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#123456");
  });

  it("leaves the theme colour meta alone without a primary colour", () => {
    document.head.innerHTML = '<meta name="theme-color" content="#E8452C">';
    applyBranding({ accentColor: "#ABCDEF" });
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#E8452C");
  });

  it("removes every branding variable again when the tenant has none", () => {
    applyBranding({ primaryColor: "#123456", accentColor: "#ABCDEF", backgroundColor: "#111111" });
    applyBranding(null);

    const root = document.documentElement;
    for (const name of brandingVarNames) expect(root.style.getPropertyValue(name)).toBe("");
  });

  it("drops hostile colours before they reach the DOM", () => {
    applyBranding({ primaryColor: "#123456", accentColor: "url(evil); color:red" });
    expect(document.documentElement.style.getPropertyValue("--color-gold")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--color-brand")).toBe("#123456");
  });

  it("re-asserts the tenant colour when the router rewrites the meta", async () => {
    document.head.innerHTML = '<meta name="theme-color" content="#E8452C">';
    applyBranding({ primaryColor: "#123456" });

    // what the App Router does on the next navigation
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#E8452C");

    await waitFor(() =>
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#123456"),
    );
  });

  it("follows a colour change instead of pinning the first one", async () => {
    document.head.innerHTML = '<meta name="theme-color" content="#E8452C">';
    applyBranding({ primaryColor: "#123456" });
    applyBranding({ primaryColor: "#ABCDEF" });

    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#E8452C");
    await waitFor(() =>
      expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#ABCDEF"),
    );
  });

  it("stops guarding the meta once branding is cleared", async () => {
    document.head.innerHTML = '<meta name="theme-color" content="#E8452C">';
    applyBranding({ primaryColor: "#123456" });
    applyBranding(null);

    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#FF0000");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#FF0000");
  });

  it("leaves the theme untouched with no theme-color meta present", () => {
    expect(() => applyBranding({ primaryColor: "#123456" })).not.toThrow();
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });

  it("is a no-op outside the browser", () => {
    const original = globalThis.document;
    vi.stubGlobal("document", undefined);
    expect(() => applyBranding({ primaryColor: "#123456" })).not.toThrow();
    vi.unstubAllGlobals();
    expect(globalThis.document).toBe(original);
  });
});

describe("brandingName", () => {
  it("prefers the language the app is showing", () => {
    expect(brandingName({ nameAr: "ناوي", nameEn: "Nawy" }, "ar")).toBe("ناوي");
    expect(brandingName({ nameAr: "ناوي", nameEn: "Nawy" }, "en")).toBe("Nawy");
  });

  it("falls back to the other language, then to nothing", () => {
    expect(brandingName({ nameEn: "Nawy" }, "ar")).toBe("Nawy");
    expect(brandingName({ nameAr: "   " }, "en")).toBeNull();
    expect(brandingName(null, "ar")).toBeNull();
    expect(brandingName({}, "en")).toBeNull();
  });

  it("caps a hostile name", () => {
    expect(brandingName({ nameAr: "n".repeat(500) }, "ar")).toHaveLength(80);
  });
});

describe("decodeBrandingCache", () => {
  it("accepts a cache the app wrote itself", () => {
    const cache: BrandingCache = {
      etag: '"b1"',
      branding: {
        tenantId: "t-1",
        nameAr: "ناوي",
        primaryColor: "#E8452C",
        socialLinks: { instagram: "https://instagram.com/nawy" },
      },
    };
    expect(decodeBrandingCache(JSON.parse(JSON.stringify(cache)))).toEqual(cache);
  });

  it("rejects a non-object or a missing branding payload", () => {
    for (const value of [null, undefined, "branding", 7, [], { etag: '"b1"' }]) {
      expect(decodeBrandingCache(value)).toBeNull();
    }
  });

  it("re-validates colours and drops the unusable ones", () => {
    const decoded = decodeBrandingCache({
      etag: '"b2"',
      branding: { primaryColor: "#E8452C", accentColor: "red", surfaceColor: 'x("y")' },
    });
    expect(decoded?.branding.primaryColor).toBe("#E8452C");
    expect(decoded?.branding.accentColor).toBeUndefined();
    expect(decoded?.branding.surfaceColor).toBeUndefined();
  });

  it("keeps only https social links", () => {
    const decoded = decodeBrandingCache({
      etag: null,
      branding: {
        socialLinks: {
          instagram: "https://instagram.com/nawy",
          facebook: "http://facebook.com/nawy",
          evil: "javascript:alert(1)",
          numeric: 5,
        },
      },
    });
    expect(decoded?.branding.socialLinks).toEqual({ instagram: "https://instagram.com/nawy" });
    expect(decoded?.etag).toBeNull();
  });

  it("ignores non-string text fields and truncates the long ones", () => {
    const decoded = decodeBrandingCache({
      etag: "e".repeat(500),
      branding: { nameAr: "n".repeat(900), contactPhone: 1234567890 },
    });
    expect(decoded?.branding.nameAr).toHaveLength(300);
    expect(decoded?.etag).toHaveLength(120);
    expect(decoded?.branding.contactPhone).toBeUndefined();
  });

  it("drops an oversized social link value", () => {
    const decoded = decodeBrandingCache({
      branding: { socialLinks: { x: `https://x.com/${"u".repeat(600)}` } },
    });
    expect(decoded?.branding.socialLinks?.x).toHaveLength(300);
  });
});
