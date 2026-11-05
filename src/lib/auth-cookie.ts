/**
 * The refresh-token cookie, kept out of the route handlers so the rules can be
 * read and tested without a running server.
 *
 * The refresh token is the one credential in this flow that outlives a page
 * load, which makes it the one worth protecting hardest. It is never returned
 * to JavaScript: it lives in a cookie scoped to `/api/auth` — so no page
 * request carries it — `httpOnly` so no script can read it, `SameSite=Lax` so
 * a cross-site link cannot spend it, and `Secure` whenever the app itself is
 * served over HTTPS.
 *
 * `SameSite=Lax` rather than `Strict` is the honest choice: a customer opening
 * the app from a WhatsApp SMS link or after a redirect back into the tab still
 * has to be recognised, and Lax keeps top-level *GET* navigations working while
 * refusing every cross-site POST.
 */

import { MAX_TOKEN_LENGTH, REFRESH_TOKEN_LIFETIME_DAYS } from "@/lib/api";

export const REFRESH_COOKIE_NAME = "nawy_refresh";

/**
 * How long the cookie lives, in days — the same number the token behind it is
 * documented to live for, imported rather than repeated so the jar and the
 * credential cannot drift into disagreeing about which one outlives the other.
 */
export const REFRESH_COOKIE_DAYS = REFRESH_TOKEN_LIFETIME_DAYS;

export type CookieValue = {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/api/auth";
  maxAge: number;
};

function cleanToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TOKEN_LENGTH) return null;
  return trimmed;
}

/** Written on a successful verify/refresh. `maxAge` keeps it alive across reloads. */
export function refreshCookie(value: unknown, options: { secure: boolean }): CookieValue | null {
  const token = cleanToken(value);
  if (!token) return null;
  return {
    name: REFRESH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: options.secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_COOKIE_DAYS * 86_400,
  };
}

/** Written on revoke — and on any failure that means "you are not signed in". */
export function clearRefreshCookie(options: { secure: boolean }): CookieValue {
  return {
    name: REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: options.secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  };
}

/**
 * `Secure` cannot be a constant: `next dev` runs on `http://localhost`, and a
 * cookie the browser refuses to store is the same as no session at all.
 * Localhost is a trustworthy origin in every current browser, so the flag is
 * still safe there — it is plain `http://192.168.x.x` LAN testing that has to
 * go without it.
 */
export function shouldMarkSecure(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return true;
    return parsed.protocol === "http:" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname);
  } catch {
    // A relative path means "same origin as the page"; let the environment
    // decide, and default to the safer answer.
    return process.env.NODE_ENV === "production";
  }
}

/** Reads one cookie out of a `Cookie:` header without pulling in a parser. */
export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const raw = part.slice(index + 1).trim();
    try {
      return cleanToken(decodeURIComponent(raw));
    } catch {
      return cleanToken(raw);
    }
  }
  return null;
}

/**
 * The `Set-Cookie` string a route handler sends.
 *
 * Written by hand rather than through the framework's cookie helper so the
 * exact attributes — the ones that make this cookie safe — are visible in one
 * place and testable without a running server.
 */
export function serializeCookie(cookie: CookieValue): string {
  const parts = [
    `${cookie.name}=${encodeURIComponent(cookie.value)}`,
    "Path=/api/auth",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${cookie.maxAge}`,
  ];
  if (cookie.secure) parts.push("Secure");
  // A cookie this app sets is never read by the app itself, so no expiry date
  // is needed: `Max-Age` covers both the 14-day session and the 0-second wipe.
  return parts.join("; ");
}

/**
 * The envelope a caller gets when the app server itself has to refuse.
 *
 * The BFF must not invent its own error language: the client reads the same
 * envelope and the same codes whatever answered, so a hand-made answer uses
 * the same shape with a documented code.
 */
export function envelopeError(status: number, code: string | null, message?: string): unknown {
  return {
    statusCode: status,
    isSuccess: false,
    data: null,
    errors: code ? { [code]: message ?? "" } : null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * The void success `/revoke` answers with.
 *
 * Worth spelling out because `data: null` is a *success* here, which is exactly
 * the envelope shape the old client read as a failure.
 */
export function envelopeVoid(status = 200): unknown {
  return {
    statusCode: status,
    isSuccess: true,
    data: null,
    errors: null,
    timestamp: new Date().toISOString(),
  };
}
