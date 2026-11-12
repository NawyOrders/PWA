/**
 * Turning tenant branding into the app's theme.
 *
 * The API owns the palette, the names and the contact channels; the CSS custom
 * properties in `globals.css` own the defaults. Applying branding therefore
 * means writing inline overrides on `<html>` (which beat the `:root` theme
 * block) and being able to remove every one of them again, so a tenant with no
 * branding — or an API that is down — keeps the built-in Nawy palette.
 *
 * The palette is opt-in. The app ships its own visual identity, so a tenant
 * payload never repaints it unless the deploy sets
 * `NEXT_PUBLIC_APPLY_TENANT_COLORS=true`; branding data (names, contact
 * channels) is still fetched, cached and exposed either way.
 *
 * Colours are validated before they touch the DOM: a server string that is not
 * a `#rgb`/`#rrggbb` literal is dropped rather than injected into a style.
 */

import type {
  RestaurantBranch,
  RestaurantBranchDeliveryArea,
  RestaurantBranchWorkingHour,
  RestaurantBranding,
} from "@/lib/api";

const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const DAYS = new Set([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

/**
 * Read on every call rather than once at import so a test can flip it, and so
 * an unset variable stays falsy instead of throwing during the build.
 */
export function tenantColorsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLY_TENANT_COLORS === "true";
}

export const brandingVarNames = [
  "--color-brand",
  "--color-brand-dark",
  "--color-brand-soft",
  "--color-brand-contrast",
  "--color-gold",
  "--color-cream",
  "--color-cream-50",
] as const;

export function safeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return COLOR.test(trimmed) ? trimmed.toUpperCase() : null;
}

/** Tenant assets and contact links may only be absolute HTTPS URLs. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 1200) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeText(value: unknown, limit = 300): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, limit) : null;
}

function safeCoordinate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeTime(value: unknown): string | null {
  return typeof value === "string" && TIME.test(value.trim()) ? value.trim().slice(0, 8) : null;
}

function toRgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  const full =
    value.length === 3
      ? value
          .split("")
          .map((part) => part + part)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((part) => Math.max(0, Math.min(255, Math.round(part))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Blend towards white; used for the soft brand tint behind chips and badges. */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  return toHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
}

/** Blend towards black; used for the pressed/hover state of brand surfaces. */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  return toHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

export function brandingVars(branding: RestaurantBranding): Record<string, string> {
  const vars: Record<string, string> = {};
  const primary = safeColor(branding.primaryColor);
  if (primary) {
    vars["--color-brand"] = primary;
    vars["--color-brand-soft"] = lighten(primary, 0.84);
    vars["--color-brand-dark"] = safeColor(branding.secondaryColor) ?? darken(primary, 0.14);
  } else {
    const secondary = safeColor(branding.secondaryColor);
    if (secondary) vars["--color-brand-dark"] = secondary;
  }

  const accent = safeColor(branding.accentColor);
  if (accent) vars["--color-gold"] = accent;

  const background = safeColor(branding.backgroundColor);
  if (background) vars["--color-cream"] = background;

  const surface = safeColor(branding.surfaceColor);
  if (surface) vars["--color-cream-50"] = surface;

  const onPrimary = safeColor(branding.textOnPrimaryColor);
  if (onPrimary) vars["--color-brand-contrast"] = onPrimary;

  return vars;
}

/**
 * The App Router owns `<meta name="theme-color">` and rewrites it from the
 * layout's `viewport` whenever a route renders, which would drop the tenant
 * colour right after it was applied. Watching the head keeps the brand in the
 * browser chrome without wiring the provider to the router.
 */
const THEME_META = 'meta[name="theme-color"]';

let themeGuard: { color: string; observer: MutationObserver } | null = null;

function setThemeColor(color: string | null): void {
  const meta = document.querySelector<HTMLMetaElement>(THEME_META);
  if (meta && color) meta.setAttribute("content", color);

  if (!color) {
    themeGuard?.observer.disconnect();
    themeGuard = null;
    return;
  }
  if (themeGuard?.color === color) return;
  themeGuard?.observer.disconnect();

  const observer = new MutationObserver(() => {
    const node = document.querySelector<HTMLMetaElement>(THEME_META);
    // only ever write when it differs, so this cannot loop on its own mutation
    if (node && node.getAttribute("content") !== color) node.setAttribute("content", color);
  });
  observer.observe(document.head, { childList: true, subtree: true, attributeFilter: ["content", "name"] });
  themeGuard = { color, observer };
}

/**
 * Writes the palette onto `<html>`; passing `null` clears every branding
 * override so the theme block in `globals.css` shows through again. With the
 * opt-in off nothing is ever written, so the built-in colours simply stand.
 */
export function applyBranding(branding: RestaurantBranding | null): void {
  if (typeof document === "undefined") return;
  if (!tenantColorsEnabled()) return;
  const root = document.documentElement;
  const vars = branding ? brandingVars(branding) : {};
  for (const name of brandingVarNames) {
    const value = vars[name];
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }

  // The PWA chrome (status bar, install banner) follows the brand colour.
  setThemeColor(branding ? safeColor(branding.primaryColor) : null);
}

export function brandingName(
  branding: RestaurantBranding | null,
  lang: "ar" | "en",
  max = 80,
): string | null {
  if (!branding) return null;
  const value = lang === "ar" ? branding.nameAr : branding.nameEn;
  const fallback = lang === "ar" ? branding.nameEn : branding.nameAr;
  const name = (value ?? fallback ?? "").trim();
  return name ? name.slice(0, max) : null;
}

export type BrandingCache = { etag: string | null; branding: RestaurantBranding };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeWorkingHours(value: unknown): RestaurantBranchWorkingHour[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const dayOfWeek = safeText(entry.dayOfWeek, 20);
    if (!dayOfWeek || !DAYS.has(dayOfWeek)) return [];
    return [
      {
        dayOfWeek,
        isClosed: entry.isClosed === true,
        openTime: safeTime(entry.openTime),
        closeTime: safeTime(entry.closeTime),
        closesNextDay: entry.closesNextDay === true,
      },
    ];
  });
}

function sanitizeDeliveryAreas(value: unknown): RestaurantBranchDeliveryArea[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const deliveryAreaId = safeText(entry.deliveryAreaId, 80);
    if (!deliveryAreaId) return [];
    return [
      {
        deliveryAreaId,
        nameAr: safeText(entry.nameAr),
        nameEn: safeText(entry.nameEn),
        deliveryFee:
          typeof entry.deliveryFee === "number" && Number.isFinite(entry.deliveryFee) && entry.deliveryFee >= 0
            ? entry.deliveryFee
            : null,
      },
    ];
  });
}

function sanitizeBranch(value: unknown): RestaurantBranch | null {
  if (!isRecord(value)) return null;
  const branchId = safeText(value.branchId, 80);
  if (!branchId) return null;
  return {
    branchId,
    nameAr: safeText(value.nameAr),
    nameEn: safeText(value.nameEn),
    address: safeText(value.address, 500),
    latitude: safeCoordinate(value.latitude),
    longitude: safeCoordinate(value.longitude),
    phone: safeText(value.phone, 40),
    status: safeText(value.status, 40),
    isPrimary: value.isPrimary === true,
    sortOrder:
      typeof value.sortOrder === "number" && Number.isFinite(value.sortOrder)
        ? Math.trunc(value.sortOrder)
        : null,
    workingHours: sanitizeWorkingHours(value.workingHours),
    deliveryAreas: sanitizeDeliveryAreas(value.deliveryAreas),
  };
}

/**
 * Rebuilds a branding payload from untrusted input (an API response or cached
 * storage). Colours are validated, asset and social URLs must be HTTPS, and
 * every branch keeps only the fields the storefront renders.
 */
export function sanitizeBranding(value: unknown): RestaurantBranding | null {
  if (!isRecord(value)) return null;
  const clean: RestaurantBranding = {};
  for (const key of ["tenantId", "nameAr", "nameEn"] as const) {
    const text = safeText(value[key]);
    if (text) clean[key] = text;
  }
  for (const key of ["logoUrl", "faviconUrl", "whatsAppUrl", "messengerUrl"] as const) {
    const url = safeUrl(value[key]);
    if (url) clean[key] = url;
  }
  for (const key of ["contactPhone", "contactEmail"] as const) {
    const text = safeText(value[key], 200);
    if (text) clean[key] = text;
  }
  for (const key of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "backgroundColor",
    "surfaceColor",
    "textOnPrimaryColor",
  ] as const) {
    const color = safeColor(value[key]);
    if (color) clean[key] = color;
  }
  const eTag = safeText(value.eTag, 120);
  if (eTag) clean.eTag = eTag;

  if (isRecord(value.socialLinks)) {
    const links: Record<string, string> = {};
    for (const [network, url] of Object.entries(value.socialLinks)) {
      const cleanUrl = safeUrl(url);
      if (cleanUrl) links[network.slice(0, 40)] = cleanUrl.slice(0, 300);
    }
    clean.socialLinks = links;
  }

  if (Array.isArray(value.branches)) {
    clean.branches = value.branches
      .map(sanitizeBranch)
      .filter((branch): branch is RestaurantBranch => branch !== null)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  return clean;
}

/** Cached branding is untrusted storage, so it is re-validated on read. */
export function decodeBrandingCache(value: unknown): BrandingCache | null {
  if (!isRecord(value) || !isRecord(value.branding)) return null;
  return {
    etag: typeof value.etag === "string" ? value.etag.slice(0, 120) : null,
    branding: sanitizeBranding(value.branding) ?? {},
  };
}

/** A branch rendered by the storefront, in the language the app is showing. */
export type StoreBranch = {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  address: string;
  open: boolean;
  phone: string | null;
  isPrimary: boolean;
  /** Demo-only straight-line distance; tenant branches do not send one. */
  distance?: number;
  latitude: number | null;
  longitude: number | null;
  workingHours: Required<RestaurantBranchWorkingHour>[];
  deliveryAreas: { id: string; name: string; fee: number }[];
};

function localizedName(
  value: { nameAr?: string | null; nameEn?: string | null },
  lang: "ar" | "en",
): string {
  const preferred = lang === "ar" ? value.nameAr : value.nameEn;
  const fallback = lang === "ar" ? value.nameEn : value.nameAr;
  return (preferred ?? fallback ?? "").trim();
}

/**
 * The tenant's branches ready for the pickup screen. Empty when the branding
 * payload has none, which is the caller's signal to keep the demo branches.
 */
export function brandingBranches(branding: RestaurantBranding | null, lang: "ar" | "en"): StoreBranch[] {
  const list = branding?.branches ?? [];
  return list.flatMap((branch) => {
    const id = branch.branchId?.trim();
    if (!id) return [];
    const nameAr = (branch.nameAr ?? "").trim();
    const nameEn = (branch.nameEn ?? "").trim();
    return [
      {
        id,
        name: localizedName(branch, lang) || nameAr || nameEn || id,
        nameAr,
        nameEn,
        address: (branch.address ?? "").trim(),
        open: (branch.status ?? "Open").toLowerCase() !== "temporarilyclosed",
        phone: branch.phone ?? null,
        isPrimary: branch.isPrimary === true,
        latitude: branch.latitude ?? null,
        longitude: branch.longitude ?? null,
        workingHours: (branch.workingHours ?? []).map((hours) => ({
          dayOfWeek: hours.dayOfWeek ?? "",
          isClosed: hours.isClosed === true,
          openTime: hours.openTime ?? null,
          closeTime: hours.closeTime ?? null,
          closesNextDay: hours.closesNextDay === true,
        })),
        deliveryAreas: (branch.deliveryAreas ?? []).map((area) => ({
          id: area.deliveryAreaId ?? "",
          name: localizedName(area, lang),
          fee: area.deliveryFee ?? 0,
        })),
      },
    ];
  });
}

/** The first open range, used for a compact “10:00 – 23:00” line. */
export function branchHoursLabel(branch: StoreBranch): string | null {
  const range = branch.workingHours.find(
    (hours) => !hours.isClosed && hours.openTime && hours.closeTime,
  );
  if (!range?.openTime || !range.closeTime) return null;
  const open = range.openTime.slice(0, 5);
  const close = range.closeTime.slice(0, 5);
  return `${open} – ${close}${range.closesNextDay ? " (+1)" : ""}`;
}

export function brandingLogoUrl(branding: RestaurantBranding | null): string | null {
  return branding ? safeUrl(branding.logoUrl) : null;
}

export function brandingFaviconUrl(branding: RestaurantBranding | null): string | null {
  return branding ? safeUrl(branding.faviconUrl) ?? safeUrl(branding.logoUrl) : null;
}

/**
 * Points the document's icon links at the tenant's uploaded icons. The default
 * icons stay in the document; this only overrides their `href` while a tenant
 * asset is present, and restores the originals when branding is cleared.
 */
const ICON_SELECTOR = 'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';

export function applyBrandingAssets(branding: RestaurantBranding | null): void {
  if (typeof document === "undefined") return;
  const icon = brandingFaviconUrl(branding);
  for (const link of document.querySelectorAll<HTMLLinkElement>(ICON_SELECTOR)) {
    if (icon) {
      if (!link.dataset.defaultHref) link.dataset.defaultHref = link.getAttribute("href") ?? "";
      link.setAttribute("href", icon);
    } else if (link.dataset.defaultHref) {
      link.setAttribute("href", link.dataset.defaultHref);
      delete link.dataset.defaultHref;
    }
  }
}
