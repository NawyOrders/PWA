import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, type CustomerSessionPayload, type RequestOtpData } from "@/lib/api";
import { MOCK_TEST_PHONES, authMock } from "@/lib/auth-mock";

/** An ordinary Egyptian number: the simulator treats it as a brand-new account. */
const RETURNING_PHONE = "+201012345678";
const NEW_PHONE = "+201177778899";
const NOW_ISO = "2026-11-05T10:00:00.000Z";

/**
 * The simulator stands in for a Development tenant, which does expose the code,
 * so a test drives the flow with exactly what the customer would have read from
 * the SMS — never by reaching into the module's state.
 */
function codeOf(challenge: RequestOtpData): string {
  expect(challenge.devOtpCode).toMatch(/^\d{6}$/);
  return challenge.devOtpCode ?? "000000";
}

/** Every documented failure is one AppError, so assertions stay on its fields. */
async function failureOf(promise: Promise<unknown>): Promise<AppError> {
  const cause = await promise.then(() => null).catch((error: unknown) => error);
  expect(cause, "the call was expected to fail").toBeInstanceOf(AppError);
  if (!(cause instanceof AppError)) throw new Error("unreachable");
  return cause;
}

/** The token the jar holds, with the type the assertion above already proved. */
function jarToken(): string {
  const value = authMock.peekCookie();
  expect(value).toBeTypeOf("string");
  return value ?? "";
}

/** A challenge asked for the way a screen would ask: new customers register. */
function ask(phone: string, purpose: "Login" | "Registration" = "Registration"): Promise<RequestOtpData> {
  return authMock.requestOtp({ phoneNumber: phone, purpose });
}

/** The flow a real customer runs: ask for a code, spend it, get a session. */
async function signIn(options: {
  phone?: string;
  purpose?: "Login" | "Registration";
  fullName?: string;
} = {}): Promise<{ challenge: RequestOtpData; session: CustomerSessionPayload }> {
  const phone = options.phone ?? NEW_PHONE;
  const purpose = options.purpose ?? "Registration";
  const challenge = await ask(phone, purpose);
  const session = await authMock.verifyOtp({
    challengeId: challenge.challengeId,
    code: codeOf(challenge),
    fullName: options.fullName ?? "Nawy Guest",
    purpose,
  });
  return { challenge, session };
}

/** Locks the clock so expiry, cooldowns and token lifetimes are assertable. */
function freezeClock(): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW_ISO));
}

beforeEach(() => {
  // The jar, the "database" and both rate-limit ledgers live in module state,
  // and this module is not re-imported per file — so every test starts clean.
  authMock.reset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("AUTH_MOCK", "");
  vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "");
});

describe("authMock.requestOtp — the challenge step", () => {
  it("issues a six-digit code that lives exactly the documented five minutes", async () => {
    freezeClock();
    const challenge = await authMock.requestOtp({ phoneNumber: RETURNING_PHONE });

    expect(challenge.challengeId).toMatch(/^chal-mock-/);
    expect(challenge.expiresInSeconds).toBe(300);
    expect(challenge.expiresAtUtc).toBe("2026-11-05T10:05:00.000Z");
    expect(String(challenge.devOtpCode)).toMatch(/^\d{6}$/);
  });

  it("asks a fresh challenge per request, so an old code can never become a master key", async () => {
    const first = await authMock.requestOtp({ phoneNumber: RETURNING_PHONE });
    const second = await authMock.requestOtp({ phoneNumber: RETURNING_PHONE });
    expect(second.challengeId).not.toBe(first.challengeId);
  });

  it("normalises the number the way the API does, so a locally typed phone is the same account", async () => {
    await signIn({ phone: RETURNING_PHONE });

    // The same customer typed it the way the screen collects it.
    const challenge = await authMock.requestOtp({ phoneNumber: "01012345678", purpose: "Login" });
    const session = await authMock.verifyOtp({ challengeId: challenge.challengeId, code: codeOf(challenge) });

    expect(session.phoneNumber).toBe(RETURNING_PHONE);
  });

  it("refuses a purpose outside the three the contract defines", async () => {
    const error = await failureOf(authMock.requestOtp({ phoneNumber: RETURNING_PHONE, purpose: "DeleteAccount" }));
    expect(error).toMatchObject({ status: 422, code: "Auth.InvalidPurpose", kind: "validation" });
  });

  it("refuses a channel the SMS gateway cannot carry", async () => {
    const error = await failureOf(authMock.requestOtp({ phoneNumber: RETURNING_PHONE, channel: "carrier-pigeon" }));
    expect(error).toMatchObject({ status: 422, code: "Auth.InvalidChannel", kind: "validation" });
  });

  it("refuses a number too short to be a phone, and the empty string sent before typing", async () => {
    for (const phoneNumber of ["123", "", "   ", "abcdefgh"]) {
      const error = await failureOf(authMock.requestOtp({ phoneNumber }));
      expect(error).toMatchObject({ status: 422, code: "Customer.InvalidPhoneNumber" });
    }
  });

  it("does not charge a phone's quota for requests it refused on validation", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await failureOf(authMock.requestOtp({ phoneNumber: RETURNING_PHONE, purpose: "Nonsense" }));
    }

    // Five real requests still fit inside the rolling window.
    for (let attempt = 0; attempt < authMock.limits.perPhone; attempt += 1) {
      await expect(authMock.requestOtp({ phoneNumber: RETURNING_PHONE })).resolves.toMatchObject({
        challengeId: expect.any(String),
      });
    }
  });
});

describe("authMock.verifyOtp — spending the code", () => {
  it("signs the customer in with the documented session and no refresh token in it", async () => {
    freezeClock();
    const { session } = await signIn({ fullName: "Salma Hassan" });

    expect(session).toMatchObject({
      phoneNumber: NEW_PHONE,
      fullName: "Salma Hassan",
      email: null,
      tokenType: "Bearer",
      expiresIn: 3600,
      expiresAtUtc: "2026-11-05T11:00:00.000Z",
    });
    expect(session.customerId).toMatch(/^cus-mock-/);
    expect(session.accessToken).toBeTruthy();
    // The token boundary the BFF enforces in production: the page never sees it.
    expect(session).not.toHaveProperty("refreshToken");
    expect(jarToken()).not.toBe(session.accessToken);
  });

  it("keeps the challenge alive through four wrong codes, then still accepts the right one", async () => {
    const challenge = await ask(NEW_PHONE);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const error = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: "000001" }));
      expect(error).toMatchObject({ status: 422, code: "Customer.InvalidOtpCode", kind: "validation" });
    }

    await expect(authMock.verifyOtp({ challengeId: challenge.challengeId, code: codeOf(challenge) })).resolves.toMatchObject({
      phoneNumber: NEW_PHONE,
    });
  });

  it("kills the challenge on the fifth wrong code and refuses even the right one afterwards", async () => {
    const challenge = await ask(NEW_PHONE);
    const correct = codeOf(challenge);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: "999999" }));
    }

    const exhausted = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: "999999" }));
    expect(exhausted).toMatchObject({ status: 409, code: "Customer.OtpMaxAttemptsExceeded", kind: "conflict" });

    // The sixth attempt fails the same way whatever it carries: the attempt gate
    // is checked before the code, so a slow customer is not silently re-admitted.
    const afterDeath = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: correct }));
    expect(afterDeath).toMatchObject({ status: 409, code: "Customer.OtpMaxAttemptsExceeded" });
  });

  it("accepts the code a customer pasted with spaces around it", async () => {
    const challenge = await ask(NEW_PHONE);
    await expect(
      authMock.verifyOtp({ challengeId: challenge.challengeId, code: `  ${codeOf(challenge)}  ` }),
    ).resolves.toMatchObject({ phoneNumber: NEW_PHONE });
  });

  it("refuses an expired challenge, and still admits the customer one second before that", async () => {
    freezeClock();
    const alive = await ask(NEW_PHONE);
    vi.advanceTimersByTime(299_999);
    await expect(authMock.verifyOtp({ challengeId: alive.challengeId, code: codeOf(alive) })).resolves.toBeTruthy();

    const dead = await ask(NEW_PHONE);
    vi.advanceTimersByTime(300_001);
    const error = await failureOf(authMock.verifyOtp({ challengeId: dead.challengeId, code: codeOf(dead) }));
    expect(error).toMatchObject({ status: 422, code: "Customer.OtpExpired", kind: "validation" });
  });

  it("refuses a challenge it never issued instead of inventing a customer", async () => {
    const error = await failureOf(authMock.verifyOtp({ challengeId: "chal-mock-does-not-exist", code: "123456" }));
    expect(error).toMatchObject({ status: 404, code: "Customer.ChallengeNotFound", kind: "notFound" });
  });

  it("burns the code: a second verify of the same challenge is a conflict, not a re-login", async () => {
    const { challenge } = await signIn();
    const error = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: codeOf(challenge) }));
    expect(error).toMatchObject({ status: 409, code: "Customer.OtpAlreadyUsed", kind: "conflict" });
  });

  it("counts a blank submit as a wrong code rather than letting it pass", async () => {
    const challenge = await ask(NEW_PHONE);
    const error = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: "" }));
    expect(error).toMatchObject({ status: 422, code: "Customer.InvalidOtpCode" });
  });
});

describe("authMock.verifyOtp — who the phone number belongs to", () => {
  it("tells a login for an unknown number to register instead, with the code the screens map", async () => {
    const challenge = await ask(MOCK_TEST_PHONES.unknown, "Login");
    const error = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: codeOf(challenge) }));
    expect(error).toMatchObject({ status: 404, code: "Customer.NotFoundByPhone", kind: "notFound" });
  });

  it("creates the account when the same unknown number arrives as a registration, carrying the name", async () => {
    const { session } = await signIn({ phone: MOCK_TEST_PHONES.unknown, fullName: "Salma Hassan" });
    expect(session).toMatchObject({ phoneNumber: MOCK_TEST_PHONES.unknown, fullName: "Salma Hassan" });

    // Registration really persisted: the same number can now log in.
    const login = await signIn({ phone: MOCK_TEST_PHONES.unknown, purpose: "Login" });
    expect(login.session.fullName).toBe("Salma Hassan");
  });

  it("fills an empty name on a returning account but never overwrites one the customer chose", async () => {
    expect((await signIn({ phone: NEW_PHONE, fullName: "" })).session.fullName).toBe("");
    expect((await signIn({ phone: NEW_PHONE, fullName: "Salma Hassan" })).session.fullName).toBe("Salma Hassan");
    expect((await signIn({ phone: NEW_PHONE, fullName: "Someone Else" })).session.fullName).toBe("Salma Hassan");
  });

  it("trims the name it stores and cuts it at the 200 characters the column holds", async () => {
    expect((await signIn({ phone: NEW_PHONE, fullName: "  Salma Hassan  " })).session.fullName).toBe("Salma Hassan");
    expect((await signIn({ phone: MOCK_TEST_PHONES.newCustomer, fullName: `${"N".repeat(100)} ${"a".repeat(150)}` })).session.fullName).toHaveLength(
      200,
    );
  });

  it("sends the code for a blocked number but refuses it at verify, whichever purpose it presents", async () => {
    const login = await failureOf(signIn({ phone: MOCK_TEST_PHONES.blocked, purpose: "Login" }));
    expect(login).toMatchObject({ status: 409, code: "Customer.Blocked", kind: "conflict" });

    // Registration cannot launder a blocked account: the state is never rewritten.
    const asNew = await failureOf(signIn({ phone: MOCK_TEST_PHONES.blocked, purpose: "Registration" }));
    expect(asNew).toMatchObject({ status: 409, code: "Customer.Blocked" });
  });

  it("refuses a deactivated account with its own code, so the screen can offer support", async () => {
    const error = await failureOf(signIn({ phone: MOCK_TEST_PHONES.inactive, purpose: "Login" }));
    expect(error).toMatchObject({ status: 409, code: "Customer.Inactive", kind: "conflict" });
  });
});

describe("authMock rate limits", () => {
  it("allows five requests per phone in a rolling three minutes and then says when to come back", async () => {
    freezeClock();
    for (let attempt = 0; attempt < authMock.limits.perPhone; attempt += 1) {
      await expect(authMock.requestOtp({ phoneNumber: RETURNING_PHONE })).resolves.toBeTruthy();
    }

    const error = await failureOf(authMock.requestOtp({ phoneNumber: RETURNING_PHONE }));
    expect(error).toMatchObject({
      status: 429,
      code: "Auth.OtpRateLimitExceeded",
      kind: "rateLimited",
      retryAfterSeconds: 180,
    });

    // Rolling, not fixed: once the oldest request leaves the window the phone can
    // ask again.
    vi.advanceTimersByTime(180_001);
    await expect(authMock.requestOtp({ phoneNumber: RETURNING_PHONE })).resolves.toBeTruthy();
  });

  it("shrinks the promised wait as the cooldown runs down", async () => {
    freezeClock();
    for (let attempt = 0; attempt < authMock.limits.perPhone; attempt += 1) {
      await authMock.requestOtp({ phoneNumber: RETURNING_PHONE });
    }

    vi.advanceTimersByTime(60_000);
    const error = await failureOf(authMock.requestOtp({ phoneNumber: RETURNING_PHONE }));
    expect(error.retryAfterSeconds).toBe(120);
  });

  it("throttles the whole deployment at 100 a minute with no Retry-After, because the server did not say", async () => {
    for (let attempt = 0; attempt < authMock.limits.globalPerMinute; attempt += 1) {
      await authMock.requestOtp({ phoneNumber: `+20100000${String(attempt).padStart(4, "0")}` });
    }

    const error = await failureOf(authMock.requestOtp({ phoneNumber: "+201000009999" }));
    expect(error).toMatchObject({ status: 429, code: "RateLimit.Exceeded", kind: "rateLimited" });
    // A made-up countdown would be worse than the default backoff the client uses.
    expect(error.retryAfterSeconds).toBeNull();
  });

  it("keeps the per-phone ledger against the number, not the string typed", async () => {
    freezeClock();
    for (let attempt = 0; attempt < authMock.limits.perPhone; attempt += 1) {
      await authMock.requestOtp({ phoneNumber: "01012345678" });
    }

    // The international form of the same phone hits the same ledger.
    const error = await failureOf(authMock.requestOtp({ phoneNumber: "+201012345678" }));
    expect(error).toMatchObject({ status: 429, code: "Auth.OtpRateLimitExceeded" });
  });
});

describe("authMock refresh rotation", () => {
  it("rotates the pair and keeps the new token in the jar only", async () => {
    freezeClock();
    await signIn();
    const presented = jarToken();

    const pair = await authMock.refreshSession();

    expect(pair).toMatchObject({ tokenType: "Bearer", expiresIn: 3600, accessToken: expect.any(String) });
    expect(pair).not.toHaveProperty("refreshToken");
    expect(pair.refreshTokenExpiresAtUtc).toBe("2026-11-19T10:00:00.000Z");
    expect(jarToken()).not.toBe(presented);
    expect(jarToken()).not.toBe(pair.accessToken);
  });

  it("refuses to refresh when the browser presents no cookie", async () => {
    expect(authMock.peekCookie()).toBeNull();
    const error = await failureOf(authMock.refreshSession());
    expect(error).toMatchObject({ status: 401, code: "RefreshToken.Invalid", kind: "unauthorized" });
  });

  it("refuses a cookie value it never issued", async () => {
    authMock.pokeCookie("someone-elses-token");
    const error = await failureOf(authMock.refreshSession());
    expect(error).toMatchObject({ status: 401, code: "RefreshToken.Invalid" });
  });

  it("treats replaying a rotated token as theft, says so, and cuts the browser's jar off", async () => {
    await signIn();
    const stolen = jarToken();
    await authMock.refreshSession();
    const current = jarToken();
    expect(current).not.toBe(stolen);

    authMock.pokeCookie(stolen);
    const reused = await failureOf(authMock.refreshSession());
    expect(reused).toMatchObject({ status: 401, code: "RefreshToken.CompromisedReuse", kind: "unauthorized" });

    // Nothing is left in the jar, so the signed-in tab has to log in again...
    expect(authMock.peekCookie()).toBeNull();
    const loggedOut = await failureOf(authMock.refreshSession());
    expect(loggedOut).toMatchObject({ status: 401, code: "RefreshToken.Invalid" });

    // ...and the stolen copy stays dead on every later attempt.
    authMock.pokeCookie(stolen);
    const spent = await failureOf(authMock.refreshSession());
    expect(spent).toMatchObject({ status: 401, code: "RefreshToken.Revoked" });
  });

  it("revokes the whole lineage on reuse, the successor token included", async () => {
    await signIn();
    const stolen = jarToken();
    await authMock.refreshSession();
    const successor = jarToken();

    authMock.pokeCookie(stolen);
    await failureOf(authMock.refreshSession());

    // Rotation stays in the family, so the theft reaches the token the honest
    // tab is now holding: it no longer refreshes.
    authMock.pokeCookie(successor);
    const family = await failureOf(authMock.refreshSession());
    expect(family).toMatchObject({ status: 401, code: "RefreshToken.Revoked" });
  });

  it("expires a refresh token after its documented fourteen days", async () => {
    freezeClock();
    await signIn();
    vi.advanceTimersByTime(14 * 86_400_000 + 1_000);

    const error = await failureOf(authMock.refreshSession());
    expect(error).toMatchObject({ status: 401, code: "RefreshToken.Expired", kind: "unauthorized" });
  });

  it("answers a refresh of a revoked but never replayed token as revoked, not invalid", async () => {
    await signIn();
    const token = jarToken();
    await authMock.revokeSession();

    authMock.pokeCookie(token);
    const error = await failureOf(authMock.refreshSession());
    expect(error).toMatchObject({ status: 401, code: "RefreshToken.Revoked" });
  });

  it("revokes the token the jar holds and forgets it, so logout really is logout", async () => {
    const { challenge } = await signIn();
    await expect(authMock.revokeSession()).resolves.toBeUndefined();
    expect(authMock.peekCookie()).toBeNull();

    const refresh = await failureOf(authMock.refreshSession());
    expect(refresh).toMatchObject({ status: 401, code: "RefreshToken.Invalid" });

    // And the spent challenge cannot sign the customer back in either.
    const replay = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: codeOf(challenge) }));
    expect(replay).toMatchObject({ status: 409, code: "Customer.OtpAlreadyUsed" });
  });

  it("answers a revoke of an already revoked token with the conflict the contract documents", async () => {
    await signIn();
    const token = jarToken();
    await authMock.revokeSession();

    authMock.pokeCookie(token);
    const error = await failureOf(authMock.revokeSession());
    expect(error).toMatchObject({ status: 409, code: "RefreshToken.AlreadyRevoked", kind: "conflict" });
  });

  it("treats revoking nothing as the success it already is", async () => {
    await expect(authMock.revokeSession()).resolves.toBeUndefined();
    expect(authMock.peekCookie()).toBeNull();
  });

  it("drops a cookie whose token the store has forgotten rather than throwing at logout", async () => {
    authMock.pokeCookie("not-in-the-database");
    await expect(authMock.revokeSession()).resolves.toBeUndefined();
    expect(authMock.peekCookie()).toBeNull();
  });
});

describe("authMock.reset — the reason every test starts clean", () => {
  it("clears the jar, the ledgers and the challenge store so module state cannot leak", async () => {
    const { challenge } = await signIn();
    expect(jarToken()).toBeTruthy();
    for (let attempt = 0; attempt < authMock.limits.perPhone; attempt += 1) {
      await authMock.requestOtp({ phoneNumber: RETURNING_PHONE });
    }
    await failureOf(authMock.requestOtp({ phoneNumber: RETURNING_PHONE }));

    authMock.reset();

    expect(authMock.peekCookie()).toBeNull();
    // The quota is gone...
    await expect(authMock.requestOtp({ phoneNumber: RETURNING_PHONE })).resolves.toBeTruthy();
    // ...and so is the challenge store. The id below is deliberately foreign
    // rather than `challenge.challengeId`: `reset()` rewinds the id sequence, so
    // a pre-reset id can be handed to a post-reset challenge by coincidence.
    expect(challenge.challengeId).toMatch(/^chal-mock-/);
    const error = await failureOf(authMock.verifyOtp({ challengeId: "chal-mock-never-issued", code: "123456" }));
    expect(error).toMatchObject({ status: 404, code: "Customer.ChallengeNotFound" });
  });

  it("re-seeds the reserved numbers, since they stand for accounts that already exist", async () => {
    authMock.reset();
    const blocked = await failureOf(signIn({ phone: MOCK_TEST_PHONES.blocked, purpose: "Login" }));
    expect(blocked.code).toBe("Customer.Blocked");

    const inactive = await failureOf(signIn({ phone: MOCK_TEST_PHONES.inactive, purpose: "Login" }));
    expect(inactive.code).toBe("Customer.Inactive");
  });

  it("publishes the limits it mirrors, so a test reads them instead of hard-coding twice", () => {
    expect(authMock.limits).toEqual({
      otpLifetimeSeconds: 300,
      maxAttempts: 5,
      perPhone: 5,
      phoneWindowMs: 180_000,
      globalPerMinute: 100,
      accessTokenSeconds: 3600,
    });
  });
});

describe("authMock cannot be reached from a production build", () => {
  /*
   * `authTransport()` will not pick the simulator when NODE_ENV is production,
   * and the bundler drops this module from that graph. Both of those are build
   * properties. This is the code that says it out loud, so a stray import or a
   * hand-written fetch answers like an unreachable endpoint instead of minting
   * a session nobody issued.
   */
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  it("refuses every one of the four calls with a server error, before it reads a phone number", async () => {
    const calls: Array<Promise<unknown>> = [
      authMock.requestOtp({ phoneNumber: NEW_PHONE }),
      authMock.verifyOtp({ challengeId: "chal-1", code: "123456" }),
      authMock.refreshSession(),
      authMock.revokeSession(),
    ];

    for (const call of calls) {
      const error = await failureOf(call);
      expect(error).toMatchObject({ status: 500, kind: "server" });
      expect(error.code, "a refusal invented by the app has no tenant error code").toBeNull();
    }
  });

  it("issues no challenge under production, so the code cannot be replayed after the guard lifts", async () => {
    const challengeId = await authMock
      .requestOtp({ phoneNumber: NEW_PHONE })
      .then((data) => data.challengeId)
      .catch(() => "never-issued");
    expect(challengeId).toBe("never-issued");

    vi.stubEnv("NODE_ENV", "test");
    const error = await failureOf(authMock.verifyOtp({ challengeId: "chal-1", code: "123456" }));
    expect(error.code).toBe("Customer.ChallengeNotFound");
  });

  it("mints no session and leaves the jar empty, so nothing survives the guard lifting", async () => {
    await failureOf(signIn({ phone: NEW_PHONE }));
    expect(authMock.peekCookie()).toBeNull();

    // The refused registration created no customer either — the same number
    // arriving as a login after the guard lifts is still an unknown account.
    vi.stubEnv("NODE_ENV", "test");
    const challenge = await authMock.requestOtp({ phoneNumber: NEW_PHONE, purpose: "Login" });
    const error = await failureOf(authMock.verifyOtp({ challengeId: challenge.challengeId, code: codeOf(challenge) }));
    expect(error.code).toBe("Customer.NotFoundByPhone");
  });
});

describe("authMock without a cryptographic source", () => {
  it("refuses to issue a code rather than falling back to a guessable one", async () => {
    vi.stubGlobal("crypto", undefined);

    const error = await failureOf(authMock.requestOtp({ phoneNumber: NEW_PHONE }));
    expect(error).toMatchObject({ status: 500, kind: "server" });
  });

  it("leaves no challenge behind that a later request could reuse", async () => {
    vi.stubGlobal("crypto", undefined);
    await failureOf(authMock.requestOtp({ phoneNumber: NEW_PHONE }));
    vi.unstubAllGlobals();

    // Nothing was stored, so the identifier a successful call would have
    // returned is unknown to the simulator — which is the only safe answer.
    const error = await failureOf(authMock.verifyOtp({ challengeId: "chal-1", code: "123456" }));
    expect(error.code).toBe("Customer.ChallengeNotFound");
  });

  it("draws a different code for every challenge it does issue", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 25; i += 1) {
      codes.add((await ask(NEW_PHONE)).devOtpCode ?? "");
      authMock.reset();
    }
    expect(codes.size).toBe(25);
    expect(codes.has("000000")).toBe(false);
  });
});
