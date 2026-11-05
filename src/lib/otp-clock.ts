/**
 * The two countdowns the OTP step runs.
 *
 * They are separate because they answer different questions. "How long is this
 * code still valid" is decided by the server and ends with the Verify button
 * going dead; "when may I ask for another code" is a cooldown this app chooses
 * (or one the server imposes with `Retry-After`) and only ever gates the resend
 * link. Sharing one timer between them is what makes a screen say "resend in
 * 00:00" while the code it is waiting for has already expired.
 */

/** How long the resend link stays out of reach after a code is issued. */
export const RESEND_COOLDOWN_SECONDS = 45;

/**
 * A countdown nobody can watch is not a countdown. The contract's own lifetime
 * is five minutes; a server that answers with an hour still gets a clock the
 * customer can read, and a nonsense value cannot pin a timer open.
 */
export const MAX_COUNTDOWN_SECONDS = 3600;

export type ChallengeTiming = {
  expiresAtUtc?: string | null;
  expiresInSeconds?: number | null;
};

/**
 * Whole seconds a freshly issued challenge stays verifiable.
 *
 * `expiresAtUtc` wins when the server sent a readable one — it is the absolute
 * truth, and a countdown built from a duration starts drifting the moment the
 * response sits in a queue. `expiresInSeconds` is the documented convenience
 * value and is used when there is no timestamp to read.
 */
export function codeSecondsLeft(timing: ChallengeTiming, now: number = Date.now()): number {
  const raw = (timing.expiresAtUtc ?? "").trim();
  if (raw) {
    const at = Date.parse(raw);
    // A malformed timestamp must not be read as "expired": it falls through to
    // the duration the same response carries.
    if (Number.isFinite(at)) return clampSeconds(Math.ceil((at - now) / 1000));
  }
  const seconds = Number(timing.expiresInSeconds);
  if (!Number.isFinite(seconds)) return 0;
  return clampSeconds(Math.floor(seconds));
}

/** A number a countdown can be built from: never negative, never absurd. */
function clampSeconds(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.min(Math.floor(seconds), MAX_COUNTDOWN_SECONDS);
}

/**
 * How long before the resend link is offered again.
 *
 * Never longer than the code itself — asking a customer to wait five minutes to
 * retry a code that dies in five minutes is a dead end — and a challenge with no
 * readable lifetime still gets the normal cooldown rather than a free-for-all.
 */
export function resendCooldownSeconds(codeSeconds: number, cap = RESEND_COOLDOWN_SECONDS): number {
  if (!Number.isFinite(codeSeconds) || codeSeconds <= 0) return cap;
  return Math.min(cap, codeSeconds);
}

/** `mm:ss` — the shape the screen prints inside a `dir="ltr"` span. */
export function formatCountdown(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
