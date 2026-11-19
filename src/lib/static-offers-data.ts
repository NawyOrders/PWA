/**
 * Static tenant offers, read from disk on the server.
 *
 *   tenants/<slug>/offers.json
 *
 * Mirrors `static-menu-data.ts`: validate the slug before building a path, read
 * the file, validate its shape, and answer `ok | not-found | unavailable`. A
 * missing or unusable file is not a storefront error — the home page falls back
 * to its built-in promotional slides — so callers decide what to do with
 * `not-found` / `unavailable`.
 *
 * An offer is dropped, not fatal, when it is disabled, untitled, outside its
 * schedule, malformed, points at something the menu does not sell, or repeats
 * an id. Every drop is logged so the tenant can fix the file.
 *
 * Node only: this uses `fs`. Do not import it from a client component; import
 * `@/lib/offers` for the types and helpers instead.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isValidTenantSlug } from "@/lib/tenant";
import { normalizeMenuImage, type Menu } from "@/lib/menu";
import type { Offer, OfferAction, OfferTheme } from "@/lib/offers";
import { tenantDataDir } from "@/lib/static-tenant-data";

export const TENANT_OFFERS_FILE = "offers.json";

export type TenantOffersResult =
  | { status: "ok"; offers: Offer[] }
  | { status: "not-found" }
  | { status: "unavailable" };

/** The offers file for a slug, or `null` when the slug cannot be a folder name. */
export function tenantOffersPath(slug: string): string | null {
  if (!isValidTenantSlug(slug)) return null;
  return path.join(tenantDataDir(), slug, TENANT_OFFERS_FILE);
}

function isMissingFile(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return error.code === "ENOENT" || error.code === "ENOTDIR";
}

/** Ids are author-written and become URL segments, so keep them printable. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(record: Record<string, unknown>, key: string): string | null {
  const value = readText(record, key);
  return value || null;
}

/**
 * A bad image is a presentation problem, not an offer problem: it becomes the
 * gradient background and is logged, but the offer keeps its copy and link.
 */
function readImage(raw: unknown, slug: string, id: string, field: string): string | null {
  const image = normalizeMenuImage(raw, slug);
  if (image) return image;

  const present = typeof raw === "string" ? raw.trim().length > 0 : raw !== undefined && raw !== null;
  if (present) console.warn(`[tenant-offers] ${slug}: ignoring invalid ${field} on offer ${id}`);
  return null;
}

/**
 * A malformed timestamp is treated as "no schedule boundary" rather than
 * dropping the offer; the tenant gets a log line instead of a vanished slide.
 */
function readDate(raw: unknown, slug: string, id: string, field: string): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const epoch = Date.parse(raw.trim());
  if (Number.isNaN(epoch)) {
    console.warn(`[tenant-offers] ${slug}: ignoring invalid ${field} on offer ${id}`);
    return null;
  }
  return epoch;
}

function menuIds(menu: Menu | null) {
  const categories = new Set<string>();
  const items = new Set<string>();
  for (const category of menu?.categories ?? []) {
    categories.add(category.id);
    for (const item of category.items) items.add(item.id);
  }
  return { categories, items };
}

function parseAction(
  raw: unknown,
  id: string,
  menu: { categories: Set<string>; items: Set<string> },
): OfferAction | { error: string } {
  if (!isRecord(raw)) return { error: `offer ${id} has no action` };

  const type = raw.type;
  const value = typeof raw.value === "string" ? raw.value.trim() : "";
  if (type !== "product" && type !== "category" && type !== "search" && type !== "path") {
    return { error: `offer ${id} has an unsupported action type: ${String(type)}` };
  }
  if (!value) return { error: `offer ${id} has an empty action value` };

  if (type === "product" && !menu.items.has(value)) {
    return { error: `offer ${id} points at unknown product: ${value}` };
  }
  if (type === "category" && !menu.categories.has(value)) {
    return { error: `offer ${id} points at unknown category: ${value}` };
  }
  if (type === "path" && (!value.startsWith("/") || value.startsWith("//"))) {
    return { error: `offer ${id} has an invalid path: ${value}` };
  }

  return { type, value };
}

/**
 * Validates an already-parsed JSON body. Exported so tests can reuse the shape
 * checks. `now` is injectable so scheduling is deterministic in tests.
 *
 * The first occurrence of an id wins: cart-style deep links identify an offer
 * by id, so a duplicate would make the later slide unreachable.
 */
export function parseOffers(
  body: unknown,
  slug: string,
  menu: Menu | null,
  now: Date = new Date(),
): { offers: Offer[] } | { error: string } {
  if (!isRecord(body)) return { error: "offers file is not an object" };
  if (!Array.isArray(body.offers)) return { error: "offers is not an array" };

  const ids = menuIds(menu);
  const seen = new Set<string>();
  const offers: Offer[] = [];
  const nowMs = now.getTime();

  for (const raw of body.offers) {
    if (!isRecord(raw)) {
      console.warn(`[tenant-offers] ${slug}: ignoring offer that is not an object`);
      continue;
    }

    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!ID_PATTERN.test(id)) {
      console.warn(`[tenant-offers] ${slug}: ignoring offer with an invalid id: ${String(raw.id)}`);
      continue;
    }
    if (seen.has(id)) {
      console.warn(`[tenant-offers] ${slug}: ignoring duplicate offer id: ${id}`);
      continue;
    }
    seen.add(id);

    if (raw.enabled === false) {
      console.warn(`[tenant-offers] ${slug}: ignoring disabled offer: ${id}`);
      continue;
    }

    const titleAr = readText(raw, "titleAr");
    const titleEn = readText(raw, "titleEn");
    if (!titleAr && !titleEn) {
      console.warn(`[tenant-offers] ${slug}: ignoring offer with no title: ${id}`);
      continue;
    }

    const startsAt = readDate(raw.startsAt, slug, id, "startsAt");
    if (startsAt !== null && startsAt > nowMs) {
      console.warn(`[tenant-offers] ${slug}: ignoring offer that has not started: ${id}`);
      continue;
    }

    const endsAt = readDate(raw.endsAt, slug, id, "endsAt");
    if (endsAt !== null && endsAt < nowMs) {
      console.warn(`[tenant-offers] ${slug}: ignoring offer that has ended: ${id}`);
      continue;
    }

    const action = parseAction(raw.action, id, ids);
    if ("error" in action) {
      console.warn(`[tenant-offers] ${slug}: ${action.error}`);
      continue;
    }

    const theme: OfferTheme = raw.theme === "dark" ? "dark" : "light";
    offers.push({
      id,
      order: typeof raw.order === "number" && Number.isFinite(raw.order) ? raw.order : 0,
      theme,
      image: readImage(raw.image, slug, id, "image"),
      imageEn: readImage(raw.imageEn, slug, id, "imageEn"),
      badgeAr: readOptionalText(raw, "badgeAr"),
      badgeEn: readOptionalText(raw, "badgeEn"),
      titleAr: titleAr || titleEn,
      titleEn: titleEn || titleAr,
      textAr: readText(raw, "textAr") || readText(raw, "textEn"),
      textEn: readText(raw, "textEn") || readText(raw, "textAr"),
      ctaAr: readText(raw, "ctaAr") || readText(raw, "ctaEn"),
      ctaEn: readText(raw, "ctaEn") || readText(raw, "ctaAr"),
      action,
    });
  }

  offers.sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id, "en"));
  return { offers };
}

/** Reads and validates `tenants/<slug>/offers.json`. */
export async function loadTenantOffers(
  slug: string,
  menu: Menu | null,
  now: Date = new Date(),
): Promise<TenantOffersResult> {
  const file = tenantOffersPath(slug);
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

  const parsed = parseOffers(body, slug, menu, now);
  if ("error" in parsed) {
    console.error(`[tenant-offers] ${slug}: ${parsed.error}`);
    return { status: "unavailable" };
  }
  return { status: "ok", offers: parsed.offers };
}
