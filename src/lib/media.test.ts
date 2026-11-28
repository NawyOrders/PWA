import { mediaBaseFromUrl, setTenantMediaBase } from "@/lib/media";
import { bypassImageOptimizer, menuImage } from "@/lib/tenant-menu";
import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  RECEIPT_IMAGE_TYPES,
  UPLOAD_IMAGE_TYPES,
  heroImage,
  heroIsMirrored,
  heroMedia,
  validateImageFile,
} from "@/lib/media";

describe("hero media selection", () => {
  it("uses the RTL artwork for Arabic", () => {
    expect(heroImage("ar")).toBe(heroMedia.rtl);
    expect(heroIsMirrored("ar")).toBe(false);
  });

  it("mirrors the RTL artwork for English until dedicated LTR art exists", () => {
    expect(heroImage("en")).toBe(heroMedia.rtl);
    expect(heroIsMirrored("en")).toBe(heroMedia.ltr === null);
  });
});

describe("image upload validation", () => {
  const file = (type: string, size = 1024) => ({ type, size });

  it("accepts every allowed upload type under the size limit", () => {
    for (const type of UPLOAD_IMAGE_TYPES) {
      expect(validateImageFile(file(type))).toEqual({ ok: true });
    }
  });

  it("rejects unsupported MIME types", () => {
    for (const type of ["image/gif", "image/svg+xml", "application/pdf", ""]) {
      expect(validateImageFile(file(type))).toEqual({ ok: false, reason: "type" });
    }
  });

  it("treats the limit as inclusive and rejects anything larger", () => {
    expect(validateImageFile(file("image/png", MAX_UPLOAD_BYTES))).toEqual({ ok: true });
    expect(validateImageFile(file("image/png", MAX_UPLOAD_BYTES + 1))).toEqual({
      ok: false,
      reason: "size",
    });
  });

  it("applies the stricter receipt allowlist", () => {
    expect(validateImageFile(file("image/png"), RECEIPT_IMAGE_TYPES)).toEqual({ ok: true });
    expect(validateImageFile(file("image/jpeg"), RECEIPT_IMAGE_TYPES)).toEqual({ ok: true });
    // iPhone camera rolls hand receipts over as HEIC; the receipt flow accepts them.
    expect(validateImageFile(file("image/heic"), RECEIPT_IMAGE_TYPES)).toEqual({ ok: true });
    expect(validateImageFile(file("image/heif"), RECEIPT_IMAGE_TYPES)).toEqual({ ok: true });
    expect(validateImageFile(file("image/webp"), RECEIPT_IMAGE_TYPES)).toEqual({
      ok: false,
      reason: "type",
    });
  });
});

describe("tenant media base", () => {
  const logo = "https://proj.supabase.co/storage/v1/object/public/nawy-orders/onboarding/a/logo.jpg";

  it("derives the public storage prefix from the tenant branding url", () => {
    expect(mediaBaseFromUrl(logo)).toBe("https://proj.supabase.co/storage/v1/object/public/nawy-orders");
    expect(mediaBaseFromUrl("https://example.test/logo.jpg")).toBeNull();
    expect(mediaBaseFromUrl("http://proj.supabase.co/storage/v1/object/public/b/x.jpg")).toBeNull();
    expect(mediaBaseFromUrl(null)).toBeNull();
  });

  it("resolves a menu image key once the tenant base is known", () => {
    setTenantMediaBase(logo);
    expect(menuImage("tenant-1/menu/items/a.jpg", null)).toBe(
      "https://proj.supabase.co/storage/v1/object/public/nawy-orders/tenant-1/menu/items/a.jpg",
    );
    setTenantMediaBase(null);
    expect(menuImage("tenant-1/menu/items/a.jpg", null)).toBe("/images/burger.webp");
  });
});

describe("bypassImageOptimizer", () => {
  it("sends a tenant-hosted photo straight to the browser", () => {
    // The tenant storage host is only known at runtime, so next/image cannot
    // have it in remotePatterns and would answer 400 for it.
    expect(bypassImageOptimizer("https://cxvrtmdsxfwhhmwnazos.supabase.co/storage/v1/object/public/nawy-orders/t/menu/items/a.jpg")).toBe(true);
    expect(bypassImageOptimizer("https://cdn.example.com/photo.jpg")).toBe(true);
  });

  it("keeps the hosts next.config.ts allows on the optimiser", () => {
    expect(bypassImageOptimizer("https://images.unsplash.com/photo-1?w=600")).toBe(false);
    expect(bypassImageOptimizer("https://www.themealdb.com/images/media/meals/a.jpg")).toBe(false);
  });

  it("keeps local assets optimised and ignores an empty source", () => {
    expect(bypassImageOptimizer("/images/burger.webp")).toBe(false);
    expect(bypassImageOptimizer("data:image/jpeg;base64,AAA")).toBe(false);
    expect(bypassImageOptimizer(null)).toBe(false);
  });
});
