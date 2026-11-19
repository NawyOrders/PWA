import { describe, expect, it } from "vitest";
import { DEFAULT_AUTH_REDIRECT } from "@/lib/routes";
import { loginViewParams } from "@/app/login/page";

/*
 * The login screen is the only place `?next` is read, so the sanitising has to
 * be proven at that door rather than assumed from the helper it calls. These
 * are the values a real link — or a hand-written address bar — can hand the
 * page.
 */
describe("login page query string", () => {
  it("keeps an in-app destination", () => {
    expect(loginViewParams({ next: "/checkout/payment?method=cash" })).toEqual({
      next: "/checkout/payment?method=cash",
      mode: "Login",
    });
  });

  it.each(["//evil.example", "https://evil.example", "/\\evil.example", "javascript:alert(1)"])(
    "refuses the post-login destination %s",
    (next) => {
      expect(loginViewParams({ next }).next).toBe(DEFAULT_AUTH_REDIRECT);
    },
  );

  it("refuses a protocol-relative host dressed up as a path", () => {
    // Browsers drop the tab, leaving `//evil.example` — the same origin check
    // the redirect itself would apply.
    expect(loginViewParams({ next: "/\t/evil.example" }).next).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("falls back when nothing was asked for", () => {
    expect(loginViewParams({}).next).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("opens the registration door only for ?mode=register", () => {
    expect(loginViewParams({ mode: "register" }).mode).toBe("Registration");
    expect(loginViewParams({ mode: ["register", "other"] }).mode).toBe("Registration");
    expect(loginViewParams({ mode: "login" }).mode).toBe("Login");
    expect(loginViewParams({ mode: "" }).mode).toBe("Login");
    expect(loginViewParams({}).mode).toBe("Login");
  });
});
