import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteChrome } from "@/components/site-chrome";
import { LoginView } from "@/components/login-view";
import { useCustomerSession } from "@/hooks/use-customer-session";
import { MOCK_TEST_PHONES, authMock } from "@/lib/auth-mock";
import { loginHref } from "@/lib/routes";
import { storageKeys } from "@/lib/storage";
import { renderApp } from "@/test/render";

/**
 * The whole customer journey with nothing stubbed but the network.
 *
 * `AUTH_MOCK` puts the app on the contract simulator, so every screen, the
 * provider, the session store and the route guard run exactly as they do
 * against the tenant API — only the HTTP hop is replaced. The customer here is
 * played by `userEvent`, not by calling internals: the code is read off the
 * popup the way it is read off an SMS, and the boxes are typed one digit at a
 * time.
 */

const nav = vi.hoisted(() => ({
  pathname: "/login",
  replace: vi.fn(),
  push: vi.fn(),
  setPath: null as null | ((path: string) => void),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({
    replace: (path: string) => {
      nav.replace(path);
      nav.setPath?.(path);
    },
    push: (path: string) => {
      nav.push(path);
      nav.setPath?.(path);
    },
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : String(href.pathname ?? "")} {...props}>
      {children}
    </a>
  ),
}));

type Call = { url: string; method: string; headers: Headers; body: string | null };

const PHONE = MOCK_TEST_PHONES.newCustomer;
const NAME = "مينا جويدي";

/** An authenticated call needs an answer; what is under test is how it was asked. */
function stubNetwork() {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({
        url: String(input),
        method: init.method ?? "GET",
        headers: new Headers(init.headers ?? {}),
        body: typeof init.body === "string" ? init.body : null,
      });
      return new Response('{"orders":[]}', {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

function FlowProbe() {
  const { customer, status, loggedIn, logout, authFetch } = useCustomerSession();
  const [fetched, setFetched] = useState("idle");
  return (
    <div>
      <p>protected content</p>
      <p data-testid="session">
        {JSON.stringify({
          status,
          loggedIn,
          phone: customer?.phoneNumber ?? null,
          name: customer?.fullName ?? null,
        })}
      </p>
      <button type="button" onClick={() => void authFetch("/api/v1/orders").then((response) => setFetched(String(response.status)))}>
        probe fetch
      </button>
      <button type="button" onClick={() => logout()}>
        probe logout
      </button>
      <p data-testid="fetched">{fetched}</p>
    </div>
  );
}

/**
 * The real chrome around the real screens, with the router replaced by a
 * pathname the app itself moves. `/login` shows the form; anything else stands
 * in for a protected page, so the guard is exercised rather than quoted.
 */
function Flow({ mode = "Registration" }: { mode?: "Login" | "Registration" }) {
  const [pathname, setPathname] = useState("/login");
  nav.pathname = pathname;
  useEffect(() => {
    nav.setPath = (path: string) => setPathname(path.split("?")[0] ?? "/login");
    return () => {
      nav.setPath = null;
    };
  }, []);
  return (
    <SiteChrome>
      {pathname === "/login" ? <LoginView next="/profile" mode={mode} /> : <FlowProbe />}
    </SiteChrome>
  );
}

/** The code is read off the popup, then the popup is closed like a customer would. */
async function readCodeFromThePopup(): Promise<string> {
  const dialog = await screen.findByRole("dialog");
  const code = within(dialog).getByText(/^\d{6}$/).textContent ?? "";
  expect(code).toMatch(/^\d{6}$/);
  await userEvent.click(within(dialog).getByRole("button", { name: "إغلاق" }));
  return code;
}

/**
 * Types a code the way a phone does: one digit at a time, no submit click.
 *
 * The boxes are not read back afterwards on purpose — six digits trigger the
 * submit, and a rejected code clears them again, so the only honest statement
 * about what the customer typed is the API call it produced.
 */
async function typeCode(code: string): Promise<void> {
  const boxes = code.split("").map((_, index) => box(index + 1));
  await userEvent.click(boxes[0]!);
  await userEvent.keyboard(code);
}

function box(n: number): HTMLInputElement {
  return screen.getByRole("textbox", { name: `خانة الكود ${n}` }) as HTMLInputElement;
}

function sessionLine(): { status: string; loggedIn: boolean; phone: string | null; name: string | null } {
  return JSON.parse(String(screen.getByTestId("session").textContent)) as {
    status: string;
    loggedIn: boolean;
    phone: string | null;
    name: string | null;
  };
}

const ordersCalls = (calls: Call[]) => calls.filter((call) => call.url.includes("/api/v1/orders"));

beforeEach(() => {
  authMock.reset();
  nav.pathname = "/login";
  nav.replace.mockClear();
  vi.stubEnv("NEXT_PUBLIC_AUTH_MOCK", "true");
  vi.stubEnv("NEXT_PUBLIC_TENANT_API_BASE_URL", "https://tenant-api.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the OTP login journey, in mock mode", () => {
  it("registers, lands on the protected page, refreshes silently and logs out", async () => {
    const calls = stubNetwork();

    renderApp(<Flow />);

    // 1. Ask for a code as a new account, separators and all.
    await userEvent.type(screen.getByLabelText("رقم الموبايل"), PHONE.replace("+20", "0020 "));
    await userEvent.type(screen.getByLabelText("الاسم بالكامل"), NAME);
    await userEvent.click(screen.getByRole("button", { name: "إرسال" }));
    const code = await readCodeFromThePopup();

    // 2. Spend it. Six digits are the whole form.
    await typeCode(code);

    // 3. The session is live and the app moved on by itself.
    await waitFor(() => expect(screen.getByText("protected content")).toBeInTheDocument());
    expect(nav.replace).toHaveBeenCalledWith("/profile");
    await waitFor(() => expect(sessionLine().loggedIn).toBe(true));
    expect(sessionLine().status).toBe("active");
    expect(sessionLine().phone).toBe(PHONE);

    // The name the customer typed is the account the backend made, and the only
    // thing storage ever holds is that identity: no token of either kind.
    const stored = JSON.parse(String(localStorage.getItem(storageKeys.session))) as Record<string, unknown>;
    expect(stored.fullName).toBe(NAME);
    expect(Object.keys(stored).sort()).toEqual(["customerId", "email", "fullName", "phoneNumber"]);
    expect(JSON.stringify(stored)).not.toMatch(/token/i);

    // 4. An ordinary authenticated call carries the bearer token, no cookie and
    //    no tenant header — the host is the tenant's, and that is the backend's job.
    await userEvent.click(screen.getByRole("button", { name: "probe fetch" }));
    await waitFor(() => expect(ordersCalls(calls)).toHaveLength(1));
    expect(ordersCalls(calls)[0]?.headers.get("Authorization")).toMatch(/^Bearer /);
    expect(ordersCalls(calls)[0]?.headers.has("X-Tenant-Id")).toBe(false);
    const firstToken = ordersCalls(calls)[0]?.headers.get("Authorization");

    // 5. Let the access token run into its refresh window, then call again. The
    //    customer does nothing, and the token underneath changes anyway.
    vi.setSystemTime(Date.now() + (3600 - 30) * 1000);
    const beforeRotation = authMock.peekCookie();
    await userEvent.click(screen.getByRole("button", { name: "probe fetch" }));
    await waitFor(() => expect(ordersCalls(calls)).toHaveLength(2));
    expect(ordersCalls(calls)[1]?.headers.get("Authorization")).toMatch(/^Bearer /);
    expect(ordersCalls(calls)[1]?.headers.get("Authorization")).not.toBe(firstToken);
    expect(authMock.peekCookie()).not.toBe(beforeRotation);
    // Rotation stayed the cookie's business: no page request carried a token.
    expect(JSON.stringify(calls.map((call) => call.body))).not.toMatch(/refreshToken/);

    // 6. Logout revokes upstream and clears locally, and the guard puts the
    //    customer back on the form with the return path intact.
    await userEvent.click(screen.getByRole("button", { name: "probe logout" }));
    await waitFor(() => expect(authMock.peekCookie()).toBeNull());
    // The guard, not the logout button, is what ends the visit: as soon as the
    // session is gone the protected page comes down and the form is back with
    // the return path, so pressing back returns the customer to where they were.
    await waitFor(() => expect(screen.queryByText("protected content")).not.toBeInTheDocument());
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(loginHref("/profile")));
    await waitFor(() => expect(screen.getByLabelText("رقم الموبايل")).toBeInTheDocument());
    // Storage is written empty rather than deleted, and an empty session is
    // literally `null`: no identity, so nothing that could half-restore later.
    expect(JSON.parse(String(localStorage.getItem(storageKeys.session)))).toBeNull();
  }, 30_000);

  it("signs a returning customer in with a phone number alone", async () => {
    stubNetwork();
    // Seed the account the way a first order would have, through the API alone.
    const seeded = await authMock.requestOtp({ phoneNumber: PHONE, purpose: "Registration" });
    await authMock.verifyOtp({
      challengeId: seeded.challengeId,
      code: seeded.devOtpCode ?? "",
      fullName: NAME,
      purpose: "Registration",
    });

    renderApp(<Flow mode="Login" />);

    await userEvent.type(screen.getByLabelText("رقم الموبايل"), PHONE);
    await userEvent.click(screen.getByRole("button", { name: "إرسال" }));
    const code = await readCodeFromThePopup();
    await typeCode(code);

    await waitFor(() => expect(screen.getByText("protected content")).toBeInTheDocument());
    expect(sessionLine().phone).toBe(PHONE);
    // The name on the account came back from the API, not from a field the
    // customer had to fill: `Login` asks for a phone and nothing else.
    expect(sessionLine().name).toBe(NAME);
    // The form is gone, so a spent challenge cannot be typed into again.
    expect(screen.queryByRole("textbox", { name: "خانة الكود 1" })).not.toBeInTheDocument();
  }, 30_000);

  it("walks an unknown number over to registration with the phone kept", async () => {
    stubNetwork();
    renderApp(<Flow mode="Login" />);

    await userEvent.type(screen.getByLabelText("رقم الموبايل"), MOCK_TEST_PHONES.unknown);
    await userEvent.click(screen.getByRole("button", { name: "إرسال" }));
    const code = await readCodeFromThePopup();
    await typeCode(code);

    // Nobody owns that number, so the API answers 404 and the screen changes
    // its own question instead of reporting a failure.
    expect(await screen.findByText("أنشئ حساب جديد")).toBeInTheDocument();
    // Two things are said at once and both are true: the number has no account,
    // and the field the new question needs is the name.
    const alerts = screen.getAllByRole("alert").map((element) => element.textContent);
    expect(alerts).toContain("مفيش حساب بالموبيل ده، سجّل حساب جديد");
    expect(alerts).toContain("اكتب اسمك بالكامل");
    expect((screen.getByLabelText("رقم الموبايل") as HTMLInputElement).value).toBe(MOCK_TEST_PHONES.unknown);
    // The dead challenge is retired: the boxes go back to waiting for a new
    // code rather than offering the spent one for another try.
    await waitFor(() => expect(box(1)).toBeDisabled());
    expect(screen.getByRole("button", { name: "إرسال" })).toBeEnabled();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  }, 30_000);
});
