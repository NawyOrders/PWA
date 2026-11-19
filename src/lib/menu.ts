import type { Lang } from "@/lib/i18n";

/**
 * The tenant menu, shaped exactly like `tenants/<slug>/menu.json`.
 *
 * This module stays browser-safe (no `fs`): the server loader in
 * `static-menu-data.ts` reads and validates the file, then hands the result to
 * the provider, where components resolve ids and prices against it.
 */
export type Variant = {
  /** The label as written in `menu.json`, e.g. "3 قطع". Also the cart key. */
  key: string;
  price: number;
};

export type Item = {
  id: string;
  nameAr: string;
  nameEn: string;
  /** `null` when the item is sold by variant only. */
  price: number | null;
  variants: Variant[];
  /** Absolute https URL or same-origin tenant asset URL; `null` means no artwork. */
  image: string | null;
  /** Filled by the loader so a component holding an item knows its section. */
  categoryId: string;
};

export type Category = {
  id: string;
  nameAr: string;
  nameEn: string;
  /** Normalised the same way as an item image. */
  image: string | null;
  items: Item[];
};

export type Menu = {
  currency: string;
  categories: Category[];
};

export const EMPTY_MENU: Menu = { currency: "EGP", categories: [] };

export type MenuIndex = {
  categories: Category[];
  items: Item[];
  categoriesById: Map<string, Category>;
  itemsById: Map<string, Item>;
};

/** Indexes a menu once so components do not rebuild maps on every render. */
export function indexMenu(menu: Menu): MenuIndex {
  const categoriesById = new Map<string, Category>();
  const itemsById = new Map<string, Item>();
  const items: Item[] = [];
  for (const category of menu.categories) {
    categoriesById.set(category.id, category);
    for (const item of category.items) {
      itemsById.set(item.id, item);
      items.push(item);
    }
  }
  return { categories: menu.categories, items, categoriesById, itemsById };
}

/**
 * The name to render for the current language. A tenant may translate only one
 * side, so the other side is the fallback rather than an empty card.
 */
export function localizedName(entry: Pick<Item | Category, "nameAr" | "nameEn">, lang: Lang): string {
  return lang === "en" ? entry.nameEn || entry.nameAr : entry.nameAr || entry.nameEn;
}

export function hasVariants(item: Pick<Item, "variants">): boolean {
  return item.variants.length > 0;
}

/** Lowest purchasable price, used for "من" labels before a variant is chosen. */
export function startingPrice(item: Pick<Item, "price" | "variants">): number {
  if (item.price !== null) return item.price;
  return item.variants.reduce((lowest, variant) => Math.min(lowest, variant.price), Infinity);
}

export function resolveVariantPrice(
  item: Pick<Item, "price" | "variants">,
  variantKey: string | null | undefined,
): number | null {
  if (variantKey) {
    const variant = item.variants.find((candidate) => candidate.key === variantKey);
    if (variant) return variant.price;
  }
  return item.price;
}

/**
 * A line can only be added or priced when the item is sold either at a fixed
 * price or at one of the variant labels it actually offers.
 */
export function isValidSelection(
  item: Pick<Item, "price" | "variants">,
  variantKey: string | null | undefined,
): boolean {
  return resolveVariantPrice(item, variantKey) !== null;
}

/** Same-origin route that serves files from a tenant folder. */
export const TENANT_ASSET_ROUTE_PREFIX = "/api/tenant-assets";

/** `/api/tenant-assets/<slug>/images/antara.jpg` for a file in the tenant folder. */
export function tenantAssetUrl(slug: string, segments: string[]): string {
  return `${TENANT_ASSET_ROUTE_PREFIX}/${encodeURIComponent(slug)}/${segments
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

const HTTP_URL = /^https?:\/\//i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Normalises a `menu.json` image value.
 *
 * Only two shapes are usable: an absolute http(s) URL (hosted elsewhere), or a
 * relative path to a file inside the tenant folder. Everything else — an empty
 * value, a non-string, `javascript:`, `data:`, `file:`, a protocol-relative URL
 * or a path that could escape the tenant folder — becomes `null` so the UI
 * shows its placeholder instead of a broken image.
 */
export function normalizeMenuImage(value: unknown, slug: string): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (HTTP_URL.test(trimmed)) {
    try {
      const { protocol } = new URL(trimmed);
      return protocol === "http:" || protocol === "https:" ? trimmed : null;
    } catch {
      return null;
    }
  }

  // Any other scheme, plus protocol-relative and rooted paths, does not name a
  // file inside this tenant's folder.
  if (ANY_SCHEME.test(trimmed) || trimmed.startsWith("/") || trimmed.includes("\\")) return null;
  if (trimmed.includes("\0") || trimmed.includes("?") || trimmed.includes("#")) return null;

  const segments = trimmed.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;

  return tenantAssetUrl(slug, segments);
}
