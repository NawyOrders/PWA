/**
 * Turning tenant branding into the app's theme.
 *
 * The API owns the palette, the names and the contact channels; the CSS custom
 * properties in `globals.css` own the defaults. Applying branding therefore
 * means writing inline overrides on `<html>` (which beat the `:root` theme
 * block) and being able to remove every one of them again, so a tenant with no
 * branding — or an API that is down — keeps the built-in Nawy palette.
 *
 * Colours are validated before they touch the DOM: a server string that is not
 * a `#rgb`/`#rrggbb` literal is dropped rather than injected into a style.
 */

import type { RestaurantBranding } from "@/lib/api";

const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

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
 * override so the theme block in `globals.css` shows through again.
 */
export function applyBranding(branding: RestaurantBranding | null): void {
  if (typeof document === "undefined") return;
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

export function brandingName(branding: RestaurantBranding | null, lang: "ar" | "en"): string | null {
  if (!branding) return null;
  const value = lang === "ar" ? branding.nameAr : branding.nameEn;
  const fallback = lang === "ar" ? branding.nameEn : branding.nameAr;
  const name = (value ?? fallback ?? "").trim();
  return name ? name.slice(0, 80) : null;
}

export type BrandingCache = { etag: string | null; branding: RestaurantBranding };

/** Cached branding is untrusted storage, so it is re-validated on read. */
export function decodeBrandingCache(value: unknown): BrandingCache | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  if (!stored.branding || typeof stored.branding !== "object") return null;
  const branding = stored.branding as Record<string, unknown>;
  const clean: RestaurantBranding = {};
  for (const key of [
    "tenantId",
    "nameAr",
    "nameEn",
    "logoUrl",
    "faviconUrl",
    "contactPhone",
    "contactEmail",
    "whatsAppUrl",
    "messengerUrl",
  ] as const) {
    if (typeof branding[key] === "string") clean[key] = (branding[key] as string).slice(0, 300);
  }
  for (const key of [
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "backgroundColor",
    "surfaceColor",
    "textOnPrimaryColor",
  ] as const) {
    const color = safeColor(branding[key]);
    if (color) clean[key] = color;
  }
  if (branding.socialLinks && typeof branding.socialLinks === "object") {
    const links: Record<string, string> = {};
    for (const [network, url] of Object.entries(branding.socialLinks as Record<string, unknown>)) {
      if (typeof url === "string" && /^https:\/\//.test(url)) links[network.slice(0, 40)] = url.slice(0, 300);
    }
    clean.socialLinks = links;
  }
  return {
    etag: typeof stored.etag === "string" ? stored.etag.slice(0, 120) : null,
    branding: clean,
  };
}
