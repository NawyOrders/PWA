/**
 * The current request's tenant branding, for server components and metadata.
 *
 * Middleware already reads the tenant's file for a document request and
 * forwards the payload on `x-tenant-branding`, so the common path is a header
 * read. A request that reached the render without that header (an RSC
 * navigation, or a local host with a tenant header) falls back to the same
 * folder lookup the storefront uses everywhere else.
 *
 * Memoised per request so the layout and its metadata share one read.
 */

import { headers } from "next/headers";
import { cache } from "react";
import type { RestaurantBranding } from "@/lib/api";
import { sanitizeBranding } from "@/lib/branding";
import { loadTenantBranding } from "@/lib/static-tenant-data";
import { tenantSlugFromHost } from "@/lib/tenant";

export const requestTenantBranding = cache(async (): Promise<RestaurantBranding | null> => {
  const requestHeaders = await headers();

  const encoded = requestHeaders.get("x-tenant-branding");
  if (encoded) {
    try {
      const branding = sanitizeBranding(JSON.parse(decodeURIComponent(encoded)));
      if (branding) return branding;
    } catch {
      // A malformed hint is not trusted; read the tenant's file below.
    }
  }

  const host = requestHeaders.get("host");
  const slug = requestHeaders.get("x-tenant-slug") ?? tenantSlugFromHost(host);
  if (!slug) return null;

  const result = await loadTenantBranding(slug);
  return result.status === "ok" ? result.branding : null;
});
