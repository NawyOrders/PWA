import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginView } from "@/components/login-view";
import { renderApp } from "@/test/render";
import {
  ApiError,
  type AppErrorKind,
  type AuthErrorCode,
  type CustomerSessionPayload,
} from "@/lib/api";
import { user as seedUser } from "@/lib/data";
import { storageKeys } from "@/lib/storage";

const router = vi.hoisted(() => ({ replace: vi.fn() }));

/**
 * The same screen runs in two worlds: the offline demo (no base URL) and the
 * tenant API. `apiMode` flips which one the mocked client reports, so both
 * paths get covered without ever touching the network.
 */
const apiMode = vi.hoisted(() => ({ configured: false }));
const api = vi.hoisted(() => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  fetchBranding: vi.fn(),
  refreshSession: vi.fn(),
  revokeSession: vi.fn(),
  attachStoredRefresh: vi.fn(),
}));

/**
 * The demo code is random, so the suite drives the generator from here: a fixed
 * value keeps the long-standing "123456" assertions readable, changing it
 * between requests proves the screen really re-reads it, and an empty one
 * simulates a browser with no cryptographic source.
 */
const fakeOtp = vi.hoisted(() => ({ code: "123456" }));

vi.mock("@/lib/otp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/otp")>();
  return { ...actual, generateOtpCode: () => fakeOtp.code };
});

/**
 * `authTransport` is mocked rather than left to the environment because it is
 * what the screen branches on: `demo` mints and answers a code in the browser,
 * anything else goes to the API. Past that boundary every call is a plain
 * function mock, so a test can say exactly which request the screen made.
 */
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiConfigured: () => apiMode.configured,
    apiBaseUrl: () => (apiMode.configured ? "https://api.test" : ""),
    authTransport: () => (apiMode.configured ? "live" : "demo"),
    requestOtp: api.requestOtp,
    verifyOtp: api.verifyOtp,
    fetchBranding: api.fetchBranding,
    refreshSession: api.refreshSession,
    revokeSession: api.revokeSession,
    attachStoredRefresh: api.attachStoredRefresh,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: router.replace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

type Challenge = {
  challengeId: string;
  expiresAtUtc: string;
  expiresInSeconds: number;
  devOtpCode: string | null;
};

/**
 * A challenge the countdowns can be read off. `expiresAtUtc` is left empty on
 * purpose: the documented `expiresInSeconds` is then what the screen counts
 * down from, and a written-down timestamp would quietly age out of date and
 * turn every timer into whatever the fallback happens to be. The one case that
 * cares about an absolute expiry sets it itself.
 */
function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    challengeId: "challenge-1",
    expiresAtUtc: "",
    expiresInSeconds: 120,
    devOtpCode: "246810",
    ...overrides,
  };
}

/**
 * What `/auth/otp/verify` answers. The refresh token is not in it: the app
 * server put that in an httpOnly cookie and handed the same envelope back with
 * the token taken out.
 */
const sessionPayload: CustomerSessionPayload = {
  customerId: "customer-1",
  phoneNumber: "+201012345678",
  fullName: "Nawy Guest",
  email: null,
  accessToken: "access-token",
  tokenType: "Bearer",
  expiresIn: 900,
  expiresAtUtc: "2026-11-05T10:15:00Z",
};

/**
 * A failure built the way `src/lib/api.ts` builds one now: a single options
 * object, the domain `code` the catalog names, `fieldErrors` keyed by the API's
 * own property names, and `retryAfterSeconds` when the server said how long.
 */
function apiError(options: {
  kind: AppErrorKind;
  status: number;
  code?: AuthErrorCode | null;
  fieldErrors?: Record<string, string>;
  retryAfterSeconds?: number | null;
  problemDetail?: string | null;
}): ApiError {
  return new ApiError(options);
}

/** A request the test gets to finish on its own schedule. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

/** A request that never finishes, for proving nothing re-submits behind it. */
function pendingForever(): Promise<never> {
  return new Promise<never>(() => undefined);
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The boxes are found by the label the screen gives each one, which is also the
 * requirement itself: a code split over six inputs is only usable — by a screen
 * reader or by `getByRole` — if a digit's box can be named.
 */
function otpInputs(): HTMLInputElement[] {
  return screen.getAllByRole("textbox", { name: /خانة الكود/ }) as HTMLInputElement[];
}

function sendButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /^إرسال$/ }) as HTMLButtonElement;
}

function verifyButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /تأكيد الكود/ }) as HTMLButtonElement;
}

/** While a verify is open the submit button is a spinner, so it has its own name. */
function busyVerifyButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "جارٍ تسجيل الدخول" }) as HTMLButtonElement;
}

function resendButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: /إعادة إرسال الكود/ }) as HTMLButtonElement;
}

function codeValidity(): HTMLElement {
  return screen.getByText(/الكود صالح لمدة/);
}

function resendRow(): HTMLElement {
  return screen.getByText(/إعادة الإرسال بعد|معاودة الطلب بعد/);
}

/** Every failure the screen shows is a `role="alert"`; the toast repeats the same sentence. */
function alerts(): string {
  return screen.queryAllByRole("alert").map((node) => node.textContent ?? "").join("\n");
}

async function expectAlert(pattern: string | RegExp) {
  await waitFor(() => expect(alerts()).toMatch(pattern));
}

function storedSession(): string | null {
  return localStorage.getItem(storageKeys.session);
}

function fillCode(value: string) {
  otpInputs().forEach((input, index) => {
    fireEvent.change(input, { target: { value: value[index] ?? "" } });
  });
}

function pasteCode(value: string, index = 0) {
  fireEvent.paste(otpInputs()[index], { clipboardData: { getData: () => value } });
}

function codeValues(): string[] {
  return otpInputs().map((input) => input.value);
}

/** The form's own submit path — what the browser's implicit submission reaches. */
function submitForm() {
  const form = document.querySelector("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("the login form is missing");
  fireEvent.submit(form);
}

/**
 * Closes the copyable popup, which is where focus is parked while it is open.
 * Tests that type into the boxes do this first so nothing is competing with the
 * dialog for focus.
 */
async function closeCodeDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "إغلاق" }));
}

beforeEach(() => {
  apiMode.configured = false;
  fakeOtp.code = "123456";
  api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: null });
  api.refreshSession.mockResolvedValue({
    accessToken: "rotated-token",
    tokenType: "Bearer",
    expiresIn: 900,
    expiresAtUtc: "2026-11-05T10:15:00Z",
    refreshToken: "rotated-refresh",
    refreshTokenExpiresAtUtc: null,
  });
  api.revokeSession.mockResolvedValue(undefined);
  api.attachStoredRefresh.mockResolvedValue(undefined);
});

/* -------------------------------------------------------------------------- */
/* Driving the screen                                                         */
/* -------------------------------------------------------------------------- */

/** The offline demo path: the app is its own gateway and hands the code back. */
async function requestCode(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
  await user.click(sendButton());
  await screen.findByText(/استخدم كود التجربة 123456/);
}

/** The same step against the mocked API, on the real clock. */
async function requestApiCode(user: ReturnType<typeof userEvent.setup>, phone = "01012345678") {
  await user.type(screen.getByLabelText("رقم الموبايل"), phone);
  await user.click(sendButton());
  await waitFor(() => expect(api.requestOtp).toHaveBeenCalled());
}

/**
 * The same step with the clock under the test's control. Bulk-advancing the
 * faked clock only moves one second at a time — each countdown reschedules
 * itself from the render its own tick caused — so seconds are walked.
 */
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function tickSeconds(seconds: number) {
  for (let index = 0; index < seconds; index += 1) {
    await tick(1_000);
  }
}

async function sendWithClock(phone = "01012345678") {
  fireEvent.change(screen.getByLabelText("رقم الموبايل"), { target: { value: phone } });
  await act(async () => {
    fireEvent.click(sendButton());
  });
  await tick(1);
}

describe("LoginView", () => {
  it("keeps the OTP fields and submit locked before a code is requested", async () => {
    renderApp(<LoginView />);

    await waitFor(() => expect(otpInputs()).toHaveLength(6));
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(verifyButton()).toBeDisabled();
    expect(screen.queryByText(/استخدم كود التجربة/)).not.toBeInTheDocument();
    // Nothing has been asked for, so nothing has been sent.
    expect(api.requestOtp).not.toHaveBeenCalled();
  });

  it("names every part of the form the customer has to work out", async () => {
    renderApp(<LoginView />);

    await waitFor(() => expect(otpInputs()).toHaveLength(6));
    for (let index = 1; index <= 6; index += 1) {
      expect(screen.getByRole("textbox", { name: `خانة الكود ${index}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("radiogroup", { name: "عندك حساب عندنا؟" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "طريقة استلام الكود" })).toBeInTheDocument();
    expect(screen.getByLabelText("رقم الموبايل")).toBeInTheDocument();
    expect(screen.getByLabelText("الاسم بالكامل")).toBeInTheDocument();
    for (const input of otpInputs()) {
      expect(input).toHaveAttribute("autocomplete", "one-time-code");
      expect(input).toHaveAttribute("inputmode", "numeric");
      expect(input).toHaveAttribute("maxlength", "1");
    }
    // The digits are Latin numerals inside an RTL page, so the row is LTR — and
    // the row is a named group, not six unlabelled boxes.
    const codeGroup = screen.getByRole("group", { name: "كود التحقق" });
    expect(codeGroup).toHaveAttribute("dir", "ltr");
    expect(within(codeGroup).getAllByRole("textbox")).toHaveLength(6);
  });

  it("refuses to ask for a code before there is a usable phone number", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "123");
    await user.click(sendButton());

    await expectAlert("اكتب رقم موبايل صحيح الأول");
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(api.requestOtp).not.toHaveBeenCalled();
  });

  it("says the code step needs a code before it needs a submit", async () => {
    renderApp(<LoginView />);

    await waitFor(() => expect(otpInputs()).toHaveLength(6));
    // Implicit submission reaches the submitter even though its button is locked.
    submitForm();

    expect(alerts()).toContain("اطلب كود التحقق الأول");
    expect(api.verifyOtp).not.toHaveBeenCalled();
  });

  it("unlocks the OTP, reveals the demo hint and starts both countdowns", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestCode(user);

    for (const input of otpInputs()) expect(input).toBeEnabled();
    expect(resendRow()).toHaveTextContent("إعادة الإرسال بعد");
    // A demo code lives exactly as long as the resend window: both read 00:45.
    expect(codeValidity()).toHaveTextContent("00:45");
    expect(screen.getAllByText("00:45")).toHaveLength(2);
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });

  it("reports a wrong demo code, clears the fields and does not authenticate", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView next="/checkout/payment" />);
    await requestCode(user);
    await closeCodeDialog(user);

    fillCode("111111");

    await expectAlert(/الكود غير صحيح، جرب تاني — فاضل 4 محاولات/);
    expect(codeValues()).toEqual(["", "", "", "", "", ""]);
    expect(router.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");
  });

  it("authenticates with the demo code and redirects to the requested next path", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView next="/checkout/payment" />);
    await requestCode(user);
    await closeCodeDialog(user);

    fillCode("123456");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/checkout/payment"));
    expect(screen.getByRole("status", { name: "جارٍ تسجيل الدخول" })).toBeInTheDocument();
    expect(localStorage.getItem(storageKeys.auth)).toBe("true");
    expect(JSON.parse(localStorage.getItem(storageKeys.cart)!)).toHaveLength(3);
  });

  it("defaults the redirect to the profile page", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);
    await requestCode(user);
    await closeCodeDialog(user);

    fillCode("123456");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profile"));
  });

  it("redirects an already signed-in visitor without asking for a code", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<LoginView next="/orders" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/orders"));
    expect(screen.getByLabelText("رقم الموبايل")).toHaveValue("");
    expect(api.requestOtp).not.toHaveBeenCalled();
  });

  it("pops the demo code into a copyable dialog the moment it is sent", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);
    await requestCode(user);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("كود التحقق جاهز");
    expect(within(dialog).getByText("123456")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /انسخ الكود/ })).toBeEnabled();
    // focus stays inside the popup instead of being grabbed by the boxes behind it
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("lets the customer reopen the code dialog after dismissing it", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);
    await requestCode(user);

    await closeCodeDialog(user);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/استخدم كود التجربة 123456/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /إظهار الكود/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("LoginView typing the code", () => {
  beforeEach(() => {
    apiMode.configured = true;
  });

  it("takes one digit per box and moves on by itself", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockResolvedValue(sessionPayload);
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    // The screen hands the first box focus ~120ms after the challenge lands.
    // Typing before that timer fires lets it steal the caret back out of box 2,
    // so the test waits for the step it is about to exercise.
    await waitFor(() => expect(otpInputs()[0]).toHaveFocus());

    await user.type(otpInputs()[0], "2");
    expect(otpInputs()[0]).toHaveValue("2");
    await waitFor(() => expect(otpInputs()[1]).toHaveFocus());

    await user.type(otpInputs()[1], "4");
    await waitFor(() => expect(otpInputs()[2]).toHaveFocus());
    expect(codeValues()).toEqual(["2", "4", "", "", "", ""]);

    // A keystroke that is not a digit cannot occupy a box.
    await user.type(otpInputs()[2], "x");
    expect(otpInputs()[2]).toHaveValue("");

    expect(verifyButton()).toBeDisabled();
    expect(api.verifyOtp).not.toHaveBeenCalled();
  });

  it("submits a typed code exactly once", async () => {
    // The clock is frozen and the answer is held open: the guard has to be the
    // submit itself, not a lucky gap between two renders.
    vi.useFakeTimers();
    const open = deferred<CustomerSessionPayload>();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockReturnValue(open.promise);
    renderApp(<LoginView next="/profile" />);

    await sendWithClock();

    fillCode("246810");
    await tick(1);

    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    expect(api.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge-1", code: "246810", fullName: "" });

    // The other two ways step two can start: the button and the browser's
    // implicit submission on the last box.
    fireEvent.click(busyVerifyButton());
    submitForm();
    await tick(1);

    expect(api.verifyOtp).toHaveBeenCalledTimes(1);

    await act(async () => {
      open.resolve(sessionPayload);
    });
    await tick(1);

    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/profile");
  });

  it("never re-sends a code the backend already accepted", async () => {
    // The auto-submit effect re-runs whenever `verify` changes identity, and
    // `verify` changes every second because the countdown is in its deps. So a
    // challenge that was just spent, with the redirect still catching up, used
    // to be verified again on each tick — one login, four `verifyOtp` calls and
    // a `409 Customer.OtpAlreadyUsed` waiting for the customer who already got
    // in. The digits are burned with the challenge, so there is nothing left to
    // re-submit.
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockResolvedValue(sessionPayload);
    renderApp(<LoginView next="/profile" />);

    await sendWithClock();

    fillCode("246810");
    await tick(1);
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    expect(codeValues()).toEqual(["", "", "", "", "", ""]);

    // The redirect is the app's job, not this screen's; the countdown keeps
    // ticking while it is pending.
    await tickSeconds(3);

    expect(api.verifyOtp).toHaveBeenCalledTimes(1);

    // Even an impatient customer cannot reach the network a second time for the
    // same challenge: retyping the six digits they just used is caught by the
    // spent-challenge guard, not by luck about which render ran first.
    fillCode("246810");
    await tick(1);
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    submitForm();
    await tick(1);
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    expect(alerts()).toContain("انتهت صلاحية الكود، اطلب كود جديد");
  });

  it("keeps verify disabled until all six digits are in", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    renderApp(<LoginView />);

    await sendWithClock();

    fillCode("24681");
    expect(verifyButton()).toBeDisabled();
    expect(api.verifyOtp).not.toHaveBeenCalled();

    submitForm();
    expect(alerts()).toContain("اكتب كود التحقق كامل");
    expect(api.verifyOtp).not.toHaveBeenCalled();

    fireEvent.change(otpInputs()[5], { target: { value: "0" } });
    await tick(1);
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("retires the challenge when the server's code lifetime runs out", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ expiresInSeconds: 30, devOtpCode: null }));
    renderApp(<LoginView />);

    await sendWithClock();

    expect(codeValidity()).toHaveTextContent("00:30");
    fillCode("24681");
    expect(verifyButton()).toBeDisabled();

    await tickSeconds(31);

    // The boxes go back to locked rather than stay open around a dead code.
    expect(alerts()).toContain("انتهت صلاحية الكود، اطلب كود جديد");
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(screen.queryByText(/الكود صالح لمدة/)).not.toBeInTheDocument();
    expect(verifyButton()).toBeDisabled();

    // A sixth digit typed after the expiry cannot reach the network.
    fireEvent.change(otpInputs()[5], { target: { value: "0" } });
    await tick(1);
    expect(api.verifyOtp).not.toHaveBeenCalled();

    // and the number is asked for again from the send button, not the boxes.
    expect(sendButton()).toBeEnabled();
  });

  it("counts the code down from the server's timestamp when it sends one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-11-05T10:00:00Z");
    api.requestOtp.mockResolvedValue(
      challenge({ expiresAtUtc: "2026-11-05T10:00:30Z", expiresInSeconds: 120, devOtpCode: null }),
    );
    renderApp(<LoginView />);

    await sendWithClock();

    // The absolute expiry is the truth: the duration in the same response
    // started counting when the request was made, not when it was read.
    expect(codeValidity()).toHaveTextContent("00:30");
    expect(screen.queryByText("02:00")).not.toBeInTheDocument();
  });

  it("fills every box from one paste and submits it once", async () => {
    vi.useFakeTimers();
    const open = deferred<CustomerSessionPayload>();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockReturnValue(open.promise);
    renderApp(<LoginView />);

    await sendWithClock();

    pasteCode("246810");
    expect(codeValues()).toEqual(["2", "4", "6", "8", "1", "0"]);
    await tick(1);

    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    expect(api.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge-1", code: "246810", fullName: "" });
  });

  it("strips the spaces and dashes a text message brings with it", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockResolvedValue(sessionPayload);
    renderApp(<LoginView />);

    await sendWithClock();

    pasteCode("24 68-10");
    expect(codeValues()).toEqual(["2", "4", "6", "8", "1", "0"]);
    await tick(1);
    expect(api.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge-1", code: "246810", fullName: "" });
  });

  it("truncates a paste that is longer than the code instead of splitting it", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockReturnValue(pendingForever());
    renderApp(<LoginView />);

    await sendWithClock();

    pasteCode("246810999");
    expect(otpInputs()).toHaveLength(6);
    // The digits past six are dropped, not wrapped into the boxes they do not
    // belong to.
    expect(codeValues()).toEqual(["2", "4", "6", "8", "1", "0"]);
  });

  it("ignores a paste with no digits in it", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    renderApp(<LoginView />);

    await sendWithClock();

    pasteCode("malformed");
    expect(codeValues()).toEqual(["", "", "", "", "", ""]);
    await tick(1);
    expect(api.verifyOtp).not.toHaveBeenCalled();
  });

  it("moves back a box on backspace and clears the one it lands on", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ expiresInSeconds: 300, devOtpCode: null }));
    api.verifyOtp.mockReturnValue(pendingForever());
    renderApp(<LoginView />);

    await sendWithClock();

    fillCode("246810");
    otpInputs()[4].focus();
    expect(otpInputs()[4]).toHaveFocus();

    // On a filled box a backspace clears that box (the browser takes the
    // character) and leaves the caret there — the customer is still editing it.
    fireEvent.keyDown(otpInputs()[4], { key: "Backspace" });
    expect(otpInputs()[4]).toHaveFocus();
    fireEvent.change(otpInputs()[4], { target: { value: "" } });
    expect(codeValues()).toEqual(["2", "4", "6", "8", "", "0"]);

    // From an empty box it steps back to the one that needs fixing.
    fireEvent.keyDown(otpInputs()[4], { key: "Backspace" });
    expect(otpInputs()[3]).toHaveFocus();

    fireEvent.keyDown(otpInputs()[3], { key: "ArrowLeft" });
    expect(otpInputs()[2]).toHaveFocus();
    fireEvent.keyDown(otpInputs()[2], { key: "ArrowRight" });
    expect(otpInputs()[3]).toHaveFocus();
  });

  it("does not walk out of the first box when backspace has nothing left", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    renderApp(<LoginView />);

    await sendWithClock();

    otpInputs()[0].focus();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      fireEvent.keyDown(otpInputs()[0], { key: "Backspace" });
    }
    await tick(1);

    expect(otpInputs()[0]).toHaveFocus();
    expect(otpInputs()[0]).toHaveValue("");
    expect(document.activeElement).toBe(otpInputs()[0]);
    expect(api.verifyOtp).not.toHaveBeenCalled();
  });
});

describe("LoginView against the tenant API", () => {
  beforeEach(() => {
    apiMode.configured = true;
  });

  it("asks for the name the backend needs for a first-time customer", () => {
    renderApp(<LoginView />);

    expect(screen.getByLabelText("الاسم بالكامل")).toBeInTheDocument();
    expect(screen.getByText("اختياري")).toBeInTheDocument();
    expect(screen.queryByText(/استخدم كود التجربة/)).not.toBeInTheDocument();
  });

  it("offers the two doors and the two channels the contract documents", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    const loginDoor = screen.getByRole("radio", { name: "تسجيل الدخول" });
    const registerDoor = screen.getByRole("radio", { name: "حساب جديد" });
    expect(loginDoor).toBeChecked();
    expect(registerDoor).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "رسالة SMS" })).toBeChecked();

    await user.click(registerDoor);
    expect(screen.getByRole("heading", { name: "أنشئ حساب جديد" })).toBeInTheDocument();
    expect(screen.getByText("مطلوب لتسجيل حساب جديد")).toBeInTheDocument();
    expect(verifyButton()).toHaveTextContent("تأكيد الكود وإنشاء الحساب");

    await user.click(loginDoor);
    expect(screen.getByRole("heading", { name: "تسجيل الدخول" })).toBeInTheDocument();
    expect(verifyButton()).toHaveTextContent("تأكيد الكود والمتابعة");
  });

  it("requests a challenge with the number, the purpose and the channel", async () => {
    api.requestOtp.mockResolvedValue(challenge());
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    expect(api.requestOtp).toHaveBeenCalledWith({
      phoneNumber: "+201012345678",
      purpose: "Login",
      channel: "sms",
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("246810")).toBeInTheDocument();
    expect(within(dialog).getByText(/الكود صالح 120 ثانية/)).toBeInTheDocument();
    expect(screen.queryByText(/اكتب الكود اللي وصل في/)).not.toBeInTheDocument();
  });

  it("normalises every Egyptian phone shape the contract accepts", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));

    for (const typed of ["01012345678", "+201012345678", "00201012345678", "010 1234 5678"]) {
      const { unmount } = renderApp(<LoginView />);
      fireEvent.change(screen.getByLabelText("رقم الموبايل"), { target: { value: typed } });
      await act(async () => {
        fireEvent.click(sendButton());
      });

      expect(api.requestOtp).toHaveBeenLastCalledWith({
        phoneNumber: "+201012345678",
        purpose: "Login",
        channel: "sms",
      });
      await waitFor(() => expect(otpInputs()[0]).toBeEnabled());
      unmount();
    }
  });

  it("sends nothing to the network until the customer asks for a code", () => {
    renderApp(<LoginView />);
    expect(api.requestOtp).not.toHaveBeenCalled();
    expect(api.verifyOtp).not.toHaveBeenCalled();
  });

  it("keeps the popup shut when the backend returns no test code", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/اكتب الكود اللي وصل في رسالة SMS/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /إظهار الكود/ })).not.toBeInTheDocument();
    // Nothing to read, so the boxes take the typing straight away.
    await waitFor(() => expect(otpInputs()[0]).toHaveFocus());
  });

  it("sends the channel the customer picked and names it everywhere", async () => {
    api.requestOtp.mockResolvedValue(challenge());
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await user.click(screen.getByRole("radio", { name: /واتساب/ }));
    await requestApiCode(user);

    expect(api.requestOtp).toHaveBeenCalledWith({
      phoneNumber: "+201012345678",
      purpose: "Login",
      channel: "whatsapp",
    });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/اتُبعت عن طريق واتساب/)).toBeInTheDocument();
    expect(screen.getByText(/هنبعتلك كود تحقق عن طريق واتساب/)).toBeInTheDocument();
  });

  it("tells the customer which channel the code is on while they type it", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await user.click(screen.getByRole("radio", { name: /واتساب/ }));
    await requestApiCode(user);

    expect(screen.getByText(/اكتب الكود اللي وصل في واتساب/)).toBeInTheDocument();
  });

  it("verifies the typed code and keeps the session without a token in storage", async () => {
    api.requestOtp.mockResolvedValue(challenge());
    api.verifyOtp.mockResolvedValue(sessionPayload);
    const user = userEvent.setup();
    renderApp(<LoginView next="/checkout/payment" />);

    await requestApiCode(user);
    await closeCodeDialog(user);
    fillCode("246810");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/checkout/payment"));
    expect(api.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge-1", code: "246810", fullName: "" });
    expect(JSON.parse(storedSession()!)).toEqual({
      customerId: "customer-1",
      phoneNumber: "+201012345678",
      fullName: "Nawy Guest",
      email: null,
    });
    // The tokens belong in the httpOnly cookie, not in anything a script can read.
    expect(storedSession()).not.toMatch(/access-token|refresh-token/);
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");
  });

  it("applies the typed name when the backend returns none", async () => {
    api.requestOtp.mockResolvedValue(challenge());
    api.verifyOtp.mockResolvedValue({ ...sessionPayload, fullName: "" });
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await user.type(screen.getByLabelText("الاسم بالكامل"), "Ahmed Nawy");
    await closeCodeDialog(user);
    fillCode("246810");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profile"));
    await waitFor(() => expect(JSON.parse(storedSession()!)).toMatchObject({ fullName: "Ahmed Nawy" }));
  });

  it("keeps the name the backend already has for a returning customer", async () => {
    api.requestOtp.mockResolvedValue(challenge());
    api.verifyOtp.mockResolvedValue({ ...sessionPayload, fullName: "Nawy Guest" });
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await user.type(screen.getByLabelText("الاسم بالكامل"), "Someone Else");
    await closeCodeDialog(user);
    fillCode("246810");

    await waitFor(() =>
      expect(api.verifyOtp).toHaveBeenCalledWith({
        challengeId: "challenge-1",
        code: "246810",
        fullName: "Someone Else",
      }),
    );
    await waitFor(() => expect(JSON.parse(storedSession()!)).toMatchObject({ fullName: "Nawy Guest" }));
  });

  it("sends no name at all when the field is left blank", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockResolvedValue(sessionPayload);
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await user.type(screen.getByLabelText("الاسم بالكامل"), "   ");
    fillCode("246810");

    await waitFor(() =>
      expect(api.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge-1", code: "246810", fullName: "" }),
    );
  });

  /* ------------------------------------------------------------------------ */
  /* Resend, cooldown and the two buttons that gate it                        */
  /* ------------------------------------------------------------------------ */

  it("locks the send button while the request is in flight", async () => {
    vi.useFakeTimers();
    const open = deferred<Challenge>();
    api.requestOtp.mockReturnValue(open.promise);
    renderApp(<LoginView />);

    fireEvent.change(screen.getByLabelText("رقم الموبايل"), { target: { value: "01012345678" } });
    fireEvent.click(sendButton());
    await tick(1);

    const busy = screen.getByRole("button", { name: /جارٍ إرسال الكود/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "جارٍ إرسال الكود" })).toBeInTheDocument();
    for (const input of otpInputs()) expect(input).toBeDisabled();

    await act(async () => {
      open.resolve(challenge({ devOtpCode: null }));
    });
    await tick(1);

    for (const input of otpInputs()) expect(input).toBeEnabled();
    // The cooldown the challenge came with now owns the wait.
    expect(resendRow()).toHaveTextContent("00:45");
  });

  it("never offers a resend earlier than the code itself expires", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ expiresInSeconds: 20, devOtpCode: null }));
    renderApp(<LoginView />);

    await sendWithClock();

    // A 20-second code cannot ask the customer to wait 45 for its replacement.
    expect(resendRow()).toHaveTextContent("00:20");
    expect(codeValidity()).toHaveTextContent("00:20");
    expect(screen.queryByText("00:45")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /إعادة إرسال الكود/ })).not.toBeInTheDocument();
  });

  it("hands the resend link back when the cooldown ends and locks it mid-request", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    renderApp(<LoginView />);

    await sendWithClock();

    expect(sendButton()).toBeDisabled();
    expect(resendRow()).toHaveTextContent("00:45");

    await tickSeconds(45);

    expect(screen.queryByText(/إعادة الإرسال بعد/)).not.toBeInTheDocument();
    expect(resendButton()).toBeEnabled();

    const open = deferred<Challenge>();
    api.requestOtp.mockReturnValueOnce(open.promise);
    fireEvent.click(resendButton());
    await tick(1);

    expect(resendButton()).toBeDisabled();
    expect(api.requestOtp).toHaveBeenCalledTimes(2);

    await act(async () => {
      open.resolve(challenge({ challengeId: "challenge-2", devOtpCode: null }));
    });
    await tick(1);

    expect(codeValues()).toEqual(["", "", "", "", "", ""]);
    for (const input of otpInputs()) expect(input).toBeEnabled();
    expect(resendRow()).toHaveTextContent("00:45");
  });

  it("counts the server's Retry-After down instead of a silent dead button", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockRejectedValue(
      apiError({ kind: "rateLimited", status: 429, code: "Auth.OtpRateLimitExceeded", retryAfterSeconds: 90 }),
    );
    renderApp(<LoginView />);

    await sendWithClock();

    expect(alerts()).toContain("عدد محاولات زايد، استنى شوية وجرب تاني");
    expect(resendRow()).toHaveTextContent("معاودة الطلب بعد");
    expect(resendRow()).toHaveTextContent("01:30");
    expect(sendButton()).toBeDisabled();
    // Nothing was issued, so the code boxes stay locked.
    for (const input of otpInputs()) expect(input).toBeDisabled();

    await tickSeconds(30);
    expect(resendRow()).toHaveTextContent("01:00");
    expect(sendButton()).toBeDisabled();
  });

  it("gives the send button back when the Retry-After window ends", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockRejectedValueOnce(apiError({ kind: "rateLimited", status: 429, retryAfterSeconds: 3 }));
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    renderApp(<LoginView />);

    await sendWithClock();

    expect(resendRow()).toHaveTextContent("00:03");
    expect(sendButton()).toBeDisabled();

    await tickSeconds(4);

    expect(screen.queryByText(/معاودة الطلب بعد/)).not.toBeInTheDocument();
    expect(sendButton()).toBeEnabled();

    await sendWithClock();
    expect(api.requestOtp).toHaveBeenCalledTimes(2);
    for (const input of otpInputs()) expect(input).toBeEnabled();
  });

  it("falls back to the app's own cooldown when a 429 gives no Retry-After", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockRejectedValue(apiError({ kind: "rateLimited", status: 429 }));
    renderApp(<LoginView />);

    await sendWithClock();

    expect(resendRow()).toHaveTextContent("معاودة الطلب بعد");
    expect(resendRow()).toHaveTextContent("00:45");
    expect(sendButton()).toBeDisabled();
  });

  it("locks resend for the Retry-After window a refused code brings with it", async () => {
    vi.useFakeTimers();
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(
      apiError({ kind: "rateLimited", status: 429, code: "Auth.OtpRateLimitExceeded", retryAfterSeconds: 60 }),
    );
    renderApp(<LoginView />);

    await sendWithClock();
    fillCode("246810");
    await tick(1);

    expect(alerts()).toContain("عدد محاولات زايد، استنى شوية وجرب تاني");
    // The challenge was spent by the attempt, and the wait is the server's.
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(resendRow()).toHaveTextContent("معاودة الطلب بعد");
    expect(resendRow()).toHaveTextContent("01:00");
    expect(sendButton()).toBeDisabled();
    expect(screen.queryByText(/الكود صالح لمدة/)).not.toBeInTheDocument();
  });

  /* ------------------------------------------------------------------------ */
  /* Every documented failure, one case per code                              */
  /* ------------------------------------------------------------------------ */

  it("keeps the challenge alive for a wrong code and lets the customer retry", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(apiError({ kind: "validation", status: 422, code: "Customer.InvalidOtpCode" }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    fillCode("246810");

    await expectAlert("الكود غير صحيح، جرب تاني");
    expect(codeValues()).toEqual(["", "", "", "", "", ""]);
    // Five guesses are allowed against the same challenge, so the boxes stay open.
    for (const input of otpInputs()) expect(input).toBeEnabled();
    expect(screen.queryByRole("link", { name: /تواصل مع خدمة العملاء/ })).not.toBeInTheDocument();

    api.verifyOtp.mockResolvedValue(sessionPayload);
    fillCode("246810");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profile"));
    expect(api.verifyOtp).toHaveBeenLastCalledWith({ challengeId: "challenge-1", code: "246810", fullName: "" });
  });

  /**
   * The codes that mean "this challenge is finished" — the screen has to put the
   * boxes away and offer a brand new code, not invite another guess.
   */
  async function expectNewCodeForced(error: ApiError, message: string) {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(error);
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    fillCode("246810");

    await expectAlert(message);
    expect(codeValues()).toEqual(["", "", "", "", "", ""]);
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(screen.queryByText(/الكود صالح لمدة/)).not.toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(storedSession()).toBe("null");
  }

  it("forces a new code when the lifetime ran out on the server", async () => {
    await expectNewCodeForced(
      apiError({ kind: "validation", status: 422, code: "Customer.OtpExpired" }),
      "انتهت صلاحية الكود، اطلب كود جديد",
    );
  });

  it("forces a new code when the code was already spent", async () => {
    await expectNewCodeForced(
      apiError({ kind: "conflict", status: 409, code: "Customer.OtpAlreadyUsed" }),
      "الكود ده اتستخدم خلاص، اطلب كود جديد",
    );
  });

  it("forces a new code when the attempts ran out", async () => {
    await expectNewCodeForced(
      apiError({ kind: "conflict", status: 409, code: "Customer.OtpMaxAttemptsExceeded" }),
      "عدد محاولات زايد، اطلب كود جديد",
    );
  });

  it("forces a new code when the challenge itself is gone", async () => {
    await expectNewCodeForced(
      apiError({ kind: "notFound", status: 404, code: "Customer.ChallengeNotFound" }),
      "انتهت صلاحية الكود، اطلب كود جديد",
    );
  });

  it("routes a phone with no account to registration, keeping the number", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(apiError({ kind: "notFound", status: 404, code: "Customer.NotFoundByPhone" }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    fillCode("246810");

    await expectAlert("مفيش حساب بالموبيل ده، سجّل حساب جديد");
    // The number they just proved they hold is not something to retype.
    expect(screen.getByLabelText("رقم الموبايل")).toHaveValue("01012345678");
    expect(screen.getByRole("radio", { name: "حساب جديد" })).toBeChecked();
    expect(screen.getByRole("heading", { name: "أنشئ حساب جديد" })).toBeInTheDocument();
    // ...and the door it routed them through is the one that needs a name.
    await expectAlert("اكتب اسمك بالكامل");
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  /**
   * A stopped account is not a retry problem, so the screen names support and
   * declines to hand back another attempt.
   */
  async function expectSupportInsteadOfRetry(error: ApiError, message: string) {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(error);
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    fillCode("246810");

    await expectAlert(message);
    const support = screen.getByRole("link", { name: /تواصل مع خدمة العملاء/ });
    expect(support).toHaveAttribute("href", "/help");
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(screen.queryByRole("button", { name: /إعادة إرسال الكود/ })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(storedSession()).toBe("null");
  }

  it("sends a blocked account to support instead of another code", async () => {
    await expectSupportInsteadOfRetry(
      apiError({ kind: "conflict", status: 409, code: "Customer.Blocked" }),
      "الحساب ده موقوف، كلم خدمة العملاء",
    );
  });

  it("sends an inactive customer to support instead of another code", async () => {
    await expectSupportInsteadOfRetry(
      apiError({ kind: "conflict", status: 409, code: "Customer.Inactive" }),
      "الحساب ده متقفل حاليًا، كلم خدمة العملاء",
    );
  });

  it("sends an account the auth layer stopped to the same place", async () => {
    await expectSupportInsteadOfRetry(
      apiError({ kind: "unauthorized", status: 403, code: "Auth.InactiveAccount" }),
      "الحساب ده متقفل حاليًا، كلم خدمة العملاء",
    );
  });

  it("shows the field message the backend sent for the phone number", async () => {
    api.requestOtp.mockRejectedValue(
      apiError({ kind: "validation", status: 422, fieldErrors: { PhoneNumber: "Invalid phone number." } }),
    );
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    await expectAlert("رقم الموبايل غير صحيح");
    for (const input of otpInputs()) expect(input).toBeDisabled();
    // The message belongs under the number it is about, not under the boxes —
    // and the input itself carries it, so a screen reader hears it with the
    // field rather than as a floating sentence.
    expect(screen.getByLabelText("رقم الموبايل")).toHaveAccessibleDescription("رقم الموبايل غير صحيح");
  });

  it("puts a rejected name back on the name field", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(
      apiError({ kind: "validation", status: 422, fieldErrors: { FullName: "FullName is required." } }),
    );
    const user = userEvent.setup();
    renderApp(<LoginView mode="Registration" />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
    await user.type(screen.getByLabelText("الاسم بالكامل"), "Ahmed");
    await user.click(sendButton());
    await waitFor(() => expect(api.requestOtp).toHaveBeenCalled());
    fillCode("246810");

    await expectAlert("اكتب اسمك بالكامل");
    expect(screen.getByLabelText("الاسم بالكامل")).toHaveValue("Ahmed");
    // It is the name field that was refused, and the field says so to a screen
    // reader as well as in the line of text under it.
    expect(screen.getByLabelText("الاسم بالكامل")).toHaveAccessibleDescription("اكتب اسمك بالكامل");
  });

  /**
   * `Channel` and `Purpose` are both documented inputs of the OTP request, and
   * both belong to the same pair of choices on the form. A message about either
   * one landing on the phone box would send the customer editing the number they
   * just proved they hold.
   */
  async function expectChannelFieldError(key: "Channel" | "Purpose") {
    api.requestOtp.mockRejectedValue(
      apiError({ kind: "validation", status: 422, fieldErrors: { [key]: `${key} is invalid.` } }),
    );
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    await expectAlert("طلب غير صحيح، جرب تاني");
    expect(screen.getByRole("radiogroup", { name: "طريقة استلام الكود" })).toHaveAccessibleDescription(
      "طلب غير صحيح، جرب تاني",
    );
    // The number itself was never the problem, so it keeps its hint.
    expect(screen.getByLabelText("رقم الموبايل")).toHaveAccessibleDescription(
      "استخدم رقم موبايل مصري لاستلام كود التحقق",
    );
  }

  it("puts a rejected channel on the channel choice, not on the number", async () => {
    await expectChannelFieldError("Channel");
  });

  it("puts a rejected purpose on the same choice, because it is the same mistake", async () => {
    await expectChannelFieldError("Purpose");
  });

  it("clears the channel message as soon as the customer picks the other one", async () => {
    api.requestOtp.mockRejectedValue(
      apiError({ kind: "validation", status: 422, fieldErrors: { Channel: "Channel is invalid." } }),
    );
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await waitFor(() =>
      expect(screen.getByRole("radiogroup", { name: "طريقة استلام الكود" })).toHaveAccessibleDescription(
        "طلب غير صحيح، جرب تاني",
      ),
    );

    await user.click(screen.getByRole("radio", { name: /واتساب/ }));

    expect(screen.getByRole("radiogroup", { name: "طريقة استلام الكود" })).not.toHaveAccessibleDescription();
    expect(screen.getByRole("radio", { name: /واتساب/ })).toBeChecked();
  });

  /**
   * The guide's rule for a blocked or deactivated account is a support message,
   * not another attempt — and an attempt the screen cannot make has to be a
   * button it cannot press. The guard runs before `clearError()` for the same
   * reason: a "retry" that silently wipes the only useful sentence on the page
   * is worse than the retry itself.
   */
  it("will not ask for a second code for an account it already refused", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(apiError({ kind: "conflict", status: 409, code: "Customer.Blocked" }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    fillCode("246810");
    await expectAlert("الحساب ده موقوف، كلم خدمة العملاء");
    expect(api.requestOtp).toHaveBeenCalledTimes(1);

    expect(sendButton()).toBeDisabled();
    await user.click(sendButton());
    await user.keyboard("{Enter}");

    expect(api.requestOtp).toHaveBeenCalledTimes(1);
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    // The refusal is still on the screen: pressing the dead button did not hide it.
    await expectAlert("الحساب ده موقوف، كلم خدمة العملاء");
  });

  it("lifts the refusal the moment a different number is typed", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(apiError({ kind: "conflict", status: 409, code: "Customer.Blocked" }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    fillCode("246810");
    await expectAlert("الحساب ده موقوف، كلم خدمة العملاء");

    await user.clear(screen.getByLabelText("رقم الموبايل"));
    await user.type(screen.getByLabelText("رقم الموبايل"), "01099998877");

    expect(sendButton()).toBeEnabled();
    await user.click(sendButton());
    await waitFor(() => expect(api.requestOtp).toHaveBeenCalledTimes(2));
    expect(api.requestOtp.mock.calls[1]?.[0]).toMatchObject({ phoneNumber: "+201099998877" });
  });

  it("keeps a server outage wording instead of leaking the raw error", async () => {
    api.requestOtp.mockRejectedValue(apiError({ kind: "server", status: 500 }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    await expectAlert("حصل مشكلة في السيرفر، جرب تاني");
    expect(screen.queryByText(/500/)).not.toBeInTheDocument();
  });

  it("never puts a server's internals on the screen", async () => {
    // What the deployed tenant answers right now: a plain-text .NET activation
    // failure with a stack in it. The catalog is the only wording this screen
    // knows, so nothing that came off the wire may reach the document — not
    // even through `error.message`, which is what a careless `catch` would
    // print first.
    api.requestOtp.mockRejectedValue(
      apiError({
        kind: "server",
        status: 500,
        problemDetail:
          "System.InvalidOperationException: Unable to resolve service for type " +
          "'NawyOrders.Application.Common.Interfaces.Persistence.IPlatformUnitOfWork' " +
          "while attempting to activate 'NawyOrders.Application.Behaviors.TransactionBehavior'.",
      }),
    );
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    await expectAlert("حصل مشكلة في السيرفر، جرب تاني");
    expect(document.body.textContent).not.toMatch(
      /InvalidOperationException|UnitOfWork|NawyOrders|Application\.Behaviors/,
    );
  });

  it("keeps the offline wording when the network never answered", async () => {
    api.requestOtp.mockRejectedValue(apiError({ kind: "offline", status: 0 }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    await expectAlert("مفيش اتصال بالإنترنت، جرب تاني");
    // Nothing came back that a code could answer, so the challenge is put away.
    for (const input of otpInputs()) expect(input).toBeDisabled();
  });

  it("shows the mapped message for a failure no code explains", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockRejectedValue(apiError({ kind: "server", status: 500 }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    fillCode("246810");

    await expectAlert("حصل مشكلة في السيرفر، جرب تاني");
    expect(codeValues()).toEqual(["", "", "", "", "", ""]);
    // The challenge survived a failure that had nothing to do with the code.
    for (const input of otpInputs()) expect(input).toBeEnabled();
  });

  /* ------------------------------------------------------------------------ */
  /* Only the newest challenge may sign anybody in                            */
  /* ------------------------------------------------------------------------ */

  it("refuses to sign the customer in on a challenge a resend replaced", async () => {
    vi.useFakeTimers();
    const stale = deferred<CustomerSessionPayload>();
    api.requestOtp
      .mockResolvedValueOnce(challenge({ challengeId: "challenge-a", devOtpCode: null }))
      .mockResolvedValueOnce(challenge({ challengeId: "challenge-b", devOtpCode: null }));
    api.verifyOtp.mockImplementation((options: { challengeId: string }) =>
      options.challengeId === "challenge-a" ? stale.promise : Promise.resolve(sessionPayload),
    );
    renderApp(<LoginView next="/checkout/payment" />);

    await sendWithClock();
    fillCode("246810");
    await tick(1);
    expect(api.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge-a", code: "246810", fullName: "" });

    // The cooldown ends, so the customer asks for another code — and gets B.
    await tickSeconds(45);
    await act(async () => {
      fireEvent.click(resendButton());
    });
    await tick(1);
    expect(api.requestOtp).toHaveBeenCalledTimes(2);

    // The answer for A finally arrives, for a challenge that no longer exists.
    await act(async () => {
      stale.resolve(sessionPayload);
    });
    await tick(1);

    expect(storedSession()).toBe("null");
    expect(router.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");

    // B is the challenge that still counts.
    fillCode("246810");
    await tick(1);

    expect(api.verifyOtp).toHaveBeenLastCalledWith({ challengeId: "challenge-b", code: "246810", fullName: "" });
    expect(router.replace).toHaveBeenCalledWith("/checkout/payment");
    expect(JSON.parse(storedSession()!)).toMatchObject({ customerId: "customer-1" });
  });

  it("drops an answer for a challenge the countdown already retired", async () => {
    vi.useFakeTimers();
    const slow = deferred<CustomerSessionPayload>();
    api.requestOtp.mockResolvedValue(challenge({ expiresInSeconds: 60, devOtpCode: null }));
    api.verifyOtp.mockReturnValue(slow.promise);
    renderApp(<LoginView />);

    await sendWithClock();
    fillCode("246810");
    await tick(1);

    // The lifetime runs out while the answer is still on its way.
    await tickSeconds(60);
    await act(async () => {
      slow.resolve(sessionPayload);
    });
    await tick(1);

    expect(storedSession()).toBe("null");
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("LoginView registering a first-time customer", () => {
  beforeEach(() => {
    apiMode.configured = true;
  });

  it("will not spend a code on a name it does not have yet", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView mode="Registration" />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
    await user.click(sendButton());

    await expectAlert("اكتب اسمك بالكامل");
    expect(api.requestOtp).not.toHaveBeenCalled();
    for (const input of otpInputs()) expect(input).toBeDisabled();
  });

  it("treats a name that is only spaces as no name", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView mode="Registration" />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
    await user.type(screen.getByLabelText("الاسم بالكامل"), "   ");
    await user.click(sendButton());

    await expectAlert("اكتب اسمك بالكامل");
    expect(api.requestOtp).not.toHaveBeenCalled();
  });

  it("opens on the registration door with the name it needs", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView mode="Registration" />);

    expect(screen.getByRole("radio", { name: "حساب جديد" })).toBeChecked();
    expect(screen.getByRole("heading", { name: "أنشئ حساب جديد" })).toBeInTheDocument();
    expect(screen.getByText(/ادخل رقم موبايلك واسمك/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("الاسم بالكامل"), "Ahmed Samir");
    expect(screen.getByLabelText("الاسم بالكامل")).toHaveValue("Ahmed Samir");
  });

  it("asks for a registration challenge and names the new account with it", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockResolvedValue({ ...sessionPayload, fullName: "Ahmed Samir" });
    const user = userEvent.setup();
    renderApp(<LoginView next="/checkout/payment" mode="Registration" />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
    await user.type(screen.getByLabelText("الاسم بالكامل"), "Ahmed Samir");
    await user.click(sendButton());
    await waitFor(() =>
      expect(api.requestOtp).toHaveBeenCalledWith({
        phoneNumber: "+201012345678",
        purpose: "Registration",
        channel: "sms",
      }),
    );

    fillCode("246810");

    await waitFor(() =>
      expect(api.verifyOtp).toHaveBeenCalledWith({
        challengeId: "challenge-1",
        code: "246810",
        fullName: "Ahmed Samir",
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/checkout/payment"));
    await waitFor(() => expect(JSON.parse(storedSession()!)).toMatchObject({ fullName: "Ahmed Samir" }));
  });

  it("cuts a name down to the 200 characters the contract allows", async () => {
    api.requestOtp.mockResolvedValue(challenge({ devOtpCode: null }));
    api.verifyOtp.mockResolvedValue(sessionPayload);
    const user = userEvent.setup();
    renderApp(<LoginView mode="Registration" />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
    fireEvent.change(screen.getByLabelText("الاسم بالكامل"), { target: { value: "ا".repeat(250) } });
    expect(screen.getByLabelText("الاسم بالكامل")).toHaveValue("ا".repeat(200));

    await user.click(sendButton());
    fillCode("246810");

    await waitFor(() => expect(api.verifyOtp).toHaveBeenCalled());
    const sent = api.verifyOtp.mock.calls[0][0] as { fullName: string };
    expect(sent.fullName).toHaveLength(200);
  });
});

/**
 * The deployed site builds with `NODE_ENV=production` and, until the tenant
 * backend is reachable, with no base URL — so the offline demo path is what a
 * real customer sees in production. A single dev-code gate used to hide the
 * local code there too, which left the app asking for a code nobody could see or
 * copy. These cases pin both halves of that bug.
 */
describe("LoginView in a production bundle (no backend configured)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    apiMode.configured = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("still shows the demo code in the copyable popup", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);
    await requestCode(user);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("123456")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /انسخ الكود/ })).toBeEnabled();
  });

  it("asks for the name a first-time customer registers with", () => {
    renderApp(<LoginView />);

    expect(screen.getByLabelText("الاسم بالكامل")).toBeInTheDocument();
    expect(screen.getByText("اختياري")).toBeInTheDocument();
  });

  it("builds the account from the name and mobile the customer typed", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01099887766");
    await user.type(screen.getByLabelText("الاسم بالكامل"), "Ahmed Samir");
    await user.click(sendButton());
    await screen.findByText(/استخدم كود التجربة 123456/);
    fillCode("123456");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profile"));
    // A new account has no picture: the customer adds one from the edit screen.
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(storageKeys.profile)!)).toMatchObject({
        name: "Ahmed Samir",
        phone: "+201099887766",
        avatar: "",
      }),
    );
  });

  it("keeps the seeded name when a returning customer signs in without one", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01099887766");
    await user.click(sendButton());
    await screen.findByText(/استخدم كود التجربة 123456/);
    fillCode("123456");

    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.profile)!)).toBeTruthy());
    const stored = JSON.parse(localStorage.getItem(storageKeys.profile)!);
    expect(stored.phone).toBe("+201099887766");
    expect(stored.name).toBe(seedUser.name);
  });
});

describe("LoginView in a production bundle against the tenant API", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    apiMode.configured = true;
    api.requestOtp.mockResolvedValue(challenge());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the backend's test code out of the popup", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/اكتب الكود اللي وصل في رسالة SMS/)).toBeInTheDocument();
    await waitFor(() => expect(otpInputs()[0]).toHaveFocus());
  });

  it("shows it again when the deploy opts in with NEXT_PUBLIC_SHOW_DEV_OTP", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHOW_DEV_OTP", "true");
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("246810")).toBeInTheDocument();
  });
});

/**
 * The demo code used to be the constant "123456", which is not a verification
 * code but a master key: it works for every phone number, forever, and anyone
 * who read the source once knows it. These cases hold the replacement to the
 * three things that make a code worth calling one — it is fresh, it is short
 * lived, and guessing it runs out of road.
 */
describe("LoginView mints a fresh demo code", () => {
  it("shows the newest code and refuses the previous one", async () => {
    vi.useFakeTimers();
    renderApp(<LoginView />);

    await sendWithClock();
    expect(within(screen.getByRole("dialog")).getByText("123456")).toBeInTheDocument();

    // A demo code's cooldown is the code's own lifetime, so the second request
    // has to wait for it — and gets a different number when it comes.
    fakeOtp.code = "904117";
    await tickSeconds(45);
    await sendWithClock();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("904117")).toBeInTheDocument();
    expect(within(dialog).queryByText("123456")).not.toBeInTheDocument();
    expect(screen.getByText(/استخدم كود التجربة 904117/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "إغلاق" }));
    fillCode("123456");
    await tick(1);

    expect(alerts()).toContain("الكود غير صحيح، جرب تاني — فاضل 4 محاولات");
    expect(router.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");
  });

  it("burns the code after five wrong tries and puts a cooldown on sending", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);
    await requestCode(user);
    await closeCodeDialog(user);

    for (let attempt = 1; attempt < 5; attempt += 1) {
      fillCode("000000");
      await expectAlert(`فاضل ${5 - attempt} محاولات`);
    }

    fillCode("000000");

    await expectAlert("عدد محاولات زايد، استنى شوية وجرب تاني");
    // No code left to answer with, and sending again has to wait.
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(resendRow()).toHaveTextContent("معاودة الطلب بعد");
    expect(resendRow()).toHaveTextContent("00:45");
    expect(screen.queryByRole("button", { name: /إظهار الكود/ })).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");
  });

  it("says so instead of inventing a guessable code when the browser has no CSPRNG", async () => {
    fakeOtp.code = "";
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
    await user.click(sendButton());

    await expectAlert("متصفحك مش بيقدر يولّد كود آمن، جرب متصفح تاني");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    for (const input of otpInputs()) expect(input).toBeDisabled();
  });

  it("retires the code the moment its countdown ends", async () => {
    vi.useFakeTimers();
    renderApp(<LoginView />);

    await sendWithClock();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // A demo code lives exactly as long as the resend window: 45 seconds.
    await tickSeconds(46);

    // The popup closes rather than keep handing out a code that no longer works.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/استخدم كود التجربة/)).not.toBeInTheDocument();
    expect(screen.getByText(/اكتب الكود اللي وصل في رسالة SMS/)).toBeInTheDocument();
    expect(alerts()).toContain("انتهت صلاحية الكود، اطلب كود جديد");
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(verifyButton()).toBeDisabled();

    // The right code typed now buys nothing: there is no challenge to answer.
    fillCode("123456");
    await tick(1);
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");
    expect(router.replace).not.toHaveBeenCalled();

    // and the number is asked for again from the send button.
    expect(sendButton()).toBeEnabled();
  });
});

