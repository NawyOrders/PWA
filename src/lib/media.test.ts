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
    expect(validateImageFile(file("image/webp"), RECEIPT_IMAGE_TYPES)).toEqual({
      ok: false,
      reason: "type",
    });
  });
});
