import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { brandingFaviconUrl, brandingName, iconMimeType } from "@/lib/branding";
import {
  brandingBackgroundColor,
  brandingThemeColor,
  DEFAULT_FAVICON,
} from "@/lib/branding-metadata";
import { loadTenantBranding } from "@/lib/static-tenant-data";
import { tenantSlugFromHost } from "@/lib/tenant";

const DEFAULT_ICON = {
  src: DEFAULT_FAVICON.url,
  sizes: "any",
  type: DEFAULT_FAVICON.type,
} as const;

/**
 * The manifest is per tenant: the browser resolves this URL on the storefront
 * host, so the same route answers with that restaurant's name, colours and
 * icon. Without a tenant (or when branding is unavailable) the Nawy Orders
 * defaults stand.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const slug = requestHeaders.get("x-tenant-slug") ?? tenantSlugFromHost(host);
  // Only a tenant host is branded. The container health check asks for this
  // file on localhost, which has no tenant folder and no file read.
  const result = slug ? await loadTenantBranding(slug) : null;
  const branding = result?.status === "ok" ? result.branding : null;

  const name = brandingName(branding, "ar") ?? "ناوي أوردرز";
  const shortName = brandingName(branding, "ar", 12) ?? "ناوي أوردرز";
  const icon = brandingFaviconUrl(branding);
  const icons: MetadataRoute.Manifest["icons"] = icon
    ? [{ src: icon, sizes: "any", type: iconMimeType(icon), purpose: "any" }]
    : [
        { ...DEFAULT_ICON, purpose: "any" },
        { ...DEFAULT_ICON, purpose: "maskable" },
      ];

  return {
    name,
    short_name: shortName,
    description: `اطلب من ${name} — توصيل سريع وعروض حصرية.`,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: brandingBackgroundColor(branding),
    theme_color: brandingThemeColor(branding),
    lang: "ar",
    dir: "rtl",
    categories: ["food", "shopping", "lifestyle"],
    icons,
    shortcuts: [
      {
        name: "سلتي",
        short_name: "السلة",
        url: "/cart",
        icons: [icons?.[0] ?? DEFAULT_ICON],
      },
      {
        name: "الأقسام",
        short_name: "الأقسام",
        url: "/categories",
        icons: [icons?.[0] ?? DEFAULT_ICON],
      },
      {
        name: "طلباتي",
        short_name: "طلباتي",
        url: "/orders",
        icons: [icons?.[0] ?? DEFAULT_ICON],
      },
    ],
  };
}
