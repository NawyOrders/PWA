import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTenantMenu, tenantMenuPath } from "@/lib/static-menu-data";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "tenant-menus-"));
  vi.stubEnv("TENANT_DATA_DIR", root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

function writeMenu(slug: string, body: unknown) {
  mkdirSync(path.join(root, slug), { recursive: true });
  writeFileSync(path.join(root, slug, "menu.json"), JSON.stringify(body));
}

const menu = {
  currency: "EGP",
  categories: [
    {
      id: "burger",
      nameAr: "برجر",
      nameEn: "Burgers",
      items: [
        { id: "beef-burger", nameAr: "برجر لحم", nameEn: "Beef Burger", price: 120 },
        {
          id: "strips-meal",
          nameAr: "وجبة استربس",
          nameEn: "Strips Meal",
          price: null,
          variants: { "5 قطع": 155, "8 قطع": 200 },
        },
      ],
    },
    {
      id: "drinks",
      nameAr: "مشروبات",
      nameEn: "Drinks",
      items: [{ id: "cola", nameAr: "كولا", nameEn: "Cola", price: 25 }],
    },
  ],
};

describe("loadTenantMenu", () => {
  it("reads and validates the slug's menu, turning variants into an ordered list", async () => {
    writeMenu("pablo", menu);

    const result = await loadTenantMenu("pablo");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.menu.currency).toBe("EGP");
    expect(result.menu.categories.map((category) => category.id)).toEqual(["burger", "drinks"]);

    const burger = result.menu.categories[0];
    expect(burger.items[0]).toMatchObject({ id: "beef-burger", price: 120, variants: [], categoryId: "burger" });
    expect(burger.items[1]).toMatchObject({
      id: "strips-meal",
      price: null,
      variants: [
        { key: "5 قطع", price: 155 },
        { key: "8 قطع", price: 200 },
      ],
      categoryId: "burger",
    });
  });

  it("defaults the currency when the file omits it", async () => {
    writeMenu("pablo", { categories: menu.categories });
    const result = await loadTenantMenu("pablo");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.menu.currency).toBe("EGP");
  });

  it("answers not-found for a slug with no folder or no menu file", async () => {
    expect(await loadTenantMenu("unknown")).toEqual({ status: "not-found" });

    mkdirSync(path.join(root, "empty"));
    expect(await loadTenantMenu("empty")).toEqual({ status: "not-found" });
  });

  it("never reads outside the data folder for a hostile slug", async () => {
    expect(tenantMenuPath("../etc")).toBeNull();
    expect(tenantMenuPath("a/b")).toBeNull();
    expect(await loadTenantMenu("../etc")).toEqual({ status: "not-found" });
  });

  it("is unavailable, not not-found, when the file is not valid JSON", async () => {
    mkdirSync(path.join(root, "broken"));
    writeFileSync(path.join(root, "broken", "menu.json"), "{ nope");
    expect(await loadTenantMenu("broken")).toEqual({ status: "unavailable" });
  });

  it("is unavailable when an item id is duplicated across categories", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    writeMenu("pablo", {
      categories: [
        { id: "burger", nameAr: "برجر", items: [{ id: "dup", nameAr: "أ", price: 10 }] },
        { id: "drinks", nameAr: "مشروبات", items: [{ id: "dup", nameAr: "ب", price: 20 }] },
      ],
    });

    expect(await loadTenantMenu("pablo")).toEqual({ status: "unavailable" });
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("duplicate item id: dup"));
  });

  it("is unavailable when an item has neither a price nor variants", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    writeMenu("pablo", {
      categories: [
        { id: "burger", nameAr: "برجر", items: [{ id: "mystery", nameAr: "لغز" }] },
      ],
    });

    expect(await loadTenantMenu("pablo")).toEqual({ status: "unavailable" });
    expect(errors).toHaveBeenCalled();
  });

  it("is unavailable when a variant carries a non-numeric price", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    writeMenu("pablo", {
      categories: [
        {
          id: "burger",
          nameAr: "برجر",
          items: [{ id: "meal", nameAr: "وجبة", price: null, variants: { large: "200" } }],
        },
      ],
    });

    expect(await loadTenantMenu("pablo")).toEqual({ status: "unavailable" });
  });

  it("is unavailable when a category or its items array is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    writeMenu("pablo", { categories: [{ id: "burger", nameAr: "برجر" }] });
    expect(await loadTenantMenu("pablo")).toEqual({ status: "unavailable" });

    writeMenu("pablo", { categories: "burger" });
    expect(await loadTenantMenu("pablo")).toEqual({ status: "unavailable" });
  });
});

describe("menu images", () => {
  function imageMenu(item: Record<string, unknown>, categoryImage: unknown = undefined) {
    return {
      categories: [
        {
          id: "burger",
          nameAr: "برجر",
          ...(categoryImage === undefined ? {} : { image: categoryImage }),
          items: [{ id: "beef-burger", nameAr: "برجر لحم", price: 120, ...item }],
        },
      ],
    };
  }

  async function firstCategory(body: unknown) {
    writeMenu("pablo", body);
    const result = await loadTenantMenu("pablo");
    if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
    return result.menu.categories[0];
  }

  it("keeps an absolute https URL on both the category and the item", async () => {
    const category = await firstCategory(
      imageMenu(
        { image: "  https://cdn.example.com/items/beef.jpg  " },
        "https://cdn.example.com/categories/burger.jpg",
      ),
    );

    expect(category.image).toBe("https://cdn.example.com/categories/burger.jpg");
    expect(category.items[0].image).toBe("https://cdn.example.com/items/beef.jpg");
  });

  it("maps a relative path to the tenant asset route", async () => {
    const category = await firstCategory(imageMenu({ image: "images/antara.jpg" }, "images/burger.jpg"));

    expect(category.image).toBe("/api/tenant-assets/pablo/images/burger.jpg");
    expect(category.items[0].image).toBe("/api/tenant-assets/pablo/images/antara.jpg");
  });

  it("nulls javascript:, empty, non-string and escaping images without dropping the menu", async () => {
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    writeMenu("pablo", {
      categories: [
        {
          id: "burger",
          nameAr: "برجر",
          image: "javascript:alert(1)",
          items: [
            { id: "script", nameAr: "سكربت", price: 10, image: "javascript:alert(1)" },
            { id: "empty", nameAr: "فاضي", price: 20, image: "" },
            { id: "number", nameAr: "رقم", price: 30, image: 42 },
            { id: "escape", nameAr: "هروب", price: 40, image: "../secret.jpg" },
            { id: "missing", nameAr: "مخفي", price: 50 },
          ],
        },
      ],
    });

    const result = await loadTenantMenu("pablo");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const category = result.menu.categories[0];
    expect(category.image).toBeNull();
    expect(category.items.map((item) => item.image)).toEqual([null, null, null, null, null]);
    expect(category.items.map((item) => item.id)).toEqual(["script", "empty", "number", "escape", "missing"]);
    // javascript:, the number, the traversal and the category value are logged;
    // an absent or empty image is simply "no artwork".
    expect(warnings).toHaveBeenCalledTimes(4);
  });
});
