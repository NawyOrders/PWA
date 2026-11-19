import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Menu } from "@/lib/menu";
import {
  loadTenantOffers,
  parseOffers,
  tenantOffersPath,
} from "@/lib/static-offers-data";

const NOW = new Date("2026-06-01T12:00:00Z");

const menu: Menu = {
  currency: "EGP",
  categories: [
    {
      id: "burger",
      nameAr: "برجر",
      nameEn: "Burgers",
      image: null,
      items: [
        {
          id: "beef-burger",
          nameAr: "برجر لحم",
          nameEn: "Beef Burger",
          price: 120,
          variants: [],
          image: null,
          categoryId: "burger",
        },
      ],
    },
  ],
};

function rawOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: "offer-1",
    enabled: true,
    order: 1,
    theme: "dark",
    image: "https://cdn.example.com/offer.jpg",
    badgeAr: "عرض",
    badgeEn: "Offer",
    titleAr: "عنوان",
    titleEn: "Title",
    textAr: "نص",
    textEn: "Text",
    ctaAr: "اطلب",
    ctaEn: "Order",
    action: { type: "path", value: "/categories" },
    ...overrides,
  };
}

function parse(offers: unknown[]) {
  return parseOffers({ offers }, "pablo", menu, NOW);
}

function ids(result: ReturnType<typeof parse>) {
  if (!("offers" in result)) throw new Error(`expected offers, got ${result.error}`);
  return result.offers.map((offer) => offer.id);
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "tenant-offers-"));
  vi.stubEnv("TENANT_DATA_DIR", root);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

function writeOffers(slug: string, body: unknown) {
  mkdirSync(path.join(root, slug), { recursive: true });
  writeFileSync(path.join(root, slug, "offers.json"), JSON.stringify(body));
}

describe("parseOffers", () => {
  it("keeps valid offers sorted by order, then id", () => {
    const result = parse([
      rawOffer({ id: "z-last", order: 2 }),
      rawOffer({ id: "b-second", order: 1 }),
      rawOffer({ id: "a-first", order: 1 }),
    ]);

    expect(ids(result)).toEqual(["a-first", "b-second", "z-last"]);
  });

  it("drops disabled offers", () => {
    expect(ids(parse([rawOffer({ id: "on" }), rawOffer({ id: "off", enabled: false })]))).toEqual(["on"]);
  });

  it("drops offers whose titles are both empty", () => {
    expect(
      ids(
        parse([
          rawOffer({ id: "empty", titleAr: "  ", titleEn: "" }),
          rawOffer({ id: "only-en", titleAr: "", titleEn: "Title" }),
        ]),
      ),
    ).toEqual(["only-en"]);
  });

  it("drops offers whose schedule has not started or has ended", () => {
    const result = parse([
      rawOffer({ id: "later", startsAt: "2026-06-02T00:00:00Z" }),
      rawOffer({ id: "ended", endsAt: "2026-05-31T23:59:59Z" }),
      rawOffer({ id: "live", startsAt: "2026-05-01T00:00:00Z", endsAt: "2026-07-01T00:00:00Z" }),
      rawOffer({ id: "open" }),
    ]);

    expect(ids(result)).toEqual(["live", "open"]);
  });

  it("drops offers with an unknown action type or an empty value", () => {
    const result = parse([
      rawOffer({ id: "unknown", action: { type: "external", value: "https://x.test" } }),
      rawOffer({ id: "empty", action: { type: "path", value: "  " } }),
      rawOffer({ id: "ok", action: { type: "search", value: "بيتزا" } }),
    ]);

    expect(ids(result)).toEqual(["ok"]);
  });

  it("drops product and category actions that are not in the menu", () => {
    const result = parse([
      rawOffer({ id: "missing-product", action: { type: "product", value: "ghost" } }),
      rawOffer({ id: "missing-category", action: { type: "category", value: "ghost" } }),
      rawOffer({ id: "product", action: { type: "product", value: "beef-burger" } }),
      rawOffer({ id: "category", action: { type: "category", value: "burger" } }),
    ]);

    expect(ids(result)).toEqual(["category", "product"]);
  });

  it("drops paths that are not site-absolute or are protocol-relative", () => {
    const result = parse([
      rawOffer({ id: "relative", action: { type: "path", value: "categories" } }),
      rawOffer({ id: "external", action: { type: "path", value: "//evil.example" } }),
      rawOffer({ id: "ok", action: { type: "path", value: "/categories" } }),
    ]);

    expect(ids(result)).toEqual(["ok"]);
  });

  it("keeps the first offer when an id repeats and logs the later one", () => {
    const warned = vi.mocked(console.warn);
    const result = parse([
      rawOffer({ id: "same", titleAr: "الأول" }),
      rawOffer({ id: "same", titleAr: "الثاني" }),
    ]);

    if (!("offers" in result)) throw new Error(result.error);
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0].titleAr).toBe("الأول");
    expect(warned.mock.calls.flat().join("\n")).toContain("duplicate offer id: same");
  });

  it("normalises images and nulls unsafe schemes", () => {
    const result = parse([
      rawOffer({
        id: "images",
        image: "images/offer.jpg",
        imageEn: "https://cdn.example.com/en.jpg",
      }),
      rawOffer({ id: "unsafe", image: "javascript:alert(1)", imageEn: "" }),
    ]);

    if (!("offers" in result)) throw new Error(result.error);
    expect(result.offers[0].image).toBe("/api/tenant-assets/pablo/images/offer.jpg");
    expect(result.offers[0].imageEn).toBe("https://cdn.example.com/en.jpg");
    expect(result.offers[1].image).toBeNull();
    expect(result.offers[1].imageEn).toBeNull();
  });

  it("defaults an unknown theme to light", () => {
    const result = parse([rawOffer({ id: "theme", theme: "neon" })]);
    if (!("offers" in result)) throw new Error(result.error);
    expect(result.offers[0].theme).toBe("light");
  });
});

describe("loadTenantOffers", () => {
  it("reads the slug's file and answers ok, including an empty list", async () => {
    writeOffers("pablo", { offers: [rawOffer()] });
    const result = await loadTenantOffers("pablo", menu, NOW);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.offers.map((offer) => offer.id)).toEqual(["offer-1"]);

    writeOffers("pablo", { offers: [] });
    expect(await loadTenantOffers("pablo", menu, NOW)).toEqual({ status: "ok", offers: [] });
  });

  it("answers not-found for a slug with no folder or no file", async () => {
    expect(await loadTenantOffers("unknown", menu, NOW)).toEqual({ status: "not-found" });
    mkdirSync(path.join(root, "empty"));
    expect(await loadTenantOffers("empty", menu, NOW)).toEqual({ status: "not-found" });
  });

  it("never reads outside the data folder for a hostile slug", async () => {
    expect(tenantOffersPath("../etc")).toBeNull();
    expect(tenantOffersPath("a/b")).toBeNull();
    expect(await loadTenantOffers("../etc", menu, NOW)).toEqual({ status: "not-found" });
  });

  it("is unavailable, not not-found, when the file is unusable", async () => {
    mkdirSync(path.join(root, "broken"));
    writeFileSync(path.join(root, "broken", "offers.json"), "{ nope");
    expect(await loadTenantOffers("broken", menu, NOW)).toEqual({ status: "unavailable" });

    writeOffers("pablo", { offers: "nope" });
    expect(await loadTenantOffers("pablo", menu, NOW)).toEqual({ status: "unavailable" });
  });
});
