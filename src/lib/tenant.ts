/**
 * Tenant resolution for the customer-facing storefront.
 *
 * The storefront is served from `{slug}.nawyorders.com` and talks to
 * `{slug}.api.nawyorders.com`. Both values are derived from the request host at
 * runtime: nothing here is read from `NEXT_PUBLIC_*`, because a single image
 * serves every tenant and a build-time value would pin all of them to one store.
 *
 * This module is deliberately free of `next/headers` and React so the same
 * rules can be used by the Edge middleware, by route handlers and by tests.
 */

/** Base domain the storefront is served from. */
export const DEFAULT_TENANT_ROOT_DOMAIN = "nawyorders.com";

/** API host template; `{slug}` is replaced with the first hostname label. */
export const DEFAULT_TENANT_API_BASE_URL_TEMPLATE = "https://{slug}.api.nawyorders.com";

/**
 * Hostnames that must never be treated as a tenant. They are either the
 * platform's own hosts or paths the storefront itself owns.
 */
export const DEFAULT_TENANT_RESERVED_SLUGS = [
  "www",
  "api",
  "admin",
  "platform-api",
  "tenant-api",
  "app",
  "static",
  "assets",
  "health",
  "cdn",
  "media",
  "dashboard",
] as const;

/**
 * A slug is one DNS label. Tenant ids in the platform are lower-case hex with
 * hyphens (`el-fahm-01a1…`), so this rejects anything that cannot be one.
 */
const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function envValue(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** The configured root domain, without a leading or trailing dot. */
export function tenantRootDomain(): string {
  return (envValue("TENANT_ROOT_DOMAIN") || DEFAULT_TENANT_ROOT_DOMAIN)
    .toLowerCase()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");
}

/** Reserved labels, from `TENANT_RESERVED_SLUGS` or the built-in list. */
export function reservedTenantSlugs(): Set<string> {
  const configured = envValue("TENANT_RESERVED_SLUGS");
  const values = configured ? configured.split(",") : DEFAULT_TENANT_RESERVED_SLUGS;
  return new Set(
    values
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

/**
 * `Host` header → bare hostname. Handles the port, IPv6 brackets and the
 * trailing dot some resolvers leave behind.
 */
export function normalizeHostname(hostHeader: string | null | undefined): string {
  const raw = (hostHeader ?? "").trim().toLowerCase();
  if (!raw) return "";

  let host = raw;
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    host = end === -1 ? host : host.slice(0, end + 1);
  } else {
    const colon = host.indexOf(":");
    host = colon === -1 ? host : host.slice(0, colon);
  }
  return host.replace(/\.+$/, "");
}

/** Whether the host is the root domain or a subdomain of it. */
export function isTenantRootHost(hostHeader: string | null | undefined): boolean {
  const host = normalizeHostname(hostHeader);
  if (!host) return false;
  const root = tenantRootDomain();
  return host === root || host.endsWith(`.${root}`);
}

/**
 * The tenant slug for a request host, or `null` when the host is not a
 * storefront host or names a reserved label.
 *
 * The first hostname label is the slug, exactly as the deployment contract
 * says. `foo.api.nawyorders.com` is a tenant API host, not a storefront, so it
 * is rejected before the first label is considered.
 */
export function tenantSlugFromHost(hostHeader: string | null | undefined): string | null {
  const host = normalizeHostname(hostHeader);
  if (!host) return null;

  const root = tenantRootDomain();
  if (host === root) return null;
  if (!host.endsWith(`.${root}`)) return null;

  // A host below the tenant API domain is never a storefront.
  if (host.endsWith(`.api.${root}`)) return null;

  const slug = host.slice(0, -(root.length + 1)).split(".")[0] ?? "";
  if (!slug || reservedTenantSlugs().has(slug)) return null;
  if (!TENANT_SLUG_PATTERN.test(slug)) return null;
  return slug;
}

/**
 * `https://{slug}.api.nawyorders.com` for a resolved slug.
 *
 * Returns `null` for a missing/malformed template rather than silently falling
 * back to one tenant: a bad deployment must not serve another store's data.
 */
export function tenantApiBaseUrl(slug: string): string | null {
  const template = envValue("TENANT_API_BASE_URL_TEMPLATE") || DEFAULT_TENANT_API_BASE_URL_TEMPLATE;
  if (!template.includes("{slug}")) return null;

  const base = template.split("{slug}").join(slug).replace(/\/+$/, "");
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return base;
  } catch {
    return null;
  }
}

/**
 * The tenant API's documented "this host has no tenant" answer.
 *
 * The storefront uses this for branding: a 404 from `/api/v1/branding` is the
 * backend saying the slug does not exist, and it must become the friendly
 * Tenant Not Found page rather than a crash. The title check is kept as well as
 * the status because the backend may wrap the problem in a different status.
 */
export function isTenantNotFoundProblem(body: unknown, status: number): boolean {
  if (status === 404) return true;
  if (!body || typeof body !== "object") return false;
  const title = (body as { title?: unknown }).title;
  return typeof title === "string" && title.trim().toLowerCase() === "tenant not found";
}
