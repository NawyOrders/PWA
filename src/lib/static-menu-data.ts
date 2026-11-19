/**
 * Static tenant menu, read from disk on the server.
 *
 *   tenants/<slug>/menu.json
 *
 * Mirrors `static-tenant-data.ts`: validate the slug before building a path,
 * read the file, validate its shape, and answer `ok | not-found | unavailable`.
 * Unlike branding, a missing or broken menu does not 404 the storefront — the
 * tenant still has a storefront with an empty menu — so callers decide what to
 * do with `not-found` / `unavailable`.
 *
 * Node only: this uses `fs`. Do not import it from a client component; import
 * `@/lib/menu` for the types and helpers instead.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isValidTenantSlug } from "@/lib/tenant";
import { normalizeMenuImage } from "@/lib/menu";
import type { Category, Item, Menu, Variant } from "@/lib/menu";
import { tenantDataDir } from "@/lib/static-tenant-data";

export type { Category, Item, Menu, Variant } from "@/lib/menu";

export const TENANT_MENU_FILE = "menu.json";

export type TenantMenuResult =
  | { status: "ok"; menu: Menu }
  | { status: "not-found" }
  | { status: "unavailable" };

/** The menu file for a slug, or `null` when the slug cannot be a folder name. */
export function tenantMenuPath(slug: string): string | null {
  if (!isValidTenantSlug(slug)) return null;
  return path.join(tenantDataDir(), slug, TENANT_MENU_FILE);
}

function isMissingFile(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return error.code === "ENOENT" || error.code === "ENOTDIR";
}

/** Tenants author these ids, so they are kept printable and path-free. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function readName(record: Record<string, unknown>, key: "nameAr" | "nameEn"): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseVariants(value: unknown): Variant[] | null {
  if (value === undefined) return [];
  if (!isRecord(value)) return null;
  const variants: Variant[] = [];
  for (const [key, price] of Object.entries(value)) {
    if (!key.trim() || !isPrice(price)) return null;
    variants.push({ key, price });
  }
  return variants;
}

/**
 * A bad image is a presentation problem, not a menu problem: it becomes `null`
 * (the UI's placeholder) and is logged, but the item keeps its price and stays
 * on the menu. Only a present-but-rejected value is logged; an absent or empty
 * image is simply "no artwork".
 */
function readImage(raw: unknown, slug: string, where: string): string | null {
  const image = normalizeMenuImage(raw, slug);
  if (image) return image;

  const present = typeof raw === "string" ? raw.trim().length > 0 : raw !== undefined && raw !== null;
  if (present) console.warn(`[tenant-menu] ${slug}: ignoring invalid image on ${where}`);
  return null;
}

function parseItem(
  raw: unknown,
  categoryId: string,
  slug: string,
): { item: Item } | { error: string } {
  if (!isRecord(raw)) return { error: "item is not an object" };
  const id = raw.id;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return { error: `invalid item id: ${String(id)}` };

  const nameAr = readName(raw, "nameAr");
  const nameEn = readName(raw, "nameEn");
  if (!nameAr && !nameEn) return { error: `item ${id} has no name` };

  const price = raw.price ?? null;
  if (price !== null && !isPrice(price)) return { error: `item ${id} has an invalid price` };

  const variants = parseVariants(raw.variants);
  if (!variants) return { error: `item ${id} has invalid variants` };
  if (price === null && variants.length === 0) {
    return { error: `item ${id} has neither a price nor variants` };
  }

  return {
    item: {
      id,
      nameAr: nameAr ?? nameEn!,
      nameEn: nameEn ?? nameAr!,
      price,
      variants,
      image: readImage(raw.image, slug, `item ${id}`),
      categoryId,
    },
  };
}

function parseCategory(raw: unknown, slug: string): { category: Category } | { error: string } {
  if (!isRecord(raw)) return { error: "category is not an object" };
  const id = raw.id;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return { error: `invalid category id: ${String(id)}` };
  }

  const nameAr = readName(raw, "nameAr");
  const nameEn = readName(raw, "nameEn");
  if (!nameAr && !nameEn) return { error: `category ${id} has no name` };
  if (!Array.isArray(raw.items)) return { error: `category ${id} has no items array` };

  const items: Item[] = [];
  for (const rawItem of raw.items) {
    const parsed = parseItem(rawItem, id, slug);
    if ("error" in parsed) return parsed;
    items.push(parsed.item);
  }

  return {
    category: {
      id,
      nameAr: nameAr ?? nameEn!,
      nameEn: nameEn ?? nameAr!,
      image: readImage(raw.image, slug, `category ${id}`),
      items,
    },
  };
}

/**
 * Validates an already-parsed JSON body. Exported so tests (and future callers
 * reading the file some other way) can reuse the shape checks. The slug is
 * needed because a relative image path becomes a URL into that tenant's folder.
 *
 * Ids must be unique across the whole menu: cart lines and deep links address an
 * item by id alone, so a duplicate would silently resolve to the wrong price.
 */
export function parseMenu(body: unknown, slug: string): { menu: Menu } | { error: string } {
  if (!isRecord(body)) return { error: "menu is not an object" };

  const currency = body.currency ?? "EGP";
  if (typeof currency !== "string" || !currency.trim()) return { error: "invalid currency" };

  if (!Array.isArray(body.categories)) return { error: "categories is not an array" };

  const categories: Category[] = [];
  const categoryIds = new Set<string>();
  const itemIds = new Set<string>();

  for (const rawCategory of body.categories) {
    const parsed = parseCategory(rawCategory, slug);
    if ("error" in parsed) return parsed;
    const { category } = parsed;

    if (categoryIds.has(category.id)) {
      return { error: `duplicate category id: ${category.id}` };
    }
    categoryIds.add(category.id);

    for (const item of category.items) {
      if (itemIds.has(item.id)) {
        return { error: `duplicate item id: ${item.id}` };
      }
      itemIds.add(item.id);
    }
    categories.push(category);
  }

  return { menu: { currency: currency.trim(), categories } };
}

/** Reads and validates `tenants/<slug>/menu.json`. */
export async function loadTenantMenu(slug: string): Promise<TenantMenuResult> {
  const file = tenantMenuPath(slug);
  if (!file) return { status: "not-found" };

  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    return isMissingFile(error) ? { status: "not-found" } : { status: "unavailable" };
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { status: "unavailable" };
  }

  const parsed = parseMenu(body, slug);
  if ("error" in parsed) {
    console.error(`[tenant-menu] ${slug}: ${parsed.error}`);
    return { status: "unavailable" };
  }
  return { status: "ok", menu: parsed.menu };
}
