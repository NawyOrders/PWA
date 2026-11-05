/**
 * Typed customer-side client for the NawyOrders tenant API.
 *
 * Contract: swagger/v1/swagger.json (OpenAPI 3.0.1) as published on
 * https://tenant-api.nawyorders.com. Every response is wrapped in
 * `{ statusCode, isSuccess, data, errors, timestamp }`, so this module is the
 * only place that knows about the envelope: callers get typed data back or an
 * `ApiError` whose `messageKey` is an Arabic dictionary key (the app is
 * Arabic-first, so the API layer speaks the UI's error vocabulary and `t()`
 * turns it into the active language).
 *
 * Everything is inert until `NEXT_PUBLIC_API_BASE_URL` is configured, which
 * keeps the deployed site on its local demo data until the backend is ready.
 */

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

export type OtpChallenge = {
  challengeId: string;
  expiresAtUtc: string;
  expiresInSeconds: number;
  /**
   * Only ever populated by the backend in dev/test environments. It is handed
   * to the copyable popup behind an explicit environment gate, never logged
   * and never used to decide whether the code was correct.
   */
  devOtpCode: string | null;
};

export type CustomerSessionPayload = {
  customerId: string;
  phoneNumber: string;
  fullName: string;
  email: string | null;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAtUtc: string;
  refreshToken: string;
};

export type TokenPair = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string | null;
};

export type ApiErrorKind =
  | "offline"
  | "timeout"
  | "validation"
  | "unauthorized"
  | "notFound"
  | "conflict"
  | "rateLimited"
  | "server"
  | "envelope";

/** Error thrown for every failed API interaction, network level or envelope. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly fields: Record<string, string>;
  /**
   * `Retry-After` from a 429, in whole seconds — the contract says a rate
   * limited response carries it, and it is the only honest number for "how long
   * do I wait". `null` when the server did not say.
   */
  readonly retryAfterSeconds: number | null;

  constructor(
    kind: ApiErrorKind,
    status: number,
    fields: Record<string, string> = {},
    retryAfterSeconds: number | null = null,
  ) {
    super(kind);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

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
 * Arabic keys the login screens can render through `t()`. The API's own
 * messages are English and never shown to a customer directly.
 */
const FIELD_MESSAGE_KEYS: Record<string, string> = {
  phoneNumber: "رقم الموبايل غير صحيح",
  purpose: "طلب غير صحيح، جرب تاني",
  channel: "طلب غير صحيح، جرب تاني",
  challengeId: "انتهت صلاحية الكود، اطلب كود جديد",
  code: "الكود غير صحيح، جرب تاني",
  fullName: "اكتب اسمك بالكامل",
  refreshToken: "انتهت الجلسة، سجّل الدخول تاني",
};

const KIND_MESSAGE_KEYS: Record<ApiErrorKind, string> = {
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

export function apiErrorMessageKey(error: unknown): string {
  if (!(error instanceof ApiError)) return KIND_MESSAGE_KEYS.server;
  const field = Object.keys(error.fields)[0];
  if (field && FIELD_MESSAGE_KEYS[field]) return FIELD_MESSAGE_KEYS[field];
  return KIND_MESSAGE_KEYS[error.kind];
}

/** Trimmed, slash-free base URL — empty string means "API not configured". */
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

export function apiConfigured(): boolean {
  return apiBaseUrl() !== "";
}

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

type Envelope<T> = {
  isSuccess?: boolean;
  data?: T | null;
  errors?: Record<string, string> | null;
  statusCode?: number;
};

const kindByStatus: Record<number, ApiErrorKind> = {
  401: "unauthorized",
  404: "notFound",
  409: "conflict",
  422: "validation",
  429: "rateLimited",
};

const REQUEST_TIMEOUT_MS = 12000;

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
  /** Sent as `If-None-Match` so a cached branding payload costs a 304. */
  etag?: string | null;
  tenantId?: string | null;
  timeoutMs?: number;
};

type RawResponse = {
  status: number;
  /** `undefined` when the server answered 304 with an empty body. */
  body: unknown;
  etag: string | null;
  /** `Retry-After` on the response, in seconds, when the server sent one. */
  retryAfterSeconds: number | null;
};

async function rawRequest(path: string, options: RequestOptions = {}): Promise<RawResponse> {
  const base = apiBaseUrl();
  if (!base) throw new ApiError("offline", 0);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.etag) headers["If-None-Match"] = options.etag;
  // `X-Tenant-Id` is only a consistency check against the token's tenant.
  const tenantId = options.tenantId ?? process.env.NEXT_PUBLIC_TENANT_ID ?? "";
  if (tenantId) headers["X-Tenant-Id"] = tenantId;

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      // Cookies never carry this session: the tokens live in storage and go
      // out as an Authorization header, which keeps CSRF off the table.
      credentials: "omit",
    });
  } catch (cause) {
    clearTimeout(timeout);
    throw new ApiError(cause instanceof Error && cause.name === "AbortError" ? "timeout" : "offline", 0);
  }
  clearTimeout(timeout);

  const etag = response.headers.get("ETag");
  const retryAfterSeconds = parseRetryAfter(response.headers.get("Retry-After"));
  if (response.status === 304) {
    return { status: 304, body: undefined, etag, retryAfterSeconds };
  }

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new ApiError(
      kindByStatus[response.status] ?? (response.status >= 500 ? "server" : "validation"),
      response.status,
      envelopeErrors(parsed),
      retryAfterSeconds,
    );
  }

  return { status: response.status, body: parsed, etag, retryAfterSeconds };
}

function envelopeErrors(value: unknown): Record<string, string> {
  const envelope = value as Envelope<unknown> | null;
  const errors = envelope?.errors;
  if (!errors || typeof errors !== "object") return {};
  const fields: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    if (typeof message === "string") fields[key] = message;
  }
  return fields;
}

/** Unwraps the envelope and throws when the call did not succeed. */
function unwrap<T>(body: unknown, status: number, retryAfterSeconds: number | null = null): T {
  const envelope = body as Envelope<T> | null;
  if (!envelope || typeof envelope !== "object") throw new ApiError("envelope", status, {}, retryAfterSeconds);
  if (envelope.isSuccess === false || envelope.data === null || envelope.data === undefined) {
    // The envelope repeats the transport status, so trust it when it is there.
    const code = typeof envelope.statusCode === "number" ? envelope.statusCode : status;
    throw new ApiError(
      kindByStatus[code] ?? (code >= 500 ? "server" : "validation"),
      code,
      envelopeErrors(body),
      retryAfterSeconds,
    );
  }
  return envelope.data;
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

export async function requestOtp(options: {
  phoneNumber: string;
  channel?: OtpChannel;
  purpose?: string;
}): Promise<OtpChallenge> {
  const response = await rawRequest("/api/v1/auth/otp/request", {
    method: "POST",
    body: {
      phoneNumber: options.phoneNumber,
      purpose: options.purpose ?? "login",
      channel: options.channel ?? "sms",
    },
  });
  const data = unwrap<Partial<OtpChallenge>>(response.body, response.status, response.retryAfterSeconds);
  if (typeof data.challengeId !== "string" || !data.challengeId) {
    throw new ApiError("envelope", response.status, {}, response.retryAfterSeconds);
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

export async function verifyOtp(options: {
  challengeId: string;
  code: string;
  fullName?: string;
}): Promise<CustomerSessionPayload> {
  const fullName = (options.fullName ?? "").trim();
  const response = await rawRequest("/api/v1/auth/otp/verify", {
    method: "POST",
    body: {
      challengeId: options.challengeId,
      code: options.code,
      // `fullName` is what registers a first-time customer. A returning one
      // simply leaves it out rather than posting an empty string the backend
      // could read as "rename me to nothing".
      ...(fullName ? { fullName } : {}),
    },
  });
  const data = unwrap<Partial<CustomerSessionPayload>>(response.body, response.status, response.retryAfterSeconds);
  if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    throw new ApiError("envelope", response.status, {}, response.retryAfterSeconds);
  }
  return {
    customerId: typeof data.customerId === "string" ? data.customerId : "",
    phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
    fullName: typeof data.fullName === "string" ? data.fullName : "",
    email: typeof data.email === "string" ? data.email : null,
    accessToken: data.accessToken,
    tokenType: typeof data.tokenType === "string" ? data.tokenType : "Bearer",
    expiresIn: Number.isFinite(data.expiresIn) ? Number(data.expiresIn) : 0,
    expiresAtUtc: typeof data.expiresAtUtc === "string" ? data.expiresAtUtc : "",
    refreshToken: data.refreshToken,
  };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const response = await rawRequest("/api/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
  const data = unwrap<Partial<TokenPair>>(response.body, response.status, response.retryAfterSeconds);
  if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    throw new ApiError("envelope", response.status, {}, response.retryAfterSeconds);
  }
  return {
    accessToken: data.accessToken,
    tokenType: typeof data.tokenType === "string" ? data.tokenType : "Bearer",
    expiresIn: Number.isFinite(data.expiresIn) ? Number(data.expiresIn) : 0,
    expiresAtUtc: typeof data.expiresAtUtc === "string" ? data.expiresAtUtc : "",
    refreshToken: data.refreshToken,
    refreshTokenExpiresAtUtc:
      typeof data.refreshTokenExpiresAtUtc === "string" ? data.refreshTokenExpiresAtUtc : null,
  };
}

export async function revokeRefreshToken(refreshToken: string, reason = "logout"): Promise<void> {
  await rawRequest("/api/v1/auth/revoke", { method: "POST", body: { refreshToken, reason } });
}
