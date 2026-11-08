/**
 * Typed customer-side client for the NawyOrders Tenant API.
 *
 * Contract: the "Customer OTP Login" frontend integration guide and the swagger
 * the tenant host publishes at `/swagger/v1/swagger.json`. Every normal response
 * is wrapped in `{ statusCode, isSuccess, data, errors, timestamp }`, so this
 * module is the only place that knows about the envelope: callers get typed
 * data back or an `AppError` — one shape for every failure, network level,
 * envelope level, `application/problem+json` level or a bare non-JSON `500`.
 *
 * An `AppError` keeps the backend's domain code (`Customer.InvalidOtpCode`),
 * because the code is what decides the customer-facing message *and* the UI
 * action (retry the code, request a new one, sign in again). Raw server text is
 * never rendered: `AUTH_ERROR_MESSAGES` maps every documented code to Arabic,
 * and anything unknown falls back to a generic retry message.
 *
 * Transports, chosen by configuration only (see `authTransport`):
 *   - `live` — the deployed tenant API. Anonymous OTP calls go straight to the
 *     API host, because the tenant is resolved from the request *host*: no
 *     `X-Tenant-Id` is ever sent. Calls that carry a refresh token go through
 *     the same-origin BFF routes in `src/app/api/auth/*`, which keep that token
 *     in an httpOnly cookie instead of in JavaScript.
 *   - `mock` — `AUTH_MOCK=true` in a dev/test build replays the documented
 *     responses locally, including the rate limits and rotation rules, so the
 *     whole flow is testable while the deployed API is still broken. Never
 *     reachable from a production build.
 *   - `demo` — no backend configured at all: the screens keep the offline
 *     in-memory login they shipped with before this client existed.
 */

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The tenant host the integration guide names, written out in full.
 *
 * The slug is the *whole* platform identifier — `tahrir-01a1ad3c…`, not
 * `tahrir` — because the API resolves the tenant from this host and nothing
 * else. A shortened slug answers `404 Tenant Not Found`; a host that is not a
 * tenant host at all answers `401 Tenant.Unresolved`. Both are configuration
 * failures, so the fix is this value, never an `X-Tenant-Id` header.
 */
export const DEFAULT_TENANT_API_BASE_URL =
  "https://tahrir-01a1ad3c89d47d70876527c9ef863dcc.api.nawyorders.com";

/**
 * The browser-visible name. Only `NEXT_PUBLIC_` variables reach the client
 * bundle, so this is the one a deploy sets to put the storefront on a tenant.
 */
export const TENANT_API_BASE_URL_ENV = "NEXT_PUBLIC_TENANT_API_BASE_URL";

/**
 * The guide's own name for the same setting. `next.config.ts` folds it into the
 * browser bundle at build time, and the BFF reads it directly at runtime, so a
 * deploy may set either one — but both sides of the app must end up on the same
 * host, which is why the public name wins whenever it is present.
 */
export const TENANT_API_BASE_URL_SERVER_ENV = "TENANT_API_BASE_URL";

/** Whichever name the deploy used, trimmed; empty when it named no backend. */
function configuredTenantBaseUrl(): string {
  const publicValue = (process.env[TENANT_API_BASE_URL_ENV] ?? "").trim();
  return publicValue || (process.env[TENANT_API_BASE_URL_SERVER_ENV] ?? "").trim();
}

/** Trailing slashes are stripped so `${base}${path}` can never become `//api`. */
export function apiBaseUrl(): string {
  return (configuredTenantBaseUrl() || DEFAULT_TENANT_API_BASE_URL).replace(/\/+$/, "");
}

/**
 * Joins the base URL and an endpoint path without ever producing a double
 * slash, whatever the config looks like.
 */
export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl()}${suffix}`;
}

/**
 * True when the deploy pointed the app at a backend, under either name.
 *
 * `apiBaseUrl()` deliberately answers with the guide's tenant host even when
 * nothing is set — that is what makes the default useful — so "is auth wired
 * up" cannot be derived from it and is read from the variables directly.
 * A deploy that sets nothing keeps the offline demo login it shipped with.
 */
export function apiConfigured(): boolean {
  return configuredTenantBaseUrl() !== "";
}

/** Where the auth calls actually go. Chosen by configuration, never in code. */
export type AuthTransport = "live" | "mock" | "demo";

/**
 * `AUTH_MOCK=true` (or its `NEXT_PUBLIC_` twin, which is the one that reaches
 * the browser bundle) selects the contract simulator.
 *
 * The `NODE_ENV` test is inlined at build time, so a production build can never
 * select the simulator — whatever the runtime environment says. The simulator
 * is only imported behind that decision, so production never executes it.
 */
export function authMockRequested(): boolean {
  const flag = process.env.NEXT_PUBLIC_AUTH_MOCK ?? process.env.AUTH_MOCK ?? "";
  return flag.trim().toLowerCase() === "true";
}

export function authTransport(): AuthTransport {
  if (process.env.NODE_ENV !== "production" && authMockRequested()) return "mock";
  return apiConfigured() ? "live" : "demo";
}

/* -------------------------------------------------------------------------- */
/* Contract types                                                             */
/* -------------------------------------------------------------------------- */

export type ApiResponse<T> = {
  statusCode: number;
  isSuccess: boolean;
  data: T | null;
  errors: Record<string, string> | null;
  timestamp?: string;
};

/** ASP.NET's non-enveloped error shape, used by tenant-resolution failures. */
export type ProblemDetails = {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
  errors?: Record<string, string> | null;
};

export type RestaurantBranding = {
  tenantId?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  surfaceColor?: string | null;
  textOnPrimaryColor?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  whatsAppUrl?: string | null;
  messengerUrl?: string | null;
  socialLinks?: Record<string, string> | null;
  eTag?: string | null;
};

export type OtpChannel = "sms" | "whatsapp";

/**
 * The two purposes the customer screen offers.
 *
 * The guide also documents `PhoneVerification`, which the backend treats like
 * `Registration`; this app has no screen that asks for it, so the union stays at
 * the two a customer can actually choose. The deployed build ignores the field
 * altogether — it decides new-vs-returning from the phone — and sending it is
 * harmless against either contract.
 */
export type OtpPurpose = "Login" | "Registration";

/** `POST /api/v1/auth/otp/request` → `data`. */
export type RequestOtpData = {
  challengeId: string;
  expiresAtUtc: string;
  expiresInSeconds: number;
  devOtpCode: string | null;
};

/** `POST /api/v1/auth/otp/verify` → `data`, exactly as the API returns it. */
export type CustomerLoginData = {
  customerId: string;
  phoneNumber: string;
  fullName: string | null;
  email: string | null;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAtUtc: string;
  refreshToken: string;
};

/**
 * What the app is allowed to hold after a verify.
 *
 * The refresh token is deliberately absent: the BFF route stores it in an
 * httpOnly cookie and strips it from the body it hands back, so no JavaScript
 * — including this module's callers — ever sees it.
 */
export type CustomerSessionPayload = Omit<CustomerLoginData, "refreshToken">;

/** `POST /api/v1/auth/refresh` → `data`. */
export type RefreshData = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string | null;
};

/** Same reasoning: the rotated token lands in the cookie, not in the page. */
export type TokenPair = Omit<RefreshData, "refreshToken">;

/** Kept as an alias so callers can name the challenge whatever reads best. */
export type OtpChallenge = RequestOtpData;

/* -------------------------------------------------------------------------- */
/* The one error shape                                                        */
/* -------------------------------------------------------------------------- */

export type AppErrorKind =
  | "offline"
  | "timeout"
  | "validation"
  | "unauthorized"
  | "notFound"
  | "conflict"
  | "rateLimited"
  | "server"
  | "envelope";

/** Every place a tenant-host failure can show up, as one code per case. */
export type AuthErrorCode =
  | "Tenant.Unresolved"
  | "Tenant.Conflicting"
  | "Tenant.NotFound"
  | "Customer.ChallengeNotFound"
  | "Customer.NotFoundByPhone"
  | "Customer.OtpAlreadyUsed"
  | "Customer.OtpMaxAttemptsExceeded"
  | "Customer.Blocked"
  | "Customer.Inactive"
  | "Customer.InvalidPhoneNumber"
  | "Customer.InvalidOtpCode"
  | "Customer.OtpExpired"
  | "Auth.InvalidPurpose"
  | "Auth.InvalidChannel"
  | "Auth.InactiveAccount"
  | "Auth.OtpRateLimitExceeded"
  | "Validation.Failed"
  | "RateLimit.Exceeded"
  | "RefreshToken.Invalid"
  | "RefreshToken.Expired"
  | "RefreshToken.Revoked"
  | "RefreshToken.CompromisedReuse"
  | "RefreshToken.AlreadyRevoked"
  | "RefreshToken.ExclusiveOwnerViolation";

/** Error thrown for every failed API interaction, network level or envelope. */
export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status: number;
  /** Domain code from the response, `Tenant.*`/`Customer.*`/`RefreshToken.*`. */
  readonly code: AuthErrorCode | null;
  /** Validation failures keyed by the API's PascalCase property names. */
  readonly fieldErrors: Record<string, string>;
  /**
   * `Retry-After` from a 429, in whole seconds — the contract says the per-phone
   * limiter sends it. `null` when the server did not say, which is exactly the
   * `RateLimit.Exceeded` case.
   */
  readonly retryAfterSeconds: number | null;
  /** `ProblemDetails.detail`, for the console only. Never rendered. */
  readonly problemDetail: string | null;

  constructor(options: {
    kind: AppErrorKind;
    status: number;
    code?: AuthErrorCode | null;
    fieldErrors?: Record<string, string>;
    retryAfterSeconds?: number | null;
    problemDetail?: string | null;
  }) {
    super(options.code ?? options.kind);
    this.name = "AppError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code ?? null;
    this.fieldErrors = options.fieldErrors ?? {};
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.problemDetail = options.problemDetail ?? null;
  }
}

/** The class was called `ApiError` before the code catalog existed. */
export const ApiError = AppError;
export type ApiError = AppError;

/**
 * `Retry-After` is either a delay in seconds or an HTTP date. Both are accepted
 * here and both come back as whole seconds from now, because that is what a
 * countdown needs. Anything unreadable stays `null` rather than becoming a
 * made-up wait.
 */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }

  // The alternative is an HTTP date. Requiring letters first matters: V8 will
  // happily read "-5" as a year, and a negative delay must not reach a timer.
  if (!/[a-z]{3}/i.test(raw)) return null;
  const at = Date.parse(raw);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

/**
 * How long to wait before retrying a rate-limited call.
 *
 * The per-phone limiter answers `429` with `Retry-After: 180`, and that number
 * is the only honest countdown. The global `RateLimit.Exceeded` throttle sends
 * no header at all, so it gets a short default backoff instead of an instant
 * retry storm that would only hit the same limit again.
 */
export function retryBackoffSeconds(error: unknown, defaultSeconds = 30): number | null {
  if (!(error instanceof AppError) || error.kind !== "rateLimited") return null;
  if (error.retryAfterSeconds !== null) return error.retryAfterSeconds;
  return Math.max(1, defaultSeconds);
}

/* -------------------------------------------------------------------------- */
/* One Arabic message per code                                                */
/* -------------------------------------------------------------------------- */

/**
 * Every code in the guide's catalog, mapped to the message the customer reads
 * *and* the action the screens take. The strings double as i18n keys, so each
 * one also has an English entry in `src/lib/i18n.ts`.
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  "Tenant.Unresolved": "المتجر مش متاح على السيرفر، جرب تاني بعد شوية",
  "Tenant.Conflicting": "إعداد المتجر غير صحيح على السيرفر، جرب تاني بعد شوية",
  "Tenant.NotFound": "المتجر مش موجود على السيرفر، جرب تاني بعد شوية",
  "Customer.ChallengeNotFound": "انتهت صلاحية الكود، اطلب كود جديد",
  "Customer.NotFoundByPhone": "مفيش حساب بالموبيل ده، سجّل حساب جديد",
  "Customer.OtpAlreadyUsed": "الكود ده اتستخدم خلاص، اطلب كود جديد",
  "Customer.OtpMaxAttemptsExceeded": "عدد محاولات زايد، اطلب كود جديد",
  "Customer.Blocked": "الحساب ده موقوف، كلم خدمة العملاء",
  "Customer.Inactive": "الحساب ده متقفل حاليًا، كلم خدمة العملاء",
  "Customer.InvalidPhoneNumber": "رقم الموبايل غير صحيح",
  "Customer.InvalidOtpCode": "الكود غير صحيح، جرب تاني",
  "Customer.OtpExpired": "انتهت صلاحية الكود، اطلب كود جديد",
  "Auth.InvalidPurpose": "طلب غير صحيح، جرب تاني",
  "Auth.InvalidChannel": "طلب غير صحيح، جرب تاني",
  "Auth.InactiveAccount": "الحساب ده متقفل حاليًا، كلم خدمة العملاء",
  "Auth.OtpRateLimitExceeded": "عدد محاولات زايد، استنى شوية وجرب تاني",
  "Validation.Failed": "بيانات الطلب غير صحيحة",
  "RateLimit.Exceeded": "الخدمة مشغولة دلوقتي، استنى شوية وجرب تاني",
  "RefreshToken.Invalid": "انتهت الجلسة، سجّل الدخول تاني",
  "RefreshToken.Expired": "انتهت الجلسة، سجّل الدخول تاني",
  "RefreshToken.Revoked": "انتهت الجلسة، سجّل الدخول تاني",
  "RefreshToken.CompromisedReuse": "انتهت الجلسة، سجّل الدخول تاني",
  "RefreshToken.AlreadyRevoked": "تم تسجيل الخروج",
  "RefreshToken.ExclusiveOwnerViolation": "انتهت الجلسة، سجّل الدخول تاني",
};

/**
 * Input-validation failures arrive with the C# property names (`PhoneNumber`,
 * `Code`, `FullName`) rather than domain codes, so they map onto form fields
 * here — that is what lets the screen highlight the right input.
 */
export const AUTH_FIELD_MESSAGES: Record<string, string> = {
  PhoneNumber: "رقم الموبايل غير صحيح",
  Code: "الكود غير صحيح، جرب تاني",
  ChallengeId: "انتهت صلاحية الكود، اطلب كود جديد",
  FullName: "اكتب اسمك بالكامل",
  Purpose: "طلب غير صحيح، جرب تاني",
  Channel: "طلب غير صحيح، جرب تاني",
  RefreshToken: "انتهت الجلسة، سجّل الدخول تاني",
};

/** Which form field a validation key belongs to. */
export type AuthFieldTarget = "phone" | "code" | "name" | "channel" | "none";

export const AUTH_FIELD_TARGETS: Record<string, AuthFieldTarget> = {
  PhoneNumber: "phone",
  Code: "code",
  ChallengeId: "code",
  FullName: "name",
  Purpose: "channel",
  Channel: "channel",
  RefreshToken: "none",
};

const KIND_MESSAGES: Record<AppErrorKind, string> = {
  offline: "مفيش اتصال بالإنترنت، جرب تاني",
  timeout: "السيرفر بياخد وقت طويل، جرب تاني",
  validation: "بيانات الطلب غير صحيحة",
  unauthorized: "انتهت الجلسة، سجّل الدخول تاني",
  notFound: "الكود غير صحيح، جرب تاني",
  conflict: "الكود ده اتستخدم خلاص، اطلب كود جديد",
  rateLimited: "عدد محاولات زايد، استنى شوية وجرب تاني",
  server: "حصل مشكلة في السيرفر، جرب تاني",
  envelope: "رد السيرفر مش مفهوم، جرب تاني",
};

/** A domain code is a `Something.Else` key; a validation key is a bare word. */
function isErrorCode(key: string): boolean {
  return /^[A-Za-z]+\.[A-Za-z]+$/.test(key);
}

/**
 * The i18n key (an Arabic sentence) for any failure.
 *
 * Order matters: the domain code wins, because it carries the action; a
 * validation key comes next; the bare status only decides the fallback when the
 * body said nothing usable — which is exactly the case for a non-JSON `500` and
 * for the `application/problem+json` tenant failures.
 *
 * One exception, and it is the shape the API actually answers with: a `422`
 * whose `errors` only names form fields has no domain code, so this client
 * stamps it `Validation.Failed`. That name is ours, not the backend's, and it
 * says less than the field key does — reading it first would turn every bad
 * phone number and every wrong code into the same generic sentence.
 */
export function apiErrorMessageKey(error: unknown): string {
  if (!(error instanceof AppError)) return KIND_MESSAGES.server;

  const field = Object.keys(error.fieldErrors)[0];
  const fieldMessage = field ? AUTH_FIELD_MESSAGES[field] : undefined;
  if (error.code === "Validation.Failed" && fieldMessage) return fieldMessage;

  if (error.code && AUTH_ERROR_MESSAGES[error.code]) return AUTH_ERROR_MESSAGES[error.code];
  if (fieldMessage) return fieldMessage;

  if (field) {
    // A key the catalog does not know is still a rejected request body.
    if (error.code === "Validation.Failed" || !isErrorCode(field)) return KIND_MESSAGES.validation;
  }

  if (error.status === 400 || error.status === 404) {
    // Tenant-resolution failures are the documented ProblemDetails cases.
    const tenant = tenantProblemCode(error);
    if (tenant) return AUTH_ERROR_MESSAGES[tenant];
  }
  return KIND_MESSAGES[error.kind];
}

/**
 * Which input a failure belongs to, so the screen can put the message under the
 * right field instead of leaving the customer guessing which of four boxes the
 * server meant. Only `Validation.Failed` carries field keys; a domain code such
 * as `Customer.InvalidOtpCode` already names its own field by meaning, and the
 * caller decides where to show it.
 */
export function apiErrorFieldTarget(error: unknown): AuthFieldTarget | null {
  if (!(error instanceof AppError)) return null;
  const key = Object.keys(error.fieldErrors)[0];
  if (!key) return null;
  return AUTH_FIELD_TARGETS[key] ?? null;
}

/** `ProblemDetails.title` is the only signal a tenant problem sends. */
function tenantProblemCode(error: AppError): AuthErrorCode | null {
  const detail = (error.problemDetail ?? "").toLowerCase();
  const kind = error.kind;
  if (kind === "unauthorized") return "Tenant.Unresolved";
  if (kind === "notFound") return "Tenant.NotFound";
  if (detail.includes("tenant") || detail.includes("subdomain")) {
    return kind === "validation" && error.status === 400 ? "Tenant.Conflicting" : "Tenant.NotFound";
  }
  return null;
}

/**
 * Whether a failed refresh ends the session.
 *
 * Only the backend saying "that token is dead" is fatal: a 401 (expired,
 * invalid, no cookie) or a 409 on a `RefreshToken.*` code (revoked, reused,
 * double-spent). Everything else — a 500, a timeout, an offline browser, a
 * wedged tab holding the refresh lock — is a bad moment, not a signed-out
 * customer.
 *
 * The deployed API makes this distinction unavoidable: it answers every
 * mediated call with a 500 today, and treating that as fatal would log every
 * customer out on every reload while each retry quietly spends the tenant's
 * shared per-minute limiter.
 */
export function isFatalRefreshError(error: unknown): boolean {
  if (!(error instanceof AppError)) return false;
  if (error.status === 401) return true;
  return error.status === 409 && (error.code ?? "").startsWith("RefreshToken.");
}

/**
 * The one failure the guide says to retry: the first call after a backend
 * restart can land before the tenant cache is warm, and the API answers
 * `404 Tenant Not Found` or `401 Tenant.Unresolved` for a host that is right.
 *
 * Deliberately narrow. A `404 Customer.NotFoundByPhone` is a real answer about a
 * real customer, a `429` is a limit that a second call would only spend again,
 * and a `500` is a broken backend that one more request cannot fix. Retrying any
 * of those turns a single honest failure into a small storm.
 */
export function isTenantResolutionError(error: unknown): boolean {
  if (!(error instanceof AppError)) return false;
  return error.code === "Tenant.NotFound" || error.code === "Tenant.Unresolved";
}

/* -------------------------------------------------------------------------- */
/* Request plumbing                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The longest any single tenant or BFF call is allowed to take.
 *
 * Exported because the cross-tab refresh lock is sized from it: a lock that
 * expires before the request it is guarding can still finish lets a second tab
 * rotate the same token family, and the backend reads that as theft.
 */
export const REQUEST_TIMEOUT_MS = 12000;

/**
 * The contract's own code lifetime, and the value used when a response carries
 * no expiry at all. One number, shared by the screen and the simulator, so a
 * resend button can never count down a different clock from the one that minted
 * the code.
 */
export const OTP_LIFETIME_SECONDS = 300;

/**
 * The longest token this app will hold anywhere.
 *
 * A shared ceiling: the cookie jar refuses a token over it, and the in-memory
 * session refuses one too. Two numbers that drift apart would mean a token the
 * server accepts and the browser silently drops.
 */
export const MAX_TOKEN_LENGTH = 8192;

/**
 * How long a refresh token — and the httpOnly cookie that carries it — is
 * expected to live.
 *
 * One number for both sides of the boundary: the BFF writes the cookie for
 * this many days, and the simulator hands out tokens that expire after it. A
 * cookie that outlives its token stores a credential the server already
 * refuses, and a token that outlives its cookie signs customers out early.
 */
export const REFRESH_TOKEN_LIFETIME_DAYS = 14;

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Sent as `If-None-Match` so a cached branding payload costs a 304. */
  etag?: string | null;
  timeoutMs?: number;
  /**
   * Tenant API calls never send cookies — the bearer token is the credential.
   * BFF calls are same-origin and *do* need the httpOnly refresh cookie, which
   * is the whole point of routing them through the app server.
   */
  credentials?: RequestCredentials;
  /** `local` targets this app's own `/api/auth/*` routes instead of the tenant host. */
  target?: "tenant" | "local";
};

type RawResponse = {
  status: number;
  /** `undefined` when the server answered 304 with an empty body. */
  body: unknown;
  /** Parsed body when the response was `application/problem+json`, else null. */
  problem: ProblemDetails | null;
  etag: string | null;
  retryAfterSeconds: number | null;
  /** The body was not JSON at all — an HTML developer exception page, say. */
  nonJson: boolean;
};

/**
 * One call, with the guide's cold-start retry folded into the same budget.
 *
 * The retry shares the caller's timeout rather than starting a new one: the
 * cross-tab refresh lock is sized from `REQUEST_TIMEOUT_MS`, and a request that
 * could quietly take two of them would outlive the lock guarding it — which is
 * how two tabs end up rotating one token family and the backend revokes every
 * session the customer has.
 *
 * Only tenant-direct calls retry here. A `local` call goes to this app's own
 * BFF, which does its own single retry against the tenant; retrying at both
 * layers would spend four requests on one cold start.
 */
async function rawRequest(path: string, options: RequestOptions = {}): Promise<RawResponse> {
  const budgetMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const deadline = Date.now() + budgetMs;
  try {
    return await requestOnce(path, options, budgetMs);
  } catch (error) {
    const left = deadline - Date.now();
    if (options.target !== "local" && left > 0 && isTenantResolutionError(error)) {
      return requestOnce(path, options, left);
    }
    throw error;
  }
}

async function requestOnce(path: string, options: RequestOptions, timeoutMs: number): Promise<RawResponse> {
  const url = options.target === "local" ? path : apiUrl(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.etag) headers["If-None-Match"] = options.etag;
  // No `X-Tenant-Id`, ever: for anonymous login requests the tenant comes from
  // the request host, and a header that disagrees with it is a documented 400.
  // No `Authorization` either. Every credential-carrying call in this app goes
  // to the BFF (`target: "local"`), which talks to the tenant itself, so nothing
  // here has a reason to put a token on a browser request.

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      credentials: options.credentials ?? "omit",
    });
  } catch (cause) {
    clearTimeout(timeout);
    throw new AppError({
      kind: cause instanceof Error && cause.name === "AbortError" ? "timeout" : "offline",
      status: 0,
    });
  }
  clearTimeout(timeout);

  const etag = response.headers.get("ETag");
  const retryAfterSeconds = parseRetryAfter(response.headers.get("Retry-After"));
  if (response.status === 304) {
    return { status: 304, body: undefined, problem: null, etag, retryAfterSeconds, nonJson: false };
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  let parsed: unknown = null;
  let nonJson = false;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
    nonJson = true;
  }

  const problem = isProblem(parsed, contentType) ? (parsed as ProblemDetails) : null;

  if (!response.ok) {
    throw errorFromResponse(response.status, parsed, problem, nonJson, retryAfterSeconds, contentType);
  }

  return { status: response.status, body: parsed, problem: null, etag, retryAfterSeconds, nonJson };
}

/**
 * `application/problem+json` is how the tenant middleware reports a host it
 * cannot map. It has no `isSuccess`, so reading it as an envelope would turn a
 * configuration bug into a meaningless "server said nothing" error.
 */
function isProblem(parsed: unknown, contentType: string): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  if (contentType.includes("application/problem+json")) return true;
  const value = parsed as Record<string, unknown>;
  return value.isSuccess === undefined && ("title" in value || "type" in value) && "status" in value;
}

/** The documented `ProblemDetails.title` values, in the API's own words. */
function problemCode(problem: ProblemDetails, status: number): AuthErrorCode | null {
  const title = (problem.title ?? "").toLowerCase();
  if (title.includes("unresolved")) return "Tenant.Unresolved";
  if (title.includes("not found")) return "Tenant.NotFound";
  if (title.includes("tenant") && status === 400) return "Tenant.Conflicting";
  if (status === 401) return "Tenant.Unresolved";
  if (status === 404) return "Tenant.NotFound";
  if (title.includes("tenant")) return "Tenant.Conflicting";
  return null;
}

const kindByStatus: Record<number, AppErrorKind> = {
  401: "unauthorized",
  404: "notFound",
  409: "conflict",
  422: "validation",
  429: "rateLimited",
};

function kindFor(status: number): AppErrorKind {
  return kindByStatus[status] ?? (status >= 500 ? "server" : "validation");
}

/** Splits an `errors` dictionary into the domain code and the field failures. */
function splitErrors(errors: Record<string, string> | null | undefined): {
  code: AuthErrorCode | null;
  fieldErrors: Record<string, string>;
} {
  if (!errors || typeof errors !== "object") return { code: null, fieldErrors: {} };
  const fieldErrors: Record<string, string> = {};
  let code: AuthErrorCode | null = null;
  for (const [key, message] of Object.entries(errors)) {
    if (typeof key !== "string" || typeof message !== "string") continue;
    if (isErrorCode(key)) {
      // Domain first wins; a response can legitimately carry several, and the
      // catalog is written for the most specific one.
      if (!code) code = key as AuthErrorCode;
    } else {
      fieldErrors[key] = message;
    }
  }
  return { code, fieldErrors };
}

/** Turns any failed response — enveloped or not — into one `AppError`. */
function errorFromResponse(
  status: number,
  parsed: unknown,
  problem: ProblemDetails | null,
  nonJson: boolean,
  retryAfterSeconds: number | null,
  contentType: string,
): AppError {
  const kind = kindFor(status);

  if (problem) {
    return new AppError({
      kind,
      status,
      code: problemCode(problem, status),
      retryAfterSeconds,
      problemDetail: problem.detail ?? problem.title ?? null,
    });
  }

  // A bare 500 (no envelope, no ProblemDetails, sometimes HTML) is exactly what
  // the deployed API answers today. It must still become a usable AppError.
  if (nonJson || parsed === null || typeof parsed !== "object") {
    return new AppError({ kind, status, retryAfterSeconds });
  }

  const envelope = parsed as ApiResponse<unknown>;
  const { code, fieldErrors } = splitErrors(envelope.errors);
  return new AppError({
    kind,
    status,
    // `Validation.Failed` is the documented umbrella for field-level failures.
    code: code ?? (Object.keys(fieldErrors).length ? "Validation.Failed" : null),
    fieldErrors,
    retryAfterSeconds,
    problemDetail: contentType.includes("application/json") ? null : contentType,
  });
}

/** Reads an envelope's `errors` for a response that arrived with 2xx. */
function errorFromEnvelope(envelope: ApiResponse<unknown>, status: number, retryAfterSeconds: number | null) {
  const code = typeof envelope.statusCode === "number" ? envelope.statusCode : status;
  const { code: domain, fieldErrors } = splitErrors(envelope.errors);
  return new AppError({
    kind: kindFor(code),
    status: code,
    code: domain ?? (Object.keys(fieldErrors).length ? "Validation.Failed" : null),
    fieldErrors,
    retryAfterSeconds,
  });
}

function envelopeOf(body: unknown, status: number, retryAfterSeconds: number | null): ApiResponse<unknown> {
  if (!body || typeof body !== "object") {
    throw new AppError({ kind: "envelope", status, retryAfterSeconds });
  }
  return body as ApiResponse<unknown>;
}

/** Payload endpoints: a success with no `data` is a broken answer, not a void. */
function unwrap<T>(body: unknown, status: number, retryAfterSeconds: number | null): T {
  const envelope = envelopeOf(body, status, retryAfterSeconds);
  if (envelope.isSuccess === false || envelope.data === null || envelope.data === undefined) {
    throw errorFromEnvelope(envelope, status, retryAfterSeconds);
  }
  return envelope.data as T;
}

/**
 * `/revoke` succeeds with `"data": null` — and a BFF may answer 204 with no
 * body at all — which the generic unwrap would read as a failure. This one
 * trusts `isSuccess` alone.
 */
function unwrapVoid(body: unknown, status: number, retryAfterSeconds: number | null): void {
  if (status === 204) return;
  const envelope = envelopeOf(body, status, retryAfterSeconds);
  if (envelope.isSuccess === false) throw errorFromEnvelope(envelope, status, retryAfterSeconds);
}

/* -------------------------------------------------------------------------- */
/* Token expiry                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The contract's two expiry fields, reduced to one truth — or a refusal.
 *
 * A success with no usable expiry is not a session. `sessionNeedsRefresh` reads
 * a zero expiry as "stale right now", so the proactive refresh would fire again
 * the instant a rotation landed, and again after that: an endless loop of
 * `/refresh` calls, each one spending the tenant's global 100-per-minute
 * limiter that every customer in the tenant shares. Refusing the answer turns
 * that loop into one honest sign-in failure.
 *
 * A numeric string counts: that is how a JSON number reaches a client that did
 * not type it, and `Number.isFinite("3600")` is false.
 */
function tokenExpiry(
  data: { expiresIn?: unknown; expiresAtUtc?: unknown },
  status: number,
): { expiresIn: number; expiresAtUtc: string } {
  const raw = typeof data.expiresIn === "string" ? Number(data.expiresIn) : data.expiresIn;
  const expiresIn = typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 0;
  const expiresAtUtc = typeof data.expiresAtUtc === "string" ? data.expiresAtUtc.trim() : "";
  if (expiresIn <= 0 && !Number.isFinite(Date.parse(expiresAtUtc))) {
    throw new AppError({ kind: "envelope", status });
  }
  return { expiresIn, expiresAtUtc };
}

/* -------------------------------------------------------------------------- */
/* Phone normalisation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The backend takes a single phone string; the UI collects a local Egyptian
 * number and shows the +20 prefix separately, so normalise to E.164 here.
 *
 * A number the customer already typed in international form keeps its own
 * country code — guessing "20" over `+966500000000` would silently turn a valid
 * Saudi number into an invalid Egyptian one.
 */
export function normalizeEgyptianPhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("20")) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  return `+20${digits}`;
}

/**
 * Whether a normalised number is worth sending at all.
 *
 * The contract accepts 8–15 digits and rejects anything else with
 * `422 Customer.InvalidPhoneNumber`, so the screen checks the same window
 * before spending an SMS on a number the backend would refuse. It is applied
 * after normalisation, which is what makes `01012345678` (11 local digits) and
 * `+201012345678` (12 with the country code) both pass.
 */
export function isUsablePhone(normalized: string): boolean {
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/* -------------------------------------------------------------------------- */
/* Transport dispatch                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The simulator is imported only when a dev/test build asked for it. The
 * condition folds away in production, so the mock is not in that bundle and
 * cannot be reached from it.
 */
async function mockTransport() {
  const { authMock } = await import("@/lib/auth-mock");
  return authMock;
}

/**
 * One-time adoption of a refresh token an older build left in `localStorage`.
 *
 * Sessions stored before the cookie existed carried their own copy of the
 * token. Handing it to the app server once keeps those customers signed in, and
 * the caller overwrites its storage with identity only right after, so the copy
 * in browser storage is gone in the same breath.
 */
export async function attachStoredRefresh(refreshToken: string): Promise<void> {
  // Nothing to adopt in the simulator: it keeps its own in-memory jar and never
  // reads a cookie. Posting anyway would send a live-shaped body to the
  // same-origin BFF, which would forward it to the real tenant host — a request
  // nobody asked for, in a mode whose whole point is that no request leaves.
  if (authTransport() === "mock") return;

  await rawRequest("/api/auth/session", {
    method: "POST",
    target: "local",
    credentials: "same-origin",
    body: { refreshToken },
  });
}

/* -------------------------------------------------------------------------- */
/* Endpoints the storefront may call                                          */
/* -------------------------------------------------------------------------- */

export type BrandingResult =
  | { notModified: true; branding: null; etag: string | null }
  | { notModified: false; branding: RestaurantBranding; etag: string | null };

export async function fetchBranding(options: { etag?: string | null } = {}): Promise<BrandingResult> {
  const response = await rawRequest("/api/v1/Branding", { etag: options.etag ?? null });
  if (response.status === 304) return { notModified: true, branding: null, etag: response.etag };
  return {
    notModified: false,
    branding: unwrap<RestaurantBranding>(response.body, response.status, response.retryAfterSeconds),
    etag: response.etag,
  };
}

/**
 * Step 1. Anonymous, so it goes straight to the tenant host: the host is what
 * resolves the tenant, and a BFF hop would add nothing to a request that carries
 * no credential.
 */
export async function requestOtp(options: {
  phoneNumber: string;
  channel?: OtpChannel;
  purpose?: OtpPurpose;
}): Promise<RequestOtpData> {
  if (authTransport() === "mock") {
    const mock = await mockTransport();
    return mock.requestOtp(options);
  }

  const response = await rawRequest("/api/v1/auth/otp/request", {
    method: "POST",
    body: {
      phoneNumber: options.phoneNumber,
      // The guide's casing, which the API's own 422 names ("Sms or WhatsApp").
      // The deployed build folds case, so `sms` is accepted too — being literal
      // keeps this file readable against the contract either way.
      purpose: options.purpose ?? "Login",
      channel: options.channel === "whatsapp" ? "WhatsApp" : "Sms",
    },
  });
  const data = unwrap<Partial<RequestOtpData>>(response.body, response.status, response.retryAfterSeconds);
  if (typeof data.challengeId !== "string" || !data.challengeId) {
    throw new AppError({ kind: "envelope", status: response.status, retryAfterSeconds: response.retryAfterSeconds });
  }
  return {
    challengeId: data.challengeId,
    expiresAtUtc: typeof data.expiresAtUtc === "string" ? data.expiresAtUtc : "",
    // A negative or fractional lifetime would break every countdown built on it.
    expiresInSeconds: Number.isFinite(data.expiresInSeconds)
      ? Math.max(0, Math.floor(Number(data.expiresInSeconds)))
      : 0,
    devOtpCode: typeof data.devOtpCode === "string" ? data.devOtpCode : null,
  };
}

/**
 * The name fields the deployed build actually sends.
 *
 * Its swagger answers `/otp/verify` with `firstName`/`lastName` and no
 * `fullName`, while the integration guide documents `fullName`. Reading only
 * the guide's field would sign every customer in as somebody with no name, so
 * both shapes are accepted and reduced to the one the app stores.
 */
type DeployedCustomerName = { firstName?: unknown; lastName?: unknown };

/** The guide's `fullName`, or the deployed pair joined into the same thing. */
function customerName(data: Partial<CustomerLoginData> & DeployedCustomerName): string {
  if (typeof data.fullName === "string" && data.fullName.trim()) return data.fullName.trim().slice(0, 200);
  return [data.firstName, data.lastName]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .map((part) => part.trim())
    .join(" ")
    .slice(0, 200);
}

/**
 * Step 2. Routed through the app server: the answer carries a refresh token,
 * and the BFF puts that token in an httpOnly cookie and hands back the same
 * envelope with it removed. Failures pass through with their status, body and
 * `Retry-After` intact, so the catalog above still applies.
 */
export async function verifyOtp(options: {
  challengeId: string;
  code: string;
  fullName?: string;
}): Promise<CustomerSessionPayload> {
  if (authTransport() === "mock") {
    const mock = await mockTransport();
    return mock.verifyOtp(options);
  }

  const fullName = (options.fullName ?? "").trim().slice(0, 200);
  const response = await rawRequest("/api/auth/otp/verify", {
    method: "POST",
    target: "local",
    credentials: "same-origin",
    body: {
      challengeId: options.challengeId,
      code: options.code.trim(),
      // `fullName` is what registers a first-time customer. A returning one
      // simply leaves it out rather than posting an empty string the backend
      // could read as "rename me to nothing".
      ...(fullName ? { fullName } : {}),
    },
  });
  const data = unwrap<Partial<CustomerLoginData> & DeployedCustomerName>(
    response.body,
    response.status,
    response.retryAfterSeconds,
  );
  if (typeof data.accessToken !== "string" || !data.accessToken) {
    throw new AppError({ kind: "envelope", status: response.status, retryAfterSeconds: response.retryAfterSeconds });
  }
  return {
    customerId: typeof data.customerId === "string" ? data.customerId : "",
    phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
    fullName: customerName(data),
    email: typeof data.email === "string" ? data.email : null,
    accessToken: data.accessToken,
    tokenType: typeof data.tokenType === "string" ? data.tokenType : "Bearer",
    ...tokenExpiry(data, response.status),
  };
}

/**
 * Rotation is the reason only the BFF may call this: every answer invalidates
 * the token it was sent, so the store that holds it has to be the one that
 * writes the replacement. The client side of that is the single-flight
 * controller in `src/lib/session.ts`.
 */
export async function refreshSession(): Promise<TokenPair> {
  if (authTransport() === "mock") {
    const mock = await mockTransport();
    return mock.refreshSession();
  }

  const response = await rawRequest("/api/auth/refresh", {
    method: "POST",
    target: "local",
    credentials: "same-origin",
    body: {},
  });
  const data = unwrap<Partial<RefreshData>>(response.body, response.status, response.retryAfterSeconds);
  if (typeof data.accessToken !== "string" || !data.accessToken) {
    throw new AppError({ kind: "envelope", status: response.status, retryAfterSeconds: response.retryAfterSeconds });
  }
  return {
    accessToken: data.accessToken,
    tokenType: typeof data.tokenType === "string" ? data.tokenType : "Bearer",
    ...tokenExpiry(data, response.status),
    refreshTokenExpiresAtUtc:
      typeof data.refreshTokenExpiresAtUtc === "string" ? data.refreshTokenExpiresAtUtc : null,
  };
}

/**
 * Logout. `RefreshToken.AlreadyRevoked` is a success from the customer's point
 * of view — they are logged out — so it is swallowed here rather than reaching
 * the caller as an error. Any other failure still returns normally: the local
 * session is cleared regardless, which is what the guide asks for.
 */
export async function revokeSession(): Promise<void> {
  // Inside the `try`, not before it: the simulator answers `409 AlreadyRevoked`
  // the same way the deployed API does, and the rule below is what makes that a
  // success for the customer. A mock branch outside the try would log the
  // difference in instead of the contract.
  try {
    if (authTransport() === "mock") {
      const mock = await mockTransport();
      await mock.revokeSession();
      return;
    }

    const response = await rawRequest("/api/auth/revoke", {
      method: "POST",
      target: "local",
      credentials: "same-origin",
      body: { reason: "User logged out" },
    });
    unwrapVoid(response.body, response.status, response.retryAfterSeconds);
  } catch (error) {
    if (error instanceof AppError && error.code === "RefreshToken.AlreadyRevoked") return;
    throw error;
  }
}

/**
 * The low-level forwarder the BFF routes use. It is kept here so there is one
 * place that knows the tenant host, the envelope and the timeout, and the route
 * handlers stay as thin as the guide's "thin BFF" wording asks.
 *
 * The cold-start retry lives here rather than in the routes: a verify, a
 * rotation and a revoke all deserve the same single second chance, and putting
 * it in four handlers is how one of them ends up without it.
 */
export type TenantAnswer = {
  status: number;
  contentType: string;
  body: unknown;
  retryAfterSeconds: number | null;
};

export async function forwardToTenant(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; token?: string | null },
): Promise<TenantAnswer> {
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  const first = await forwardOnce(path, init, REQUEST_TIMEOUT_MS);
  if (!isColdStartAnswer(first)) return first;
  // Same shared budget as the browser client: the retry may not outlive the
  // lock that is guarding this rotation.
  const left = Math.floor(deadline - Date.now());
  if (left <= 0) return first;
  return forwardOnce(path, init, left);
}

async function forwardOnce(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; token?: string | null },
  timeoutMs: number,
): Promise<TenantAnswer> {
  const response = await fetch(apiUrl(path), {
    method: init.method ?? "POST",
    headers: {
      Accept: "application/json",
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "omit",
    cache: "no-store",
    signal: AbortSignal.timeout(Math.max(1, timeoutMs)),
  });

  const contentType = response.headers.get("Content-Type") ?? "application/json";
  const retryAfterSeconds = parseRetryAfter(response.headers.get("Retry-After"));
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, contentType, body, retryAfterSeconds };
}

/**
 * Whether a relayed answer is the tenant cache being cold, judged exactly the
 * way the browser client judges it — by parsing it into the same `AppError`.
 *
 * That sharing is the point: a `404` carrying `Customer.NotFoundByPhone` is an
 * answer about a customer and must reach the screen untouched, while a `404`
 * `ProblemDetails` titled "Tenant Not Found" is the restart case worth one more
 * request. Two hand-written status checks would eventually disagree.
 */
function isColdStartAnswer(answer: TenantAnswer): boolean {
  if (answer.status >= 200 && answer.status < 300) return false;
  const problem = isProblem(answer.body, answer.contentType) ? (answer.body as ProblemDetails) : null;
  const error = errorFromResponse(
    answer.status,
    answer.body,
    problem,
    answer.body === null,
    answer.retryAfterSeconds,
    answer.contentType,
  );
  return isTenantResolutionError(error);
}
