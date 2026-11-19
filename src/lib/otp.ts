/**
 * Verification codes for the offline demo.
 *
 * With a backend configured the code is the SMS gateway's secret and this app
 * never sees it. Without one the app plays the gateway itself, and a fixed
 * stand-in is not a verification code at all — it is a master key: everyone who
 * reads the source, or remembers the number from last week, can sign in as any
 * phone number forever. So the demo code is random, lives only in memory, is
 * replaced on every request, and is burned by expiry or by too many wrong tries.
 */

/** Six digits — the same shape as the tenant API's `devOtpCode`. */
export const OTP_LENGTH = 6;

/** Wrong guesses a demo code survives before it has to be re-requested. */
export const DEMO_MAX_ATTEMPTS = 5;

/**
 * `4294967280` is the largest multiple of ten below 2^32. Values at or above it
 * are redrawn rather than folded down, so every digit keeps exactly the same
 * probability. Taking `% 10` of the whole range would bias 0-5 over 6-9, and
 * `Math.random()` is not a cryptographic source at all: its stream is
 * reproducible in the same tab, which would let an attacker predict the next
 * code instead of guessing it.
 *
 * Returns an empty string when the browser offers no CSPRNG. That is not a
 * failure to work around by falling back to a guessable number — the caller
 * tells the customer and stops.
 */
export function generateOtpCode(length: number = OTP_LENGTH): string {
  const source = globalThis.crypto;
  if (!source || typeof source.getRandomValues !== "function") return "";

  const digits: string[] = [];
  const buffer = new Uint32Array(Math.max(length, 8));
  const limit = 4294967280;
  // Bounded so a pathological RNG cannot hang the screen; a real one needs one
  // draw, because 0.0000000999 of values are rejected.
  let draws = 0;
  while (digits.length < length && draws < 50) {
    draws += 1;
    source.getRandomValues(buffer);
    for (const value of buffer) {
      if (value >= limit) continue;
      digits.push(String(value % 10));
      if (digits.length === length) break;
    }
  }

  return digits.length === length ? digits.join("") : "";
}
