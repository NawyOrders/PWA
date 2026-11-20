/**
 * The brand name for the root loading splash.
 *
 * The splash renders before (and sometimes without) the provider tree, so it
 * cannot read `brandingName` from context. This resolves it on the server from
 * the same headers middleware sets: a tenant gets its own name, an unbranded
 * tenant gets its slug, and the default site keeps the built-in name.
 *
 * Node only: it reads the tenant's file through `loadTenantBranding`.
 */

import { brandingName } from "@/lib/branding";
import { loadTenantBranding } from "@/lib/static-tenant-data";
import { tenantSlugFromHost } from "@/lib/tenant";

export const DEFAULT_BRAND_NAME_AR = "ناوي أوردرز";
export const DEFAULT_BRAND_NAME_EN = "Nawy Orders";

export type LoadingBrand = {
  nameAr: string;
  nameEn: string;
  /** `false` only on the default site; tenants never show the Nawy tagline. */
  isTenant: boolean;
};

export async function resolveLoadingBrand(
  readHeader: (name: string) => string | null,
): Promise<LoadingBrand> {
  const slug = readHeader("x-tenant-slug") ?? tenantSlugFromHost(readHeader("host"));
  if (!slug) {
    return { nameAr: DEFAULT_BRAND_NAME_AR, nameEn: DEFAULT_BRAND_NAME_EN, isTenant: false };
  }

  const result = await loadTenantBranding(slug);
  const branding = result.status === "ok" ? result.branding : null;
  return {
    nameAr: brandingName(branding, "ar") ?? slug,
    nameEn: brandingName(branding, "en") ?? slug,
    isTenant: true,
  };
}
