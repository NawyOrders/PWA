/**
 * The logic behind `/api/auth/*` — the thin BFF the integration guide asks for.
 *
 * Why these three calls belong on the app server and the OTP request does not:
 * `/otp/verify`, `/refresh` and `/revoke` are the only auth calls whose answer
 * or input carries a refresh token. A browser cannot keep that token safely —
 * `localStorage` is readable by any script on the origin, and the token is
 * good for days — so the app server takes it off the API's response, puts it in
 * an httpOnly cookie scoped to `/api/auth`, and removes it from the body the
 * page sees. `/otp/request` carries no credential at all, so the browser talks
 * to the tenant host directly and the tenant stays resolved from that host.
 *
 * The pass-through rule is what makes this safe to add: the status code, the
 * envelope and the `Retry-After` header come back exactly as the tenant API
 * sent them. The client's error catalog is written against those codes, so a
 * BFF that re-interpreted them would break every message the customer reads.
 *
 * Nothing here logs. A request body at this point contains an OTP code and a
 * phone number, and an answer contains two tokens.
 */

import {
  clearRefreshCookie,
  envelopeError,
  envelopeVoid,
  refreshCookie,
  serializeCookie,
  shouldMarkSecure,
  type CookieValue,
} from "@/lib/auth-cookie";
import { forwardToTenant } from "@/lib/api";

export type BffResult = {
  status: number;
  body: unknown;
  /** Present on 429, where the number is the only honest countdown. */
  retryAfterSeconds: number | null;
  /** Cookie to write: a rotated token, or an expired one to clear. */
  cookie: CookieValue | null;
};

type Upstream = Awaited<ReturnType<typeof forwardToTenant>>;

const VERIFY_PATH = "/api/v1/auth/otp/verify";
const REFRESH_PATH = "/api/v1/auth/refresh";
const REVOKE_PATH = "/api/v1/auth/revoke";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** The API's `data` object, when the answer really is a success envelope. */
function envelopeData(upstream: Upstream): Record<string, unknown> | null {
  const body = upstream.body;
  if (!isRecord(body)) return null;
  if (body.isSuccess !== true) return null;
  const data = body.data;
  return isRecord(data) ? data : null;
}

/**
 * Takes any refresh token out of an envelope body.
 *
 * The one rule this module cannot relax: a refresh token never travels back to
 * the page. Scrubbing happens inside `relay()` rather than only on the happy
 * path, because the refusals leak too — an answer whose token was unusable
 * (oversized, not a string) is still an answer that contains a token, and
 * relaying it verbatim to survive the 502 would put that token in JavaScript.
 */
function scrub(body: unknown): unknown {
  if (!isRecord(body) || !isRecord(body.data)) return body;
  if (!("refreshToken" in body.data)) return body;
  const { refreshToken: _hidden, ...visible } = body.data;
  return { ...body, data: visible };
}

/**
 * Rebuilds the answer with the refresh token taken out of it.
 *
 * Everything else — `statusCode`, `isSuccess`, `errors`, `timestamp` — is kept
 * literally, because the client maps failures from those fields.
 */
function relay(upstream: Upstream, cookie: CookieValue | null): BffResult {
  const body = upstream.body;
  const success = upstream.status >= 200 && upstream.status < 300;
  return {
    status: upstream.status,
    // An empty success (204) still has to answer with the envelope the client
    // reads, and a failed answer with no parseable body — a bare `500` from the
    // deployed API is that case today — keeps its status so the catalog can
    // still name it.
    body: body === null ? (success ? envelopeVoid(upstream.status) : envelopeError(upstream.status, null)) : scrub(body),
    retryAfterSeconds: upstream.retryAfterSeconds,
    cookie,
  };
}

function badRequest(): BffResult {
  return {
    status: 400,
    body: envelopeError(400, "Validation.Failed", "Request body must be a JSON object."),
    retryAfterSeconds: null,
    cookie: null,
  };
}

/**
 * `/otp/verify` → store the token, hide it.
 *
 * A failed verify changes nothing about the cookie: the previous session, if
 * there was one, is still the previous session.
 */
export async function bffVerify(input: { body: unknown; origin: string }): Promise<BffResult> {
  if (!isRecord(input.body)) return badRequest();
  const secure = shouldMarkSecure(input.origin);
  const { refreshToken: _dropped, ...rest } = input.body;

  const upstream = await forwardToTenant(VERIFY_PATH, { body: rest });
  const data = upstream.status === 200 ? envelopeData(upstream) : null;
  const stored = data ? refreshCookie(data.refreshToken, { secure }) : null;
  if (!data) return relay(upstream, null);

  // A success that carries no refresh token is not a session the app can keep,
  // so it is reported as the envelope failure it is rather than silently
  // signing the customer in with nothing to refresh with.
  if (!stored) return { ...relay(upstream, null), status: 502 };

  return relay(upstream, stored);
}

/**
 * `/refresh` → read the cookie, rotate it atomically.
 *
 * The replacement is written whether or not the page asked for it, and the old
 * value is never returned anywhere: rotation makes the presented token dead, so
 * keeping a second copy in JavaScript would be an invitation to reuse it.
 */
export async function bffRefresh(input: { token: string | null; origin: string }): Promise<BffResult> {
  const secure = shouldMarkSecure(input.origin);
  if (!input.token) {
    return {
      status: 401,
      body: envelopeError(401, "RefreshToken.Invalid", "No session cookie was sent."),
      retryAfterSeconds: null,
      // Nothing to rotate, but an old cookie must not linger either.
      cookie: clearRefreshCookie({ secure }),
    };
  }

  const upstream = await forwardToTenant(REFRESH_PATH, { body: { refreshToken: input.token } });
  const data = upstream.status === 200 ? envelopeData(upstream) : null;
  const rotated = data ? refreshCookie(data.refreshToken, { secure }) : null;
  if (!data) {
    // Any 401 here means the family is gone — expired, revoked, or reuse
    // detected — so the cookie is cleared and the customer signs in again.
    const clear = upstream.status === 401 ? clearRefreshCookie({ secure }) : null;
    return relay(upstream, clear);
  }
  if (!rotated) return { ...relay(upstream, null), status: 502 };

  return relay(upstream, rotated);
}

/**
 * `/revoke` → always drop the cookie.
 *
 * The order matters: the token has to be spent server-side first, but the local
 * copy goes regardless, because a failed revoke must never leave a browser that
 * still believes it is signed in.
 */
export async function bffRevoke(input: { token: string | null; origin: string }): Promise<BffResult> {
  const secure = shouldMarkSecure(input.origin);
  if (!input.token) {
    // Nothing to revoke is already logged out, which is what the caller wanted.
    return {
      status: 200,
      body: envelopeVoid(),
      retryAfterSeconds: null,
      cookie: clearRefreshCookie({ secure }),
    };
  }

  const upstream = await forwardToTenant(REVOKE_PATH, {
    body: { refreshToken: input.token, reason: "User logged out" },
  });
  return relay(upstream, clearRefreshCookie({ secure }));
}

/**
 * One-time adoption for a session stored by an older build.
 *
 * Before the cookie existed, the refresh token lived in `localStorage`. This
 * hands it to the jar once and answers without echoing it back, so upgrading
 * customers keep their session while the storage copy is overwritten with
 * identity only.
 */
export async function bffAttach(input: { body: unknown; origin: string }): Promise<BffResult> {
  const secure = shouldMarkSecure(input.origin);
  const token = isRecord(input.body) ? input.body.refreshToken : null;
  const cookie = refreshCookie(token, { secure });
  if (!cookie) return badRequest();
  return { status: 204, body: null, retryAfterSeconds: null, cookie };
}

export type { CookieValue };

/**
 * Turns a `BffResult` into the response the browser gets.
 *
 * `no-store` is not decoration: an auth answer must never sit in a cache, and
 * these routes are the only place the rotated token is ever written.
 */
export function bffResponse(result: BffResult): Response {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  if (result.retryAfterSeconds !== null) headers.set("Retry-After", String(result.retryAfterSeconds));
  if (result.cookie) headers.append("Set-Cookie", serializeCookie(result.cookie));

  if (result.status === 204 || result.body === null) {
    return new Response(null, { status: result.status, headers });
  }
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
