import { describe, expect, it } from "vitest";
import { formatPrice, toArabicDigits } from "@/lib/data";
import {
  hasVariants,
  indexMenu,
  isValidSelection,
  normalizeMenuImage,
  resolveVariantPrice,
  startingPrice,
  tenantAssetUrl,
} from "@/lib/menu";
import { testMenu } from "@/test/menu";

describe("money and digit formatting", () => {
  it("formats prices without currency symbols", () => {
    expect(formatPrice(0)).toBe("0");
    expect(formatPrice(1250)).toBe("1,250");
    expect(formatPrice(999999)).toBe("999,999");
  });

  it("converts Latin digits to Arabic-Indic digits and leaves separators intact", () => {
    expect(toArabicDigits("010 1234")).toBe("٠١٠ ١٢٣٤");
    expect(toArabicDigits(19885)).toBe("١٩٨٨٥");
    expect(toArabicDigits("EGP 30")).toBe("EGP ٣٠");
  });
});

describe("menu helpers", () => {
  const index = indexMenu(testMenu);

  it("indexes categories and items by their ids", () => {
    expect(index.categories).toHaveLength(testMenu.categories.length);
    expect(index.items).toHaveLength(
      testMenu.categories.reduce((total, category) => total + category.items.length, 0),
    );
    for (const entry of index.items) {
      expect(index.itemsById.get(entry.id)).toBe(entry);
      expect(index.categoriesById.get(entry.categoryId)?.items).toContain(entry);
    }
  });

  it("prices a fixed item from its own price and a variant item from its lowest variant", () => {
    const fixed = index.itemsById.get("beef-burger");
    const variant = index.itemsById.get("strips-meal");
    if (!fixed || !variant) throw new Error("the test menu is missing its fixtures");

    expect(hasVariants(fixed)).toBe(false);
    expect(startingPrice(fixed)).toBe(120);

    expect(hasVariants(variant)).toBe(true);
    expect(startingPrice(variant)).toBe(155);
    expect(resolveVariantPrice(variant, "8 قطع")).toBe(200);
    expect(resolveVariantPrice(variant, "غير موجود")).toBeNull();
    expect(isValidSelection(variant, null)).toBe(false);
    expect(isValidSelection(variant, "5 قطع")).toBe(true);
  });
});

describe("menu image normalisation", () => {
  it("keeps an absolute http(s) URL as written", () => {
    expect(normalizeMenuImage("https://cdn.example.com/a.jpg", "pablo")).toBe("https://cdn.example.com/a.jpg");
    expect(normalizeMenuImage("  http://cdn.example.com/b.png  ", "pablo")).toBe("http://cdn.example.com/b.png");
  });

  it("maps a relative path into the tenant asset route", () => {
    expect(normalizeMenuImage("images/antara.jpg", "pablo")).toBe("/api/tenant-assets/pablo/images/antara.jpg");
    expect(normalizeMenuImage("logo.webp", "pablo")).toBe("/api/tenant-assets/pablo/logo.webp");
    expect(normalizeMenuImage("photos/وجبة لحم.jpg", "pablo")).toBe(
      `/api/tenant-assets/pablo/photos/${encodeURIComponent("وجبة لحم.jpg")}`,
    );
    expect(tenantAssetUrl("pablo", ["images", "a b.jpg"])).toBe("/api/tenant-assets/pablo/images/a%20b.jpg");
  });

  it("rejects anything that is not an absolute http(s) URL or a safe relative path", () => {
    for (const value of [
      "",
      "   ",
      null,
      undefined,
      42,
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "file:///etc/passwd",
      "//evil.example.com/a.jpg",
      "/images/a.jpg",
      "images\\a.jpg",
      "../secret.jpg",
      "images/../secret.jpg",
      "./images/a.jpg",
      "images//a.jpg",
      "images/a.jpg?x=1",
      "images/a.jpg#frag",
      "https://",
    ]) {
      expect(normalizeMenuImage(value, "pablo")).toBeNull();
    }
  });
});
