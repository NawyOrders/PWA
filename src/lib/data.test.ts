import { describe, expect, it } from "vitest";
import {
  categories,
  categoriesById,
  categoryCounts,
  desktopCategoryOrder,
  filterMenu,
  formatPrice,
  homeCategoryOrder,
  menuFilters,
  products,
  productsById,
  seedCart,
  seedFavorites,
  toArabicDigits,
} from "@/lib/data";

describe("catalog domain", () => {
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

  it("filters the menu by tag", () => {
    const family = filterMenu("وجبات العائلة");
    expect(family.length).toBeGreaterThan(0);
    family.forEach((product) => expect(product.tags).toContain("وجبات العائلة"));
  });

  it("treats the default filter as the burger category", () => {
    const burgers = filterMenu("الكل");
    expect(burgers.length).toBe(categoryCounts.burger);
    burgers.forEach((product) => expect(product.category).toBe("burger"));
  });

  it("returns an empty list for unknown filters", () => {
    expect(filterMenu("تصنيف غير موجود")).toEqual([]);
  });

  it("keeps product identifiers unique and resolvable", () => {
    const ids = products.map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(productsById[id]?.id).toBe(id));
  });

  it("keeps every product inside a known category and valid price", () => {
    products.forEach((product) => {
      expect(categoriesById[product.category]).toBeDefined();
      expect(product.price).toBeGreaterThan(0);
      expect(product.image).toMatch(/^\/images\/.+\.webp$/);
      if (product.oldPrice) expect(product.oldPrice).toBeGreaterThan(product.price);
    });
  });

  it("only exposes categories that are configured in the navigation orders", () => {
    const configured = new Set([...homeCategoryOrder, ...desktopCategoryOrder]);
    configured.forEach((id) => expect(categoriesById[id]).toBeDefined());
    expect(categories).toHaveLength(desktopCategoryOrder.length);
  });

  it("keeps menu filters discoverable", () => {
    expect(menuFilters[0]).toBe("الكل");
    menuFilters.slice(1).forEach((filter) => {
      expect(filterMenu(filter).length).toBeGreaterThan(0);
    });
  });

  it("keeps cart and favorite seeds pointing at real products", () => {
    seedCart.forEach((line) => {
      expect(productsById[line.productId]).toBeDefined();
      expect(line.qty).toBeGreaterThan(0);
      expect(line.price).toBeGreaterThan(0);
    });
    seedFavorites.forEach((id) => expect(productsById[id]).toBeDefined());
  });
});
