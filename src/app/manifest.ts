import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { brandingFaviconUrl, brandingName, safeColor } from "@/lib/branding";
import { fetchTenantBranding } from "@/lib/tenant-branding";
import { tenantApiBaseUrl, tenantSlugFromHost } from "@/lib/tenant";

const DEFAULT_ICON = {
  src: "/icons/logo.svg",
  sizes: "any",
  type: "image/svg+xml",
} as const;

/** Best-effort MIME type for a tenant-uploaded icon URL. */
function iconType(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".ico")) return "image/x-icon";
  return "image/jpeg";
}

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
  // file on localhost, and that request should never depend on the tenant API.
  const apiBaseUrl = slug ? tenantApiBaseUrl(slug) : "";
  const result = apiBaseUrl ? await fetchTenantBranding(apiBaseUrl) : null;
  const branding = result?.status === "ok" ? result.branding : null;

  const name = brandingName(branding, "ar") ?? "ناوي أوردرز";
  const shortName = brandingName(branding, "ar", 12) ?? "ناوي أوردرز";
  const icon = brandingFaviconUrl(branding);
  const icons: MetadataRoute.Manifest["icons"] = icon
    ? [{ src: icon, sizes: "any", type: iconType(icon), purpose: "any" }]
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
    background_color: safeColor(branding?.backgroundColor) ?? "#FBF3EA",
    theme_color: safeColor(branding?.primaryColor) ?? "#E8452C",
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
