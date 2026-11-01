/**
 * Route policy for the storefront.
 *
 * Everything that needs a signed-in customer is declared here once, so the
 * chrome, links and login screen all agree on the same rules.
 */

export const PROTECTED_PREFIXES = ["/profile", "/checkout", "/orders", "/addresses"] as const;

export const DEFAULT_AUTH_REDIRECT = "/profile";

/** True when the path belongs to the account/checkout area. */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Builds a login URL that remembers where the customer was going.
 * The value is always encoded, so query strings on the target survive.
 */
export function loginHref(next: string = DEFAULT_AUTH_REDIRECT): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/**
 * Only in-app absolute paths are accepted as a post-login destination.
 * Rejects protocol-relative (`//evil`), backslash tricks and non-path values.
 */
export function sanitizeNextPath(
  requested: string | null | undefined,
  fallback: string = DEFAULT_AUTH_REDIRECT,
): string {
  if (!requested) return fallback;
  if (!requested.startsWith("/")) return fallback;
  if (requested.startsWith("//") || requested.startsWith("/\\")) return fallback;
  if (requested === "/login" || requested.startsWith("/login?")) return fallback;
  return requested;
}
