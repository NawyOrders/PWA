import { NextResponse, type NextRequest } from "next/server";
import { fetchTenantBranding } from "@/lib/tenant-branding";
import { isTenantRootHost, tenantApiBaseUrl, tenantSlugFromHost } from "@/lib/tenant";
import { tenantNotFoundResponse } from "@/lib/tenant-not-found";

/**
 * A document request is the one that will render HTML. Client-side RSC
 * navigations and the BFF are excluded: the document already proved the tenant
 * exists, and an API call from middleware on every prefetch would be noise.
 */
function isDocumentRequest(request: NextRequest): boolean {
  if (request.nextUrl.pathname.startsWith("/api/")) return false;
  if (request.headers.get("rsc") === "1") return false;
  if (request.headers.get("next-router-prefetch")) return false;

  const destination = request.headers.get("sec-fetch-dest");
  if (destination) return destination === "document";

  const accept = request.headers.get("accept") ?? "";
  return accept === "" || accept.includes("text/html") || accept.includes("*/*");
}

/**
 * Resolves the storefront tenant before any route renders.
 *
 * The first hostname label is the slug. A host under `nawyorders.com` that does
 * not name a valid, non-reserved tenant gets the friendly 404 immediately, so
 * an unknown store never reaches the tenant API and never paints the default
 * store's HTML. Hosts outside the root domain (localhost, previews) are left
 * alone: they run the app's normal demo mode.
 *
 * For document requests this also asks the tenant API for branding. Next 16
 * streams dynamic pages, and a `notFound()` thrown after streaming starts is
 * rendered with HTTP 200; middleware is the last place that can still answer a
 * real 404. The fetched branding is forwarded to the server render so the page
 * does not pay for the same GET twice.
 */
export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Never trust tenant hints from the client. Only this function may set them.
  headers.delete("x-tenant-slug");
  headers.delete("x-tenant-branding");
  headers.delete("x-tenant-branding-etag");

  const host = request.headers.get("host");
  if (!isTenantRootHost(host)) return NextResponse.next({ request: { headers } });

  const slug = tenantSlugFromHost(host);
  if (!slug) return tenantNotFoundResponse();

  headers.set("x-tenant-slug", slug);

  if (isDocumentRequest(request)) {
    const apiBaseUrl = tenantApiBaseUrl(slug);
    if (!apiBaseUrl) {
      return new Response("Tenant storefront is misconfigured.", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    const result = await fetchTenantBranding(apiBaseUrl);
    if (result.status === "not-found") return tenantNotFoundResponse();
    if (result.status === "ok") {
      headers.set("x-tenant-branding", encodeURIComponent(JSON.stringify(result.branding)));
      if (result.etag) headers.set("x-tenant-branding-etag", result.etag);
    }
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Static assets and the service worker do not need tenant resolution. The
  // HTML routes and the BFF all do.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|og/|sw.js|manifest.webmanifest).*)",
  ],
};
