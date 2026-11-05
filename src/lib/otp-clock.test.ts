import { describe, expect, it } from "vitest";
import {
  MAX_COUNTDOWN_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  codeSecondsLeft,
  formatCountdown,
  resendCooldownSeconds,
} from "@/lib/otp-clock";

const NOW = Date.parse("2026-11-05T10:00:00Z");

/** An `expiresAtUtc` the API would have sent `seconds` from the reference clock. */
function at(secondsFromNow: number): string {
  return new Date(NOW + secondsFromNow * 1000).toISOString();
}

describe("codeSecondsLeft", () => {
  it("trusts the absolute expiry over the convenience duration, because a queued response is already stale", () => {
    expect(codeSecondsLeft({ expiresAtUtc: at(300), expiresInSeconds: 30 }, NOW)).toBe(300);
  });

  it("uses the seconds field when there is no timestamp to read", () => {
    expect(codeSecondsLeft({ expiresInSeconds: 120 }, NOW)).toBe(120);
    expect(codeSecondsLeft({ expiresAtUtc: null, expiresInSeconds: 120 }, NOW)).toBe(120);
    expect(codeSecondsLeft({ expiresAtUtc: "   ", expiresInSeconds: 90 }, NOW)).toBe(90);
  });

  it("falls back to the seconds field for a malformed timestamp rather than reading it as expired", () => {
    // The same answer carries a usable lifetime, so the customer keeps the code
    // the server actually issued instead of being told it already died.
    expect(codeSecondsLeft({ expiresAtUtc: "tomorrow", expiresInSeconds: 240 }, NOW)).toBe(240);
    expect(codeSecondsLeft({ expiresAtUtc: "not a date at all", expiresInSeconds: 240 }, NOW)).toBe(240);
  });

  it("says a code whose deadline already passed is finished", () => {
    expect(codeSecondsLeft({ expiresAtUtc: at(-1), expiresInSeconds: 300 }, NOW)).toBe(0);
    expect(codeSecondsLeft({ expiresAtUtc: at(0), expiresInSeconds: 300 }, NOW)).toBe(0);
  });

  it("clamps a countdown nobody could watch and one that never started", () => {
    expect(codeSecondsLeft({ expiresAtUtc: at(90_000) }, NOW)).toBe(MAX_COUNTDOWN_SECONDS);
    expect(codeSecondsLeft({ expiresInSeconds: 90_000 }, NOW)).toBe(MAX_COUNTDOWN_SECONDS);
    expect(codeSecondsLeft({ expiresInSeconds: -30 }, NOW)).toBe(0);
  });

  it("rounds an absolute deadline up and a reported duration down", () => {
    // 59.2 seconds to a real deadline is still a minute the customer can use;
    // a duration is never rounded up into time the server did not grant.
    expect(codeSecondsLeft({ expiresAtUtc: new Date(NOW + 59_200).toISOString() }, NOW)).toBe(60);
    expect(codeSecondsLeft({ expiresInSeconds: 59.9 }, NOW)).toBe(59);
  });

  it("refuses to build a clock out of a number that is not one", () => {
    expect(codeSecondsLeft({}, NOW)).toBe(0);
    expect(codeSecondsLeft({ expiresInSeconds: null }, NOW)).toBe(0);
    expect(codeSecondsLeft({ expiresInSeconds: Number.NaN }, NOW)).toBe(0);
    expect(codeSecondsLeft({ expiresInSeconds: Number.POSITIVE_INFINITY }, NOW)).toBe(0);
  });

  it("reads the customer's own clock when no reference time is given", () => {
    expect(codeSecondsLeft({ expiresAtUtc: new Date(Date.now() + 60_000).toISOString() })).toBe(60);
    expect(codeSecondsLeft({ expiresInSeconds: 300 })).toBe(300);
  });
});

describe("resendCooldownSeconds", () => {
  it("never asks the customer to wait longer than the code itself lives", () => {
    expect(resendCooldownSeconds(10)).toBe(10);
    expect(resendCooldownSeconds(RESEND_COOLDOWN_SECONDS - 1)).toBe(RESEND_COOLDOWN_SECONDS - 1);
  });

  it("caps a long code lifetime at the cooldown this app chose", () => {
    expect(resendCooldownSeconds(300)).toBe(RESEND_COOLDOWN_SECONDS);
    expect(resendCooldownSeconds(RESEND_COOLDOWN_SECONDS)).toBe(RESEND_COOLDOWN_SECONDS);
  });

  it("keeps a normal cooldown when the challenge has no readable lifetime", () => {
    expect(resendCooldownSeconds(0)).toBe(RESEND_COOLDOWN_SECONDS);
    expect(resendCooldownSeconds(-5)).toBe(RESEND_COOLDOWN_SECONDS);
    expect(resendCooldownSeconds(Number.NaN)).toBe(RESEND_COOLDOWN_SECONDS);
  });

  it("honours the wait the server named, which is the only honest countdown", () => {
    expect(resendCooldownSeconds(300, 180)).toBe(180);
    expect(resendCooldownSeconds(120, 180)).toBe(120);
  });
});

describe("formatCountdown", () => {
  it("prints the mm:ss the screen puts inside its ltr span", () => {
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(9)).toBe("00:09");
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(3599)).toBe("59:59");
    expect(formatCountdown(MAX_COUNTDOWN_SECONDS)).toBe("60:00");
  });

  it("drops the fractional second and never counts backwards", () => {
    expect(formatCountdown(59.9)).toBe("00:59");
    expect(formatCountdown(-1)).toBe("00:00");
    expect(formatCountdown(Number.NaN)).toBe("00:00");
    expect(formatCountdown(Number.POSITIVE_INFINITY)).toBe("00:00");
  });
});
