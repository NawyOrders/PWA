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
  /** Filled by the loader so a component holding an item knows its section. */
  categoryId: string;
};

export type Category = {
  id: string;
  nameAr: string;
  nameEn: string;
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
