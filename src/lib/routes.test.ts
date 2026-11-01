import { describe, expect, it } from "vitest";
import { DEFAULT_AUTH_REDIRECT, isProtectedPath, loginHref, sanitizeNextPath } from "@/lib/routes";

describe("route policy", () => {
  it.each([
    ["/profile", true],
    ["/profile/edit", true],
    ["/checkout", true],
    ["/checkout/payment", true],
    ["/orders", true],
    ["/orders/10248", true],
    ["/addresses", true],
    ["/addresses/new", true],
    ["/profilex", false],
    ["/checkouts", false],
    ["/cart", false],
    ["/", false],
    ["/help/policies", false],
  ])("classifies %s as protected=%s", (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });

  it("builds an encoded login URL that preserves the destination query", () => {
    expect(loginHref("/checkout/payment?step=2")).toBe(
      "/login?next=%2Fcheckout%2Fpayment%3Fstep%3D2",
    );
    expect(loginHref()).toBe("/login?next=%2Fprofile");
  });

  it("accepts only in-app paths as post-login destinations", () => {
    expect(sanitizeNextPath("/cart")).toBe("/cart");
    expect(sanitizeNextPath("/checkout/payment?method=cash")).toBe("/checkout/payment?method=cash");
    expect(sanitizeNextPath("/orders/10248")).toBe("/orders/10248");
  });

  it("falls back for missing destinations", () => {
    expect(sanitizeNextPath(undefined)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeNextPath(null)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeNextPath("")).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "cart"])(
    "rejects open-redirect payload %s",
    (payload) => {
      expect(sanitizeNextPath(payload)).toBe(DEFAULT_AUTH_REDIRECT);
    },
  );

  it("prevents a login redirect loop", () => {
    expect(sanitizeNextPath("/login")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(sanitizeNextPath("/login?next=/profile")).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("supports a caller-provided fallback", () => {
    expect(sanitizeNextPath("//evil.example", "/cart")).toBe("/cart");
  });
});
