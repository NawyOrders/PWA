import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyBranding,
  applyBrandingAssets,
  branchHoursLabel,
  brandingBranches,
  brandingFaviconUrl,
  brandingLogoUrl,
  brandingName,
  brandingVars,
  brandingVarNames,
  decodeBrandingCache,
  darken,
  lighten,
  safeColor,
  sanitizeBranding,
  tenantColorsEnabled,
  type BrandingCache,
} from "@/lib/branding";

/** `applyBranding` is a no-op while opt-in is off, so cleanup wipes the DOM. */
function wipeBrandingDom(): void {
  for (const name of brandingVarNames) document.documentElement.style.removeProperty(name);
  document.head.innerHTML = "";
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
}

afterEach(wipeBrandingDom);

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

describe("tenantColorsEnabled", () => {
  it("is off unless the deploy explicitly asks for the tenant palette", () => {
    expect(tenantColorsEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_APPLY_TENANT_COLORS", "true");
    expect(tenantColorsEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_APPLY_TENANT_COLORS", "yes");
    expect(tenantColorsEnabled()).toBe(false);
  });
});

describe("applyBranding — the app keeps its own colours by default", () => {
  it("paints no variable and does not touch the theme colour meta", () => {
    document.head.innerHTML = '<meta name="theme-color" content="#E8452C">';
    applyBranding({ primaryColor: "#123456", accentColor: "#ABCDEF", backgroundColor: "#000000" });

    for (const name of brandingVarNames) {
      expect(document.documentElement.style.getPropertyValue(name)).toBe("");
    }
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#E8452C");
  });

  it("is a no-op outside the browser", () => {
    const original = globalThis.document;
    vi.stubGlobal("document", undefined);
    expect(() => applyBranding({ primaryColor: "#123456" })).not.toThrow();
    vi.unstubAllGlobals();
    expect(globalThis.document).toBe(original);
  });
});

describe("applyBranding with NEXT_PUBLIC_APPLY_TENANT_COLORS=true", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APPLY_TENANT_COLORS", "true");
  });

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

const branchPayload = {
  branchId: "01a1c7cf-d522-73a7-b311-732a5150c803",
  nameAr: "سموحة",
  nameEn: "Smouha",
  address: "47, شارع ثقيف, الإسكندرية",
  latitude: 31.199969,
  longitude: 29.931818,
  phone: "+201234567890",
  status: "Open",
  isPrimary: true,
  sortOrder: 0,
  workingHours: [
    { dayOfWeek: "Sunday", isClosed: false, openTime: "10:00:00", closeTime: "23:00:00", closesNextDay: false },
  ],
  deliveryAreas: [{ deliveryAreaId: "area-1", nameAr: "سموحة", nameEn: "Smouha", deliveryFee: 15 }],
};

describe("sanitizeBranding", () => {
  it("keeps the documented payload, including branches", () => {
    const branding = sanitizeBranding({
      tenantId: "t-1",
      nameAr: "ميرزي",
      nameEn: "Merzy",
      logoUrl: "https://cdn.example.com/logo.jpg",
      primaryColor: "#1e3a8a",
      branches: [branchPayload],
    });

    expect(branding?.nameEn).toBe("Merzy");
    expect(branding?.primaryColor).toBe("#1E3A8A");
    expect(branding?.logoUrl).toBe("https://cdn.example.com/logo.jpg");
    expect(branding?.branches).toHaveLength(1);
    expect(branding?.branches?.[0]?.workingHours?.[0]?.openTime).toBe("10:00:00");
    expect(branding?.branches?.[0]?.deliveryAreas?.[0]?.deliveryFee).toBe(15);
  });

  it("drops non-HTTPS assets and malformed branches", () => {
    const branding = sanitizeBranding({
      logoUrl: "javascript:alert(1)",
      faviconUrl: "http://cdn.example.com/icon.png",
      whatsAppUrl: "https://wa.me/201234567890",
      branches: [
        { nameAr: "بلا معرف" },
        { branchId: "b-1", nameAr: "فرع", longitude: "not-a-number", workingHours: [{ dayOfWeek: "Funday" }] },
      ],
    });

    expect(branding?.logoUrl).toBeUndefined();
    expect(branding?.faviconUrl).toBeUndefined();
    expect(branding?.whatsAppUrl).toBe("https://wa.me/201234567890");
    expect(branding?.branches).toHaveLength(1);
    expect(branding?.branches?.[0]?.longitude).toBeNull();
    expect(branding?.branches?.[0]?.workingHours).toEqual([]);
  });

  it("sorts branches by their display order", () => {
    const branding = sanitizeBranding({
      branches: [
        { branchId: "b-2", sortOrder: 2 },
        { branchId: "b-1", sortOrder: 1 },
      ],
    });
    expect(branding?.branches?.map((branch) => branch.branchId)).toEqual(["b-1", "b-2"]);
  });

  it("rejects a value that is not an object", () => {
    for (const value of [null, undefined, "branding", 7, []]) {
      expect(sanitizeBranding(value)).toBeNull();
    }
  });
});

describe("brandingBranches", () => {
  it("localizes names and exposes the pickup-ready shape", () => {
    const branding = sanitizeBranding({ branches: [branchPayload] });
    const [branch] = brandingBranches(branding, "en");

    expect(branch?.id).toBe(branchPayload.branchId);
    expect(branch?.name).toBe("Smouha");
    expect(branch?.open).toBe(true);
    expect(branch?.isPrimary).toBe(true);
    expect(branch?.deliveryAreas[0]).toEqual({ id: "area-1", name: "Smouha", fee: 15 });
    expect(branchHoursLabel(branch!)).toBe("10:00 – 23:00");
  });

  it("falls back to the other language and marks a temporarily closed branch", () => {
    const branding = sanitizeBranding({
      branches: [{ branchId: "b-1", nameEn: "Only English", status: "TemporarilyClosed" }],
    });
    const [branch] = brandingBranches(branding, "ar");

    expect(branch?.name).toBe("Only English");
    expect(branch?.open).toBe(false);
    expect(branchHoursLabel(branch!)).toBeNull();
  });

  it("returns no branches when the payload has none", () => {
    expect(brandingBranches(null, "ar")).toEqual([]);
    expect(brandingBranches({ nameAr: "ميرزي" }, "ar")).toEqual([]);
  });
});

describe("branding assets", () => {
  it("accepts only HTTPS logo and favicon URLs", () => {
    expect(brandingLogoUrl({ logoUrl: "https://cdn.example.com/logo.jpg" })).toBe(
      "https://cdn.example.com/logo.jpg",
    );
    expect(brandingLogoUrl({ logoUrl: "http://cdn.example.com/logo.jpg" })).toBeNull();
    expect(brandingFaviconUrl({ logoUrl: "https://cdn.example.com/logo.jpg" })).toBe(
      "https://cdn.example.com/logo.jpg",
    );
    expect(
      brandingFaviconUrl({
        logoUrl: "https://cdn.example.com/logo.jpg",
        faviconUrl: "https://cdn.example.com/icon.png",
      }),
    ).toBe("https://cdn.example.com/icon.png");
  });

  it("points the icon links at the tenant asset and restores the defaults", () => {
    document.head.innerHTML = '<link rel="icon" href="/icons/logo.svg">';

    applyBrandingAssets({ faviconUrl: "https://cdn.example.com/icon.png" });
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    expect(icon?.getAttribute("href")).toBe("https://cdn.example.com/icon.png");

    applyBrandingAssets(null);
    expect(icon?.getAttribute("href")).toBe("/icons/logo.svg");
  });

  it("is a no-op outside the browser", () => {
    const original = globalThis.document;
    vi.stubGlobal("document", undefined);
    expect(() => applyBrandingAssets({ faviconUrl: "https://cdn.example.com/icon.png" })).not.toThrow();
    vi.unstubAllGlobals();
    expect(globalThis.document).toBe(original);
  });
});
