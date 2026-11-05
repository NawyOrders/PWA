import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_COOKIE_DAYS,
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  envelopeError,
  envelopeVoid,
  readCookie,
  refreshCookie,
  serializeCookie,
  shouldMarkSecure,
  type CookieValue,
} from "@/lib/auth-cookie";

/**
 * The module's private ceiling, restated here so the boundary tests say what
 * they really mean: a token of exactly this length is a session, one character
 * more is a bug or an attack.
 */
const MAX_TOKEN_LENGTH = 8192;

type Envelope = {
  statusCode: number;
  isSuccess: boolean;
  data: unknown;
  errors: Record<string, string> | null;
  timestamp: string;
};

/** Hand-made answers must be readable by the same client code as API answers. */
function envelopeOf(body: unknown): Envelope {
  expect(body).toBeTypeOf("object");
  return body as Envelope;
}

function tokenOfLength(length: number): string {
  return "a".repeat(length);
}

function stored(value: unknown, secure = true): CookieValue | null {
  return refreshCookie(value, { secure });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("AUTH_MOCK", "");
  vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "");
});

describe("refreshCookie — the credential that outlives a page load", () => {
  it("writes exactly the attributes that keep the token away from scripts and from page requests", () => {
    expect(stored("rt-abc")).toEqual({
      name: REFRESH_COOKIE_NAME,
      value: "rt-abc",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: REFRESH_COOKIE_DAYS * 86_400,
    });
  });

  it("scopes the jar to the BFF paths only, under a name the routes agree on", () => {
    const cookie = stored("rt-abc", false);
    expect(cookie?.name).toBe("nawy_refresh");
    expect(cookie?.path).toBe("/api/auth");
  });

  it("stays alive across reloads for the days the API says a refresh token is good for", () => {
    expect(stored("rt-abc")?.maxAge).toBe(1_209_600);
  });

  it("accepts SameSite=Lax rather than Strict because a WhatsApp link still has to sign the customer in", () => {
    expect(stored("rt-abc")?.sameSite).toBe("lax");
  });

  it("trims the padding a gateway adds instead of storing whitespace as a secret", () => {
    expect(stored("  rt-abc  ")?.value).toBe("rt-abc");
  });

  it("stores nothing when the upstream sent an empty or whitespace-only token", () => {
    expect(stored("")).toBeNull();
    expect(stored("   ")).toBeNull();
  });

  it("refuses a token that is not a string, because a number is not a session either", () => {
    expect(stored(undefined)).toBeNull();
    expect(stored(null)).toBeNull();
    expect(stored(42)).toBeNull();
    expect(stored(true)).toBeNull();
    expect(stored({ token: "rt-abc" })).toBeNull();
    expect(stored(["rt-abc"])).toBeNull();
  });

  it("draws the line at the documented ceiling, one character before a header-overflowing blob", () => {
    expect(stored(tokenOfLength(MAX_TOKEN_LENGTH))?.value).toHaveLength(MAX_TOKEN_LENGTH);
    expect(stored(tokenOfLength(MAX_TOKEN_LENGTH + 1))).toBeNull();
  });
});

describe("clearRefreshCookie — the answer that means 'you are not signed in'", () => {
  it("wipes by expiring the cookie rather than by hiding its value", () => {
    expect(clearRefreshCookie({ secure: true })).toEqual({
      name: REFRESH_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 0,
    });
  });

  it("still clears over plain http, because a stale token on a LAN test device is the worst case", () => {
    expect(clearRefreshCookie({ secure: false }).secure).toBe(false);
  });
});

describe("shouldMarkSecure — the flag a browser can refuse to store", () => {
  it("marks every https origin, which is the only place a days-long token belongs", () => {
    expect(shouldMarkSecure("https://shop.example/api/auth/refresh")).toBe(true);
    expect(shouldMarkSecure("https://shop.example")).toBe(true);
  });

  it("keeps the flag on localhost, a trustworthy origin, so `next dev` still has a session", () => {
    expect(shouldMarkSecure("http://localhost:3000/api/auth/refresh")).toBe(true);
    expect(shouldMarkSecure("http://127.0.0.1:3000/api/auth/refresh")).toBe(true);
    expect(shouldMarkSecure("http://[::1]:3000/api/auth/refresh")).toBe(true);
  });

  it("drops the flag for a LAN address, where http is all the customer has and Secure would break login", () => {
    expect(shouldMarkSecure("http://192.168.1.20:3000/api/auth/refresh")).toBe(false);
    expect(shouldMarkSecure("http://10.0.0.5/api/auth/refresh")).toBe(false);
    expect(shouldMarkSecure("http://shop.test/api/auth/refresh")).toBe(false);
  });

  it("treats an unparseable origin as 'same origin as the page' and lets the environment decide", () => {
    // NODE_ENV is "test" here, so the safer-but-still-usable answer is false.
    expect(shouldMarkSecure("/api/auth/refresh")).toBe(false);
    expect(shouldMarkSecure("not a url at all")).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    expect(shouldMarkSecure("/api/auth/refresh")).toBe(true);
  });

  it("does not mistake another host that merely starts with localhost for a trusted origin", () => {
    expect(shouldMarkSecure("http://localhost.evil.test/api/auth/refresh")).toBe(false);
  });
});

describe("readCookie — pulling one value out of a Cookie header", () => {
  it("finds the session token among the cookies a browser actually sends", () => {
    const header = `theme=dark; ${REFRESH_COOKIE_NAME}=rt-abc; cart=42`;
    expect(readCookie(header, REFRESH_COOKIE_NAME)).toBe("rt-abc");
  });

  it("answers null when there is no header at all, as on a first visit", () => {
    expect(readCookie(null, REFRESH_COOKIE_NAME)).toBeNull();
    expect(readCookie(undefined, REFRESH_COOKIE_NAME)).toBeNull();
    expect(readCookie("", REFRESH_COOKIE_NAME)).toBeNull();
  });

  it("answers null when the jar holds no cookie of that name", () => {
    expect(readCookie("theme=dark; cart=42", REFRESH_COOKIE_NAME)).toBeNull();
  });

  it("matches the whole name, so a cookie that merely starts with it cannot log a browser in", () => {
    expect(readCookie("nawy_refresh_v2=rt-abc", REFRESH_COOKIE_NAME)).toBeNull();
  });

  it("skips the valueless fragments hand-edited headers and broken browsers produce", () => {
    expect(readCookie(`${REFRESH_COOKIE_NAME}; ${REFRESH_COOKIE_NAME}=rt-abc`, REFRESH_COOKIE_NAME)).toBe("rt-abc");
  });

  it("tolerates the spaces a header is allowed to carry around the separator", () => {
    expect(readCookie(`  ${REFRESH_COOKIE_NAME} =  rt-abc  `, REFRESH_COOKIE_NAME)).toBe("rt-abc");
  });

  it("decodes the percent-escaping serializeCookie wrote, so the token round-trips", () => {
    const cookie = stored("a b+c;d") as CookieValue;
    expect(readCookie(serializeCookie(cookie), REFRESH_COOKIE_NAME)).toBe("a b+c;d");
  });

  it("keeps an undecodable escape literally instead of throwing at the whole header", () => {
    expect(readCookie(`${REFRESH_COOKIE_NAME}=100%zz`, REFRESH_COOKIE_NAME)).toBe("100%zz");
  });

  it("reads an empty or blank value as no session, not as a token to forward", () => {
    expect(readCookie(`${REFRESH_COOKIE_NAME}=`, REFRESH_COOKIE_NAME)).toBeNull();
    expect(readCookie(`${REFRESH_COOKIE_NAME}=%20%20`, REFRESH_COOKIE_NAME)).toBeNull();
  });

  it("refuses an oversized value, the same way the writer refused to store it", () => {
    expect(readCookie(`${REFRESH_COOKIE_NAME}=${tokenOfLength(MAX_TOKEN_LENGTH + 1)}`, REFRESH_COOKIE_NAME)).toBeNull();
    expect(readCookie(`${REFRESH_COOKIE_NAME}=${tokenOfLength(MAX_TOKEN_LENGTH)}`, REFRESH_COOKIE_NAME)).toHaveLength(
      MAX_TOKEN_LENGTH,
    );
  });

  it("keeps an '=' inside the value rather than truncating the token", () => {
    expect(readCookie(`${REFRESH_COOKIE_NAME}=a=b=c`, REFRESH_COOKIE_NAME)).toBe("a=b=c");
  });
});

describe("serializeCookie — the Set-Cookie string, written by hand on purpose", () => {
  it("spells out every attribute that makes the cookie safe, in one readable line", () => {
    expect(serializeCookie(clearRefreshCookie({ secure: true }))).toBe(
      "nawy_refresh=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0; Secure",
    );
  });

  it("leaves the Secure flag off exactly when the origin cannot carry it", () => {
    const cookie = stored("rt-abc", false) as CookieValue;
    const line = serializeCookie(cookie);
    expect(line).toBe("nawy_refresh=rt-abc; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=1209600");
    expect(line).not.toContain("Secure");
  });

  it("escapes a value that would otherwise break the header into extra attributes", () => {
    const cookie = stored("a b;c=d") as CookieValue;
    expect(serializeCookie(cookie)).toContain("nawy_refresh=a%20b%3Bc%3Dd");
  });

  it("relies on Max-Age alone, so the wipe needs no second expires date", () => {
    const line = serializeCookie(stored("rt-abc") as CookieValue);
    expect(line).not.toContain("Expires");
    expect(serializeCookie(clearRefreshCookie({ secure: true }))).toContain("Max-Age=0");
  });
});

describe("envelopeError and envelopeVoid — refusals the app server makes itself", () => {
  it("keeps the API's envelope shape so the client's error catalog still applies", () => {
    const body = envelopeOf(envelopeError(429, "Auth.OtpRateLimitExceeded", "Too many requests."));
    expect(body.statusCode).toBe(429);
    expect(body.isSuccess).toBe(false);
    expect(body.data).toBeNull();
    expect(body.errors).toEqual({ "Auth.OtpRateLimitExceeded": "Too many requests." });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("answers a codeless refusal with null errors, never with an empty object to loop over", () => {
    expect(envelopeOf(envelopeError(500, null)).errors).toBeNull();
    expect(envelopeOf(envelopeError(502, null)).isSuccess).toBe(false);
  });

  it("still sends the documented key with an empty message when no text came to hand", () => {
    expect(envelopeOf(envelopeError(400, "Validation.Failed")).errors).toEqual({ "Validation.Failed": "" });
  });

  it("reports data:null as a success for /revoke, which is the shape the old client misread", () => {
    const body = envelopeOf(envelopeVoid());
    expect(body).toMatchObject({ statusCode: 200, isSuccess: true, data: null, errors: null });
  });

  it("carries the status it was given, so a 204 void really says 204", () => {
    expect(envelopeOf(envelopeVoid(204)).statusCode).toBe(204);
  });
});
