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
 * Characters that browsers silently strip (or that cannot appear literally in
 * a URL). A tab in `/\t/evil.com` is ignored by the URL parser, turning the
 * value into the protocol-relative `//evil.com`, so these are rejected up front.
 */
const UNSAFE_PATH_CHARS = /[\u0000-\u0020\u007f\\]/;
const PARSE_BASE = "https://nawy.invalid";

/**
 * Only in-app absolute paths are accepted as a post-login destination.
 * Rejects protocol-relative (`//evil`), backslash/control-character tricks,
 * cross-origin values and login loops.
 */
export function sanitizeNextPath(
  requested: string | null | undefined,
  fallback: string = DEFAULT_AUTH_REDIRECT,
): string {
  if (!requested) return fallback;
  if (!requested.startsWith("/") || requested.startsWith("//")) return fallback;
  if (UNSAFE_PATH_CHARS.test(requested)) return fallback;

  let url: URL;
  try {
    url = new URL(requested, PARSE_BASE);
  } catch {
    return fallback;
  }

  // Normalisation must keep us on the same origin and inside a real path.
  if (url.origin !== PARSE_BASE) return fallback;
  if (url.pathname.startsWith("//")) return fallback;
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return fallback;

  return requested;
}
