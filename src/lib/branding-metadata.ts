/**
 * Branding values that belong in document metadata rather than the CSS theme:
 * the favicon and the two colours the manifest and browser chrome read.
 *
 * Kept free of `next/*` imports so the mapping can be tested directly and so
 * the layout, the manifest and the client all resolve the same defaults.
 */

import type { RestaurantBranding } from "@/lib/api";
import { brandingFaviconUrl, iconMimeType, safeColor } from "@/lib/branding";

/** Matches `--color-brand` in `globals.css`. */
export const DEFAULT_THEME_COLOR = "#E8452C";

/** Matches `--color-cream` in `globals.css`. */
export const DEFAULT_BACKGROUND_COLOR = "#FBF3EA";

/** The icon the app ships when a tenant has not uploaded a favicon. */
export const DEFAULT_FAVICON = {
  url: "/icons/logo.svg",
  type: "image/svg+xml",
} as const;

export type BrandingIcon = { url: string; type: string };

/** The tenant's favicon, or the shipped default when it is absent or unsafe. */
export function brandingIcon(branding: RestaurantBranding | null): BrandingIcon {
  const url = brandingFaviconUrl(branding);
  return url ? { url, type: iconMimeType(url) } : { ...DEFAULT_FAVICON };
}

/** `icons` for the Next.js metadata API: the tab icon and the touch icon. */
export function brandingMetadataIcons(branding: RestaurantBranding | null): {
  icon: BrandingIcon[];
  apple: BrandingIcon[];
} {
  const icon = brandingIcon(branding);
  return { icon: [icon], apple: [icon] };
}

export function brandingThemeColor(branding: RestaurantBranding | null): string {
  return safeColor(branding?.primaryColor) ?? DEFAULT_THEME_COLOR;
}

export function brandingBackgroundColor(branding: RestaurantBranding | null): string {
  return safeColor(branding?.backgroundColor) ?? DEFAULT_BACKGROUND_COLOR;
}
