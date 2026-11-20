import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppProvider } from "@/components/providers";
import type { TenantBrandingResult } from "@/lib/tenant-branding";
import { isTenantRootHost, tenantApiBaseUrl, tenantSlugFromHost } from "@/lib/tenant";
import { loadTenantBranding } from "@/lib/static-tenant-data";
import { loadTenantMenu } from "@/lib/static-menu-data";
import { loadTenantOffers } from "@/lib/static-offers-data";

/**
 * Server half of the storefront's tenant bootstrap.
 *
 * It reads the slug the middleware resolved, fetches that tenant's branding
 * before the page renders, and hands the result to the client provider. A
 * `404 Tenant Not Found` from the tenant API becomes the app's 404 page; a
 * backend that is merely down keeps the built-in palette instead of taking the
 * storefront offline.
 */
export async function TenantProvider({ children }: { children: React.ReactNode }) {
  // Opt into a per-request render before the branding fetch. Without this the
  // build can start the fetch during prerender and Next rejects the fetch
  // promise when that prerender finishes, which would make every unknown slug
  // look like a backend outage instead of a 404.
  await connection();
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const slug = requestHeaders.get("x-tenant-slug") ?? tenantSlugFromHost(host);

  // A host under the storefront domain must resolve to a tenant. Middleware
  // already answers 404 for this case; this is the belt-and-braces path for a
  // request that reached the render without passing through it.
  if (!slug && isTenantRootHost(host)) notFound();

  // The tenant API still owns auth and OTP, so the app keeps its base URL. Branding
  // and the menu data come from the tenant's folder on disk instead.
  const fallbackApiBaseUrl = (process.env.TENANT_API_BASE_URL ?? "").trim();
  const apiBaseUrl = slug ? tenantApiBaseUrl(slug) : fallbackApiBaseUrl || null;

  // Middleware already fetched branding for a document request so it could
  // answer 404 before the stream starts. Reuse that payload instead of paying
  // for a second GET. RSC navigations have no header and fetch here.
  const encodedBranding = requestHeaders.get("x-tenant-branding");
  let branding: TenantBrandingResult | null = null;
  if (encodedBranding) {
    try {
      branding = {
        status: "ok" as const,
        branding: JSON.parse(decodeURIComponent(encodedBranding)),
        etag: requestHeaders.get("x-tenant-branding-etag"),
      };
    } catch {
      branding = null;
    }
  }
  if (!branding && slug) branding = await loadTenantBranding(slug);

  if (branding?.status === "not-found") notFound();

  // Branding decides whether the storefront exists; the menu only decides what
  // it sells. A missing or broken menu therefore renders an empty storefront
  // instead of a 404, and its loader logs the reason it was rejected.
  const menu = slug ? await loadTenantMenu(slug) : null;
  const menuData = menu?.status === "ok" ? menu.menu : null;

  // Offers are checked against the menu, so they load after it. `null` means
  // "no offers file", which keeps the built-in slides; an empty array means the
  // tenant has offers but none are live, which hides the carousel.
  const offers = slug ? await loadTenantOffers(slug, menuData) : null;

  return (
    <AppProvider
      initialBranding={branding?.status === "ok" ? branding.branding : null}
      initialBrandingEtag={branding?.status === "ok" ? branding.etag : null}
      initialTenantSlug={slug}
      initialMenu={menuData}
      initialOffers={offers?.status === "ok" ? offers.offers : null}
      tenantApiBaseUrl={apiBaseUrl ?? ""}
    >
      {children}
    </AppProvider>
  );
}
