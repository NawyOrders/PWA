import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_MAX_ATTEMPTS, OTP_LENGTH, generateOtpCode } from "@/lib/otp";

/**
 * Feeds `getRandomValues` a scripted sequence so the rejection branch and the
 * exhausted-draw branch are reachable without waiting for a one-in-ten-million
 * accident.
 */
function stubRandomValues(values: number[]) {
  let index = 0;
  vi.stubGlobal("crypto", {
    getRandomValues: (buffer: Uint32Array) => {
      for (let slot = 0; slot < buffer.length; slot += 1) {
        buffer[slot] = values[index % values.length];
        index += 1;
      }
      return buffer;
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateOtpCode", () => {
  it("returns six digits", () => {
    const code = generateOtpCode();

    expect(code).toHaveLength(OTP_LENGTH);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("honours a requested length", () => {
    expect(generateOtpCode(4)).toMatch(/^\d{4}$/);
  });

  it("gives a different code to each request", () => {
    const codes = [generateOtpCode(), generateOtpCode(), generateOtpCode(), generateOtpCode()];

    expect(new Set(codes).size).toBe(codes.length);
  });

  it("spreads the digits instead of repeating one value", () => {
    const codes = Array.from({ length: 2_000 }, () => generateOtpCode());

    // A constant or a counter shows up as one or two distinct values here; true
    // randomness over 2,000 six-digit codes gives near-2,000 distinct ones.
    expect(new Set(codes).size).toBeGreaterThan(1_900);
  });

  it("gives every digit the same chance", () => {
    const counts = new Array(10).fill(0);
    const digits = Array.from({ length: 6_000 }, () => generateOtpCode()).join("");
    for (const char of digits) counts[Number(char)] += 1;

    const expected = digits.length / 10;
    // A 10% band is ~7 standard deviations for this sample size, so it only
    // fails if the generator is actually biased (e.g. `% 10` without rejection).
    for (const count of counts) {
      expect(count).toBeGreaterThan(expected * 0.9);
      expect(count).toBeLessThan(expected * 1.1);
    }
  });

  it("redraws values that would skew the digits", () => {
    // 4294967295 is above the largest multiple of ten below 2^32, so it must be
    // skipped rather than folded into a digit.
    stubRandomValues([4294967295, 4294967295, 7, 1, 2, 3, 4, 5, 6]);

    expect(generateOtpCode()).toBe("712345");
  });

  it("gives up instead of looping forever on a broken generator", () => {
    stubRandomValues([4294967295]);

    expect(generateOtpCode()).toBe("");
  });

  it("refuses to invent a code without a cryptographic source", () => {
    vi.stubGlobal("crypto", undefined);
    expect(generateOtpCode()).toBe("");

    vi.stubGlobal("crypto", {});
    expect(generateOtpCode()).toBe("");
  });

  it("keeps the demo limits the login form relies on", () => {
    expect(OTP_LENGTH).toBe(6);
    expect(DEMO_MAX_ATTEMPTS).toBe(5);
  });
});
