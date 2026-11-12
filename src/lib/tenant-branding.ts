/**
 * Server-side branding fetch for a resolved tenant.
 *
 * This is intentionally separate from `src/lib/api.ts`: the browser client is
 * allowed to fall back to its stored palette, but the storefront render must
 * know whether the host maps to a tenant before it paints. A 404 is a real
 * answer ("Tenant Not Found"), not a cosmetic failure, so it is reported as
 * its own result instead of being swallowed.
 *
 * Every request is `no-store`: the same process serves every tenant, and a
 * shared cache keyed only by path would hand one restaurant's branding to
 * another. The slug is already in the URL, so even a cache keyed by URL is
 * per-tenant, but `no-store` keeps that guarantee explicit.
 */

import type { RestaurantBranding } from "@/lib/api";
import { sanitizeBranding } from "@/lib/branding";
import { isTenantNotFoundProblem } from "@/lib/tenant";

export type TenantBrandingResult =
  | { status: "ok"; branding: RestaurantBranding; etag: string | null }
  | { status: "not-found" }
  | { status: "unavailable" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * The tenant API wraps payloads in `{ statusCode, isSuccess, data, … }`.
 * A raw branding object is accepted too, because older deployments answered
 * without the envelope.
 */
function unwrapBranding(body: unknown): RestaurantBranding | null {
  if (!isRecord(body)) return null;
  if (body.isSuccess === false) return null;

  const data = isRecord(body.data) ? body.data : body;
  if (!("nameAr" in data) && !("nameEn" in data) && !("tenantId" in data)) return null;
  const branding = sanitizeBranding(data);
  return branding && Object.keys(branding).length > 0 ? branding : null;
}

export async function fetchTenantBranding(
  apiBaseUrl: string,
  options: { etag?: string | null; timeoutMs?: number } = {},
): Promise<TenantBrandingResult> {
  const base = apiBaseUrl.replace(/\/+$/, "");
  if (!base) return { status: "unavailable" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);

  try {
    const response = await fetch(`${base}/api/v1/branding`, {
      headers: {
        Accept: "application/json",
        ...(options.etag ? { "If-None-Match": options.etag } : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 404) {
      const problem = await response.json().catch(() => null);
      return isTenantNotFoundProblem(problem, response.status)
        ? { status: "not-found" }
        : { status: "unavailable" };
    }

    if (response.status === 304) {
      return { status: "unavailable" };
    }

    if (!response.ok) return { status: "unavailable" };

    const body = await response.json().catch(() => null);
    const branding = unwrapBranding(body);
    if (!branding) return { status: "unavailable" };

    return { status: "ok", branding, etag: response.headers.get("ETag") };
  } catch {
    // The backend may be restarting or unreachable. Branding is not a reason to
    // crash the storefront; the built-in palette stays and the next request
    // tries again.
    return { status: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
