import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiBaseUrl,
  apiConfigured,
  apiErrorMessageKey,
  fetchBranding,
  normalizeEgyptianPhone,
  refreshTokens,
  requestOtp,
  revokeRefreshToken,
  verifyOtp,
} from "@/lib/api";

const BASE = "https://api.test";

/** Every documented response rides in the same envelope. */
function envelope(data: unknown, options: { statusCode?: number; isSuccess?: boolean; errors?: unknown } = {}) {
  return JSON.stringify({
    statusCode: options.statusCode ?? 200,
    isSuccess: options.isSuccess ?? true,
    data,
    errors: options.errors ?? null,
    timestamp: "2026-11-05T10:00:00Z",
  });
}

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(body === null ? "" : String(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

function stubFetch(handler: (input: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonOf(init?: RequestInit) {
  return JSON.parse(String(init?.body));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_TENANT_ID", "");
});

describe("API configuration", () => {
  it("treats a missing base URL as inert, not as a broken request", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(apiBaseUrl()).toBe("");
    expect(apiConfigured()).toBe(false);
  });

  it("trims whitespace and trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "  https://api.test///  ");
    expect(apiBaseUrl()).toBe("https://api.test");
    expect(apiConfigured()).toBe(true);
  });

  it("refuses to call fetch when no backend is configured", async () => {
    const fetchMock = stubFetch(() => jsonResponse(envelope({})));
    await expect(requestOtp({ phoneNumber: "+201012345678" })).rejects.toMatchObject({ kind: "offline" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("normalizeEgyptianPhone", () => {
  it("accepts the shapes a customer actually types", () => {
    expect(normalizeEgyptianPhone("01012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("010 123 456 78")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("+201012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("+20 1012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("00201012345678")).toBe("+201012345678");
    expect(normalizeEgyptianPhone("1012345678")).toBe("+201012345678");
  });

  it("returns an empty string instead of a bogus +20", () => {
    expect(normalizeEgyptianPhone("")).toBe("");
    expect(normalizeEgyptianPhone("--")).toBe("");
  });
});

describe("requestOtp", () => {
  it("posts the documented login challenge body", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() =>
      jsonResponse(
        envelope({
          challengeId: "ch-1",
          expiresAtUtc: "2026-11-05T10:02:00Z",
          expiresInSeconds: 120,
          devOtpCode: "246810",
        }),
      ),
    );

    await expect(requestOtp({ phoneNumber: "+201012345678" })).resolves.toEqual({
      challengeId: "ch-1",
      expiresAtUtc: "2026-11-05T10:02:00Z",
      expiresInSeconds: 120,
      devOtpCode: "246810",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/api/v1/auth/otp/request`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({
      phoneNumber: "+201012345678",
      purpose: "login",
      channel: "sms",
    });
  });

  it("keeps a missing devOtpCode as null rather than the string undefined", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() =>
      jsonResponse(envelope({ challengeId: "ch-1", expiresAtUtc: null, expiresInSeconds: null, devOtpCode: null })),
    );

    await expect(requestOtp({ phoneNumber: "+201012345678" })).resolves.toEqual({
      challengeId: "ch-1",
      expiresAtUtc: "",
      expiresInSeconds: 0,
      devOtpCode: null,
    });
  });

  it("sends an explicit channel and purpose when the caller asks for them", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope({ challengeId: "ch-2" })));

    await requestOtp({ phoneNumber: "+201012345678", channel: "whatsapp", purpose: "signup" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({
      phoneNumber: "+201012345678",
      purpose: "signup",
      channel: "whatsapp",
    });
  });

  it("rejects a challenge without an id as an unreadable response", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => jsonResponse(envelope({ expiresInSeconds: 60 })));
    await expect(requestOtp({ phoneNumber: "+201012345678" })).rejects.toMatchObject({ kind: "envelope" });
  });
});

describe("verifyOtp, refreshTokens and revoke", () => {
  const session = {
    customerId: "c-1",
    phoneNumber: "+201012345678",
    fullName: "Nawy Guest",
    email: null,
    accessToken: "access-1",
    tokenType: "Bearer",
    expiresIn: 900,
    expiresAtUtc: "2026-11-05T10:15:00Z",
    refreshToken: "refresh-1",
  };

  it("posts the verify body and returns the session fields", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(session)));

    await expect(verifyOtp({ challengeId: "ch-1", code: "123456", fullName: "Nawy Guest" })).resolves.toEqual(session);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/api/v1/auth/otp/verify`);
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({
      challengeId: "ch-1",
      code: "123456",
      fullName: "Nawy Guest",
    });
  });

  it("sends an empty name for a returning customer", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(session)));

    await verifyOtp({ challengeId: "ch-1", code: "123456" });
    expect(jsonOf(fetchMock.mock.calls[0]?.[1]).fullName).toBe("");
  });

  it("rejects a verify response without tokens", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => jsonResponse(envelope({ customerId: "c-1" })));
    await expect(verifyOtp({ challengeId: "ch-1", code: "123456" })).rejects.toMatchObject({ kind: "envelope" });
  });

  it("refreshes a token pair", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() =>
      jsonResponse(
        envelope({
          accessToken: "access-2",
          tokenType: "Bearer",
          expiresIn: 900,
          expiresAtUtc: "2026-11-05T11:00:00Z",
          refreshToken: "refresh-2",
          refreshTokenExpiresAtUtc: null,
        }),
      ),
    );

    await expect(refreshTokens("refresh-1")).resolves.toMatchObject({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      refreshTokenExpiresAtUtc: null,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/api/v1/auth/refresh`);
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ refreshToken: "refresh-1" });
  });

  it("defaults the refresh token type and numeric fields", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => jsonResponse(envelope({ accessToken: "a", refreshToken: "r" })));

    await expect(refreshTokens("r")).resolves.toEqual({
      accessToken: "a",
      tokenType: "Bearer",
      expiresIn: 0,
      expiresAtUtc: "",
      refreshToken: "r",
      refreshTokenExpiresAtUtc: null,
    });
  });

  it("rejects a refresh response without tokens", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => jsonResponse(envelope({ accessToken: "only-access" })));

    await expect(refreshTokens("refresh-1")).rejects.toMatchObject({ kind: "envelope" });
  });

  it("revokes with a reason and ignores the empty data payload", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(null)));

    // Revoke has no meaningful body, so it must not unwrap or fail on data:null.
    await expect(revokeRefreshToken("refresh-1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/api/v1/auth/revoke`);
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ refreshToken: "refresh-1", reason: "logout" });
  });

  it("accepts a custom revoke reason", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(true)));

    await revokeRefreshToken("refresh-1", "security");
    expect(jsonOf(fetchMock.mock.calls[0]?.[1])).toEqual({ refreshToken: "refresh-1", reason: "security" });
  });
});

describe("fetchBranding", () => {
  const branding = { tenantId: "t-1", nameAr: "ناوي", primaryColor: "#E8452C" };

  it("returns the payload with its ETag", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(branding), { headers: { ETag: '"b1"' } }));

    await expect(fetchBranding()).resolves.toEqual({
      notModified: false,
      branding,
      etag: '"b1"',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/api/v1/Branding`);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ Accept: "application/json" });
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe("omit");
  });

  it("sends If-None-Match and reports a 304 as unchanged", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => new Response(null, { status: 304, headers: { ETag: '"b1"' } }));

    await expect(fetchBranding({ etag: '"b1"' })).resolves.toEqual({ notModified: true, branding: null, etag: '"b1"' });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "If-None-Match": '"b1"' });
  });

  it("adds the tenant header when one is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    vi.stubEnv("NEXT_PUBLIC_TENANT_ID", "nawy");
    const fetchMock = stubFetch(() => jsonResponse(envelope(branding)));

    await fetchBranding();
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ "X-Tenant-Id": "nawy" });
  });

  it("does not send an empty tenant header", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const fetchMock = stubFetch(() => jsonResponse(envelope(branding)));

    await fetchBranding();
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty("X-Tenant-Id");
  });
});

describe("failure mapping", () => {
  it("maps transport statuses onto error kinds", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    const cases: [number, string][] = [
      [401, "unauthorized"],
      [404, "notFound"],
      [409, "conflict"],
      [422, "validation"],
      [429, "rateLimited"],
      [500, "server"],
      [418, "validation"],
    ];

    for (const [status, kind] of cases) {
      stubFetch(() => jsonResponse(envelope(null, { statusCode: status }), { status }));
      await expect(fetchBranding()).rejects.toMatchObject({ kind, status });
    }
  });

  it("keeps the field errors from the envelope", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() =>
      jsonResponse(envelope(null, { statusCode: 422, isSuccess: false, errors: { phoneNumber: "Invalid." } }), {
        status: 422,
      }),
    );

    const cause = await requestOtp({ phoneNumber: "+201012345678" }).catch((error: unknown) => error);
    expect(cause).toBeInstanceOf(ApiError);
    expect((cause as ApiError).fields).toEqual({ phoneNumber: "Invalid." });
  });

  it("trusts the envelope status when the transport said 200", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => jsonResponse(envelope(null, { statusCode: 429, isSuccess: false })));

    await expect(fetchBranding()).rejects.toMatchObject({ kind: "rateLimited", status: 429 });
  });

  it("treats a null data payload as a failure", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => jsonResponse(envelope(null, { isSuccess: true })));
    await expect(fetchBranding()).rejects.toMatchObject({ kind: "validation" });
  });

  it("rejects a body that is not JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => new Response("<html>nope</html>", { status: 200 }));
    await expect(fetchBranding()).rejects.toMatchObject({ kind: "envelope" });
  });

  it("reports a network rejection as offline", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(fetchBranding()).rejects.toMatchObject({ kind: "offline", status: 0 });
  });

  it("reports an aborted request as a timeout", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
            });
          }),
      ),
    );

    const pending = fetchBranding();
    const settled = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(12_000);
    await expect(settled).resolves.toMatchObject({ kind: "timeout" });
    vi.useRealTimers();
  });
});

describe("apiErrorMessageKey", () => {
  const keyFor = (error: unknown) => apiErrorMessageKey(error);

  it("prefers the field message the backend sent", () => {
    expect(keyFor(new ApiError("validation", 422, { phoneNumber: "x" }))).toBe("رقم الموبايل غير صحيح");
    expect(keyFor(new ApiError("validation", 422, { code: "x" }))).toBe("الكود غير صحيح، جرب تاني");
    expect(keyFor(new ApiError("validation", 422, { fullName: "x" }))).toBe("اكتب اسمك بالكامل");
    expect(keyFor(new ApiError("validation", 422, { challengeId: "x" }))).toBe("انتهت صلاحية الكود، اطلب كود جديد");
    expect(keyFor(new ApiError("validation", 422, { refreshToken: "x" }))).toBe("انتهت الجلسة، سجّل الدخول تاني");
  });

  it("falls back to the kind message for unknown fields", () => {
    expect(keyFor(new ApiError("validation", 422, { mystery: "x" }))).toBe("بيانات الطلب غير صحيحة");
    expect(keyFor(new ApiError("offline", 0))).toBe("مفيش اتصال بالإنترنت، جرب تاني");
    expect(keyFor(new ApiError("timeout", 0))).toBe("السيرفر بياخد وقت طويل، جرب تاني");
    expect(keyFor(new ApiError("conflict", 409))).toBe("الكود ده اتستخدم خلاص، اطلب كود جديد");
    expect(keyFor(new ApiError("envelope", 200))).toBe("رد السيرفر مش مفهوم، جرب تاني");
  });

  it("never leaks an unexpected exception message to the customer", () => {
    expect(keyFor(new Error("connection string leaked"))).toBe("حصل مشكلة في السيرفر، جرب تاني");
    expect(keyFor(null)).toBe("حصل مشكلة في السيرفر، جرب تاني");
  });
});
