/**
 * `AUTH_MOCK=true` — the tenant API contract, answered locally.
 *
 * The deployed Tenant API cannot complete this flow yet (every MediatR request
 * dies in dependency injection before reaching a handler), so the login screens
 * are built and tested against this module instead: it replays the documented
 * envelope, the documented codes, the documented rate limits and the documented
 * rotation rules, including the ones nobody can trigger on demand against a
 * real backend.
 *
 * It is unreachable from a production build by construction. `authTransport()`
 * in `src/lib/api.ts` only selects it while `process.env.NODE_ENV` is not
 * `production`, and that test is inlined at build time, so the bundler drops
 * this module from the production graph entirely. `assertMockAllowed()` below
 * repeats the same test inside every call that mints a credential, so a build
 * that somehow still reaches this code answers with a server error rather than
 * with a token nobody issued.
 *
 * What it mirrors, and what it deliberately does not
 * --------------------------------------------------
 * The browser never talks to the raw API for a credential: verify, refresh and
 * revoke go through the BFF, which keeps the refresh token in an httpOnly
 * cookie and strips it from the body. So the mock does the same — its `verify`
 * and `refresh` answers carry no `refreshToken`, and the token it "stores" is
 * the `cookie` field below. Testing against the mock exercises the same token
 * boundary as production.
 *
 * Timing is `Date.now()` throughout, so fake timers drive expiry, the rolling
 * rate-limit window and the 3600-second access token exactly the way the real
 * service does.
 */

import {
  AppError,
  OTP_LIFETIME_SECONDS,
  REFRESH_TOKEN_LIFETIME_DAYS,
  normalizeEgyptianPhone,
  type AppErrorKind,
  type AuthErrorCode,
} from "@/lib/api";
import { OTP_LENGTH, generateOtpCode } from "@/lib/otp";
import { clearLocalCustomers, localCustomer, rememberLocalCustomer } from "@/lib/local-customers";
import type { CustomerSessionPayload, OtpPurpose, RequestOtpData, TokenPair } from "@/lib/api";

const ACCESS_TOKEN_SECONDS = 3600;
/**
 * Both lifetimes come from the contract module rather than being written out
 * again here: a simulator whose refresh token outlives the cookie that stores
 * it — or whose code lifetime differs from the countdown the screen shows — is
 * testing a system the real deployment is not.
 */
const REFRESH_TOKEN_DAYS = REFRESH_TOKEN_LIFETIME_DAYS;
const OTP_MAX_ATTEMPTS = 5;
/** Per phone: 5 requests in a rolling 3 minutes, then a 3-minute cooldown. */
const PHONE_REQUEST_LIMIT = 5;
const PHONE_WINDOW_MS = 180_000;
const PHONE_COOLDOWN_SECONDS = 180;
/** `OtpEndpoints`: 100 requests a minute across the whole deployment. */
const GLOBAL_REQUEST_LIMIT = 100;
const GLOBAL_WINDOW_MS = 60_000;

/**
 * Phones that make the mock answer with a documented failure instead of a
 * normal login. Numbers in the unassigned `+20 999 …` range, so none of them
 * can be a real customer.
 */
export const MOCK_TEST_PHONES = {
  /** No account: `404 Customer.NotFoundByPhone` when purpose is `Login`. */
  unknown: "+209999999911",
  /** `409 Customer.Blocked`. */
  blocked: "+209999999912",
  /** `409 Customer.Inactive`. */
  inactive: "+209999999913",
  /** A fresh number that registers on the first verify. */
  newCustomer: "+209999999914",
} as const;

type MockCustomer = {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  state: "active" | "blocked" | "inactive";
};

type MockChallenge = {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  code: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
};

type MockToken = {
  value: string;
  customerId: string;
  family: string;
  expiresAt: number;
  used: boolean;
  revoked: boolean;
};

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  // Shaped like the API's GUIDs so nothing downstream learns to expect a
  // shorter, test-only identifier.
  return `${prefix}-mock-${sequence.toString(36).padStart(4, "0")}`;
}

/** The simulated database, the cookie jar and the two rate-limit ledgers. */
const state = {
  /** Keyed by the digits of the E.164 number, which is how the API keys it. */
  customers: new Map<string, MockCustomer>(),
  challenges: new Map<string, MockChallenge>(),
  tokens: new Map<string, MockToken>(),
  /** Refresh token families invalidated because a rotated token was replayed. */
  revokedFamilies: new Set<string>(),
  requestsByPhone: new Map<string, number[]>(),
  requestsGlobal: [] as number[],
  /** Stand-in for the httpOnly cookie: only `refreshSession` reads it. */
  cookie: null as string | null,
};

function customerKey(phone: string): string {
  return phone.replace("+", "");
}

/**
 * Two of the reserved numbers stand for accounts that exist but may not sign
 * in, so they have to be in the store before the first verify looks them up.
 */
function seedReservedCustomers(): void {
  state.customers.set(customerKey(MOCK_TEST_PHONES.blocked), {
    id: nextId("cus"),
    phone: MOCK_TEST_PHONES.blocked,
    fullName: "Blocked Customer",
    email: null,
    state: "blocked",
  });
  state.customers.set(customerKey(MOCK_TEST_PHONES.inactive), {
    id: nextId("cus"),
    phone: MOCK_TEST_PHONES.inactive,
    fullName: "Inactive Customer",
    email: null,
    state: "inactive",
  });
}

function reset(): void {
  sequence = 0;
  state.customers.clear();
  state.challenges.clear();
  state.tokens.clear();
  state.revokedFamilies.clear();
  state.requestsByPhone.clear();
  state.requestsGlobal = [];
  state.cookie = null;
  // The durable customer row is part of the simulated database: a reset that
  // left it behind would let one test's registration answer the next test's
  // login, and would leave a developer's device remembering a stranger.
  clearLocalCustomers();
  seedReservedCustomers();
}

/**
 * The second lock on the door.
 *
 * `authTransport()` refuses to select the simulator in a production build, and
 * the bundler drops this module out of the production graph. That is a build
 * property, so it is worth restating as code: a call that does arrive here from
 * a production bundle — a stray import, a hand-written fetch, an env var set in
 * the wrong place — answers the way an unreachable endpoint answers rather than
 * minting a token nobody issued.
 */
function assertMockAllowed(): void {
  if (process.env.NODE_ENV === "production") throw new AppError({ kind: "server", status: 500 });
}

function kindForStatus(status: number): AppErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 429) return "rateLimited";
  if (status >= 500) return "server";
  return "validation";
}

function fail(
  status: number,
  code: AuthErrorCode,
  message: string,
  extra: { retryAfterSeconds?: number | null } = {},
): never {
  // The API's own English text is kept beside the code the way the real
  // envelope keeps it — it is what a developer reading a failure expects to
  // find, and it is never rendered: the screens map the code through the
  // catalog in src/lib/api.ts.
  throw new AppError({
    kind: kindForStatus(status),
    status,
    code,
    fieldErrors: { [code]: message },
    retryAfterSeconds: extra.retryAfterSeconds ?? null,
  });
}

function enforceRateLimits(phone: string, now: number): void {
  const global = state.requestsGlobal.filter((at) => now - at < GLOBAL_WINDOW_MS);
  state.requestsGlobal = global;
  if (global.length >= GLOBAL_REQUEST_LIMIT) {
    // The policy limiter's answer carries no Retry-After, which the client has
    // to survive with a default backoff rather than an instant retry.
    fail(429, "RateLimit.Exceeded", "API rate limit exceeded. Maximum 100 requests per minute allowed.", {
      retryAfterSeconds: null,
    });
  }

  const recent = (state.requestsByPhone.get(phone) ?? []).filter((at) => now - at < PHONE_WINDOW_MS);
  state.requestsByPhone.set(phone, recent);
  if (recent.length >= PHONE_REQUEST_LIMIT) {
    const cooldownLeft = Math.ceil((recent[0] + PHONE_COOLDOWN_SECONDS * 1000 - now) / 1000);
    fail(429, "Auth.OtpRateLimitExceeded", "Too many OTP requests for this phone number.", {
      retryAfterSeconds: Math.max(1, cooldownLeft),
    });
  }

  recent.push(now);
  state.requestsGlobal.push(now);
}

function findCustomer(phone: string): MockCustomer | null {
  const known = state.customers.get(customerKey(phone));
  if (known) return known;
  // A registration from an earlier page load is still this customer: the local
  // table is the simulator's durable row, so logging in after a reload answers
  // with the name the customer registered instead of demanding a new account.
  const stored = localCustomer(phone);
  if (!stored) return null;
  const restored: MockCustomer = {
    id: stored.id,
    phone,
    fullName: stored.fullName,
    email: null,
    state: "active",
  };
  state.customers.set(customerKey(phone), restored);
  return restored;
}

function upsertCustomer(phone: string, fullName: string): MockCustomer {
  const key = customerKey(phone);
  const existing = state.customers.get(key);
  if (existing) {
    // Registration against a returning customer fills an empty name, which is
    // what the guide says the API does — it never overwrites one.
    if (!existing.fullName && fullName) {
      existing.fullName = fullName;
      rememberLocalCustomer(phone, existing.fullName, existing.id);
    }
    return existing;
  }
  const created: MockCustomer = { id: nextId("cus"), phone, fullName, email: null, state: "active" };
  state.customers.set(key, created);
  rememberLocalCustomer(phone, created.fullName, created.id);
  return created;
}

/** Only reachable if a token outlived its customer; keeps rotation honest. */
function customerById(id: string): MockCustomer {
  const found = [...state.customers.values()].find((customer) => customer.id === id);
  if (found) return found;
  const orphan: MockCustomer = {
    id,
    phone: MOCK_TEST_PHONES.newCustomer,
    fullName: "Mock Customer",
    email: null,
    state: "active",
  };
  state.customers.set(customerKey(orphan.phone), orphan);
  return orphan;
}

/**
 * Mints a refresh token and puts it in the simulated jar.
 *
 * `family` is the lineage, not the token: a brand-new session starts one, and
 * every rotation of that session stays inside it. That is the only way reuse
 * detection can mean anything — revoking "the whole family" has to reach the
 * successor token too, or a stolen token and the legitimate one live side by
 * side and the customer is never signed out.
 */
function issueTokens(customer: MockCustomer, now: number, family?: string): MockToken {
  const token: MockToken = {
    value: `${customer.id}.${nextId("rt")}`,
    customerId: customer.id,
    family: family ?? nextId("fam"),
    expiresAt: now + REFRESH_TOKEN_DAYS * 86_400_000,
    used: false,
    revoked: false,
  };
  state.tokens.set(token.value, token);
  state.cookie = token.value;
  return token;
}

function accessTokenFor(customer: MockCustomer): string {
  // Not a JWT — and that is fine, because nothing in the app decodes it. It is
  // opaque for exactly the same reason the real one is treated as opaque.
  return `mock.${customer.id}.${nextId("jwt")}`;
}

/* -------------------------------------------------------------------------- */

async function requestOtp(options: {
  phoneNumber: string;
  channel?: string;
  purpose?: string;
}): Promise<RequestOtpData> {
  assertMockAllowed();
  const now = Date.now();
  const phone = normalizeEgyptianPhone(options.phoneNumber ?? "");
  const digits = phone.replace(/[^\d]/g, "");

  const purpose = (options.purpose ?? "Login").toLowerCase();
  if (purpose !== "login" && purpose !== "registration" && purpose !== "phoneverification") {
    fail(422, "Auth.InvalidPurpose", "Purpose must be Login, Registration or PhoneVerification.");
  }
  const channel = (options.channel ?? "sms").toLowerCase();
  if (channel !== "sms" && channel !== "whatsapp") {
    fail(422, "Auth.InvalidChannel", "Channel must be Sms or WhatsApp.");
  }
  // The API's own normaliser requires between 8 and 15 digits after the "+".
  if (!phone || digits.length < 8 || digits.length > 15) {
    fail(422, "Customer.InvalidPhoneNumber", "Phone number must contain between 8 and 15 digits.");
  }

  enforceRateLimits(phone, now);

  // A missing CSPRNG is not a reason to mint a guessable code. A fixed stand-in
  // would be a master key — every account in the simulator opens to one number
  // anybody can read in the source — so the honest answer is the one a real
  // gateway with a broken generator gives, and the screen falls back to its
  // generic failure message.
  const code = generateOtpCode(OTP_LENGTH);
  if (!code) throw new AppError({ kind: "server", status: 500 });

  const challenge: MockChallenge = {
    id: nextId("chal"),
    phone,
    purpose: purpose === "login" ? "Login" : "Registration",
    code,
    expiresAt: now + OTP_LIFETIME_SECONDS * 1000,
    attempts: 0,
    used: false,
  };
  state.challenges.set(challenge.id, challenge);

  return {
    challengeId: challenge.id,
    expiresAtUtc: new Date(challenge.expiresAt).toISOString(),
    expiresInSeconds: OTP_LIFETIME_SECONDS,
    // The mock stands in for a Development tenant API, where the backend does
    // expose the code. Production UI must still treat it as absent, and the
    // screen's own gate is what enforces that.
    devOtpCode: challenge.code,
  };
}

async function verifyOtp(options: {
  challengeId: string;
  code: string;
  fullName?: string;
  purpose?: string;
}): Promise<CustomerSessionPayload> {
  assertMockAllowed();
  const now = Date.now();
  const challenge = state.challenges.get(options.challengeId ?? "");
  if (!challenge) fail(404, "Customer.ChallengeNotFound", "The verification challenge does not exist.");
  if (challenge.used) fail(409, "Customer.OtpAlreadyUsed", "This code has already been used.");
  if (now >= challenge.expiresAt) fail(422, "Customer.OtpExpired", "The verification code has expired.");
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    fail(409, "Customer.OtpMaxAttemptsExceeded", "Too many incorrect attempts.");
  }

  const code = (options.code ?? "").trim();
  if (code !== challenge.code) {
    challenge.attempts += 1;
    // The fifth wrong answer is the documented 409, not a 422: from that moment
    // the challenge is dead and the customer has to ask for a new code.
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      fail(409, "Customer.OtpMaxAttemptsExceeded", "Too many incorrect attempts.");
    }
    fail(422, "Customer.InvalidOtpCode", "The verification code is incorrect.");
  }

  challenge.used = true;
  const requestPurpose = (options.purpose ?? challenge.purpose ?? "Login").toLowerCase();
  const fullName = (options.fullName ?? "").trim().slice(0, 200);

  let customer = findCustomer(challenge.phone);
  if (requestPurpose === "login") {
    if (!customer) fail(404, "Customer.NotFoundByPhone", "No customer exists for this phone number.");
  } else {
    customer = upsertCustomer(challenge.phone, fullName);
  }
  if (!customer) fail(404, "Customer.NotFoundByPhone", "No customer exists for this phone number.");

  if (customer.state === "blocked") fail(409, "Customer.Blocked", "This customer account is blocked.");
  if (customer.state === "inactive") fail(409, "Customer.Inactive", "This customer account is deactivated.");

  issueTokens(customer, now);
  return {
    customerId: customer.id,
    phoneNumber: customer.phone,
    fullName: customer.fullName,
    email: customer.email,
    accessToken: accessTokenFor(customer),
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_SECONDS,
    expiresAtUtc: new Date(now + ACCESS_TOKEN_SECONDS * 1000).toISOString(),
  };
}

async function refreshSession(): Promise<TokenPair> {
  assertMockAllowed();
  const now = Date.now();
  const current = state.cookie;
  if (!current) fail(401, "RefreshToken.Invalid", "No refresh token is stored for this browser.");
  const presented = state.tokens.get(current);
  if (!presented) fail(401, "RefreshToken.Invalid", "The refresh token is unknown.");
  if (state.revokedFamilies.has(presented.family) || presented.revoked) {
    fail(401, "RefreshToken.Revoked", "The refresh token was revoked.");
  }
  if (presented.expiresAt <= now) fail(401, "RefreshToken.Expired", "The refresh token has expired.");
  if (presented.used) {
    // Replaying a token that was already exchanged means somebody is holding a
    // copy, so the whole family goes and the customer signs in again.
    state.revokedFamilies.add(presented.family);
    for (const token of state.tokens.values()) {
      if (token.family === presented.family) token.revoked = true;
    }
    state.cookie = null;
    fail(401, "RefreshToken.CompromisedReuse", "A rotated refresh token was reused; the family is revoked.");
  }

  const owner = customerById(presented.customerId);
  presented.used = true;
  // Rotation stays in the same family: that is what lets a replay revoke the
  // lineage instead of only the token that was replayed.
  const next = issueTokens(owner, now, presented.family);
  return {
    accessToken: accessTokenFor(owner),
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_SECONDS,
    expiresAtUtc: new Date(now + ACCESS_TOKEN_SECONDS * 1000).toISOString(),
    refreshTokenExpiresAtUtc: new Date(next.expiresAt).toISOString(),
  };
}

async function revokeSession(): Promise<void> {
  assertMockAllowed();
  const current = state.cookie;
  if (!current) return;
  const token = state.tokens.get(current);
  if (!token) {
    state.cookie = null;
    return;
  }
  if (token.revoked || state.revokedFamilies.has(token.family)) {
    // Already logged out is still logged out: the client treats this code as a
    // success and clears its own state either way.
    fail(409, "RefreshToken.AlreadyRevoked", "This refresh token was already revoked.");
  }
  token.revoked = true;
  state.cookie = null;
}

export const authMock = {
  requestOtp,
  verifyOtp,
  refreshSession,
  revokeSession,
  reset,
  /** Lets a test read the simulated cookie jar without pretending it is a browser API. */
  peekCookie: () => state.cookie,
  /** Puts a stale token in the "cookie" to drive reuse and expiry cases. */
  pokeCookie: (value: string | null) => {
    state.cookie = value;
  },
  limits: {
    otpLifetimeSeconds: OTP_LIFETIME_SECONDS,
    maxAttempts: OTP_MAX_ATTEMPTS,
    perPhone: PHONE_REQUEST_LIMIT,
    phoneWindowMs: PHONE_WINDOW_MS,
    globalPerMinute: GLOBAL_REQUEST_LIMIT,
    accessTokenSeconds: ACCESS_TOKEN_SECONDS,
  },
};

export type AuthMock = typeof authMock;

seedReservedCustomers();
