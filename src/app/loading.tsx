import { headers } from "next/headers";
import { LoadingIndicator } from "@/components/loading-indicator";
import { brandingLogoUrl, brandingFaviconUrl, brandingName } from "@/lib/branding";
import { fetchTenantBranding } from "@/lib/tenant-branding";
import { tenantApiBaseUrl, tenantSlugFromHost } from "@/lib/tenant";

/**
 * Root route fallback, branded per tenant like the manifest and the tab icon:
 * the same loader answers with that restaurant's own logo and name, and the
 * Nawy Orders mark only when there is no tenant or branding is unavailable.
 * It must stay free of AppProvider context because the global error route
 * renders this segment without the provider tree.
 */
export default async function Loading() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const slug = requestHeaders.get("x-tenant-slug") ?? tenantSlugFromHost(host);
  const apiBaseUrl = slug ? tenantApiBaseUrl(slug) : "";
  const result = apiBaseUrl ? await fetchTenantBranding(apiBaseUrl) : null;
  const branding = result?.status === "ok" ? result.branding : null;
  const logoUrl = brandingLogoUrl(branding) ?? brandingFaviconUrl(branding);
  const name = brandingName(branding, "ar");

  return (
    <div className="shell flex min-h-[72vh] flex-col items-center justify-center gap-5">
      {logoUrl ? (
        // A raw img: this fallback renders before the optimizer is involved.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-20 rounded-[30%] object-contain" />
      ) : (
        <LoadingIndicator className="size-20" />
      )}
      <div className="text-center">
        <p className="font-display text-xl font-extrabold text-brand">{name ?? "ناوي أوردرز"}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Nawy Orders</p>
      </div>
    </div>
  );
}
