import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginView } from "@/components/login-view";
import { renderApp } from "@/test/render";
import { ApiError } from "@/lib/api";
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
  refreshTokens: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiConfigured: () => apiMode.configured,
    apiBaseUrl: () => (apiMode.configured ? "https://api.test" : ""),
    requestOtp: api.requestOtp,
    verifyOtp: api.verifyOtp,
    fetchBranding: api.fetchBranding,
    refreshTokens: api.refreshTokens,
    revokeRefreshToken: api.revokeRefreshToken,
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

function otpInputs() {
  return screen.getAllByLabelText(/خانة الكود/);
}

async function requestCode(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
  await user.click(screen.getByRole("button", { name: /^إرسال$/ }));
  await screen.findByText(/استخدم كود التجربة 123456/);
}

function fillCode(value: string) {
  otpInputs().forEach((input, index) => {
    fireEvent.change(input, { target: { value: value[index] ?? "" } });
  });
}

beforeEach(() => {
  apiMode.configured = false;
});

describe("LoginView", () => {
  it("keeps the OTP fields and submit locked before a code is requested", async () => {
    renderApp(<LoginView />);

    await waitFor(() => expect(otpInputs()).toHaveLength(6));
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ })).toBeDisabled();
    expect(screen.queryByText(/استخدم كود التجربة/)).not.toBeInTheDocument();
  });

  it("rejects a phone number that is too short without enabling the OTP", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await user.type(screen.getByLabelText("رقم الموبايل"), "123");
    await user.click(screen.getByRole("button", { name: /^إرسال$/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("اكتب رقم موبايل صحيح الأول");
    for (const input of otpInputs()) expect(input).toBeDisabled();
  });

  it("unlocks the OTP, reveals the demo hint and starts the resend timer", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestCode(user);

    for (const input of otpInputs()) expect(input).toBeEnabled();
    expect(screen.getByText("00:45")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports a wrong code, clears the fields and does not authenticate", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView next="/checkout/payment" />);
    await requestCode(user);

    fillCode("111111");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("الكود غير صحيح، جرب تاني");
    expect(otpInputs().map((input) => (input as HTMLInputElement).value)).toEqual(["", "", "", "", "", ""]);
    expect(router.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");
  });

  it("accepts a pasted demo code and moves focus with backspace", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);
    await requestCode(user);

    const inputs = otpInputs();
    fireEvent.paste(inputs[0], { clipboardData: { getData: () => "123456" } });

    expect(otpInputs().map((input) => (input as HTMLInputElement).value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ })).toBeEnabled();

    fireEvent.change(otpInputs()[1], { target: { value: "" } });
    const second = otpInputs()[1];
    second.focus();
    fireEvent.keyDown(second, { key: "Backspace" });
    expect(otpInputs()[0]).toHaveFocus();
  });

  it("authenticates with the demo code and redirects to the requested next path", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView next="/checkout/payment" />);
    await requestCode(user);

    fillCode("123456");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/checkout/payment"));
    expect(screen.getByRole("status", { name: "جارٍ تسجيل الدخول" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(storageKeys.auth)!)).toBe(true);
    expect(JSON.parse(localStorage.getItem(storageKeys.cart)!)).toHaveLength(3);
  });

  it("defaults the redirect to the profile page", async () => {
    const user = userEvent.setup();
    renderApp(<LoginView />);
    await requestCode(user);

    fillCode("123456");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profile"));
  });

  it("redirects an already signed-in visitor without asking for a code", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<LoginView next="/orders" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/orders"));
    expect(screen.getByLabelText("رقم الموبايل")).toHaveValue("");
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

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "إغلاق" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/استخدم كود التجربة 123456/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /إظهار الكود/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("LoginView against the tenant API", () => {
  const challenge = {
    challengeId: "challenge-1",
    expiresAtUtc: "2026-11-05T10:02:00Z",
    expiresInSeconds: 120,
    devOtpCode: "246810",
  };

  const sessionPayload = {
    customerId: "customer-1",
    phoneNumber: "+201012345678",
    fullName: "Nawy Guest",
    email: null,
    accessToken: "access-token",
    tokenType: "Bearer",
    expiresIn: 900,
    expiresAtUtc: "2026-11-05T10:15:00Z",
    refreshToken: "refresh-token",
  };

  beforeEach(() => {
    apiMode.configured = true;
    api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: null });
    api.revokeRefreshToken.mockResolvedValue(undefined);
  });

  async function requestApiCode(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("رقم الموبايل"), "01012345678");
    await user.click(screen.getByRole("button", { name: /^إرسال$/ }));
  }

  it("asks for the name the backend needs for a first-time customer", () => {
    renderApp(<LoginView />);

    expect(screen.getByLabelText("الاسم بالكامل")).toBeInTheDocument();
    expect(screen.queryByText(/استخدم كود التجربة/)).not.toBeInTheDocument();
  });

  it("requests a challenge with the normalised number and shows devOtpCode in the popup", async () => {
    api.requestOtp.mockResolvedValue(challenge);
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    await waitFor(() =>
      expect(api.requestOtp).toHaveBeenCalledWith({ phoneNumber: "+201012345678" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("246810")).toBeInTheDocument();
    expect(within(dialog).getByText(/الكود صالح \d+ ثانية/)).toBeInTheDocument();
    expect(screen.queryByText(/اكتب الكود اللي وصل في الرسالة/)).not.toBeInTheDocument();
  });

  it("sends nothing to the network until the customer asks for a code", () => {
    renderApp(<LoginView />);
    expect(api.requestOtp).not.toHaveBeenCalled();
  });

  it("keeps the popup shut when the backend returns no test code", async () => {
    api.requestOtp.mockResolvedValue({ ...challenge, devOtpCode: null });
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/اكتب الكود اللي وصل في الرسالة/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /إظهار الكود/ })).not.toBeInTheDocument();
  });

  it("verifies the typed code and keeps the returned session", async () => {
    api.requestOtp.mockResolvedValue(challenge);
    api.verifyOtp.mockResolvedValue(sessionPayload);
    const user = userEvent.setup();
    renderApp(<LoginView next="/checkout/payment" />);

    await requestApiCode(user);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "إغلاق" }));
    fillCode("246810");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/checkout/payment"));
    expect(api.verifyOtp).toHaveBeenCalledWith({
      challengeId: "challenge-1",
      code: "246810",
      fullName: undefined,
    });
    const stored = JSON.parse(localStorage.getItem(storageKeys.session)!);
    expect(stored).toMatchObject({ accessToken: "access-token", refreshToken: "refresh-token" });
    expect(localStorage.getItem(storageKeys.auth)).not.toBe("true");
  });

  it("sends the typed name with the verification request", async () => {
    api.requestOtp.mockResolvedValue(challenge);
    api.verifyOtp.mockResolvedValue(sessionPayload);
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await user.type(screen.getByLabelText("الاسم بالكامل"), "Nawy Guest");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "إغلاق" }));
    fillCode("246810");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    await waitFor(() =>
      expect(api.verifyOtp).toHaveBeenCalledWith({
        challengeId: "challenge-1",
        code: "246810",
        fullName: "Nawy Guest",
      }),
    );
  });

  it("shows the field message the backend sent for the phone number", async () => {
    api.requestOtp.mockRejectedValue(new ApiError("validation", 422, { phoneNumber: "Invalid phone number." }));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("رقم الموبايل غير صحيح");
    for (const input of otpInputs()) expect(input).toBeDisabled();
  });

  it("keeps a server outage wording instead of leaking the raw error", async () => {
    api.requestOtp.mockRejectedValue(new ApiError("server", 500));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("حصل مشكلة في السيرفر، جرب تاني");
    expect(screen.queryByText(/500/)).not.toBeInTheDocument();
  });

  it("spends the challenge when the code was not found and asks for a new one", async () => {
    api.requestOtp.mockResolvedValue(challenge);
    api.verifyOtp.mockRejectedValue(new ApiError("notFound", 404));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "إغلاق" }));
    fillCode("111111");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("الكود غير صحيح، جرب تاني");
    for (const input of otpInputs()) expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: /^إرسال$/ })).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("keeps the challenge alive for a rate-limited retry", async () => {
    api.requestOtp.mockResolvedValue(challenge);
    api.verifyOtp.mockRejectedValue(new ApiError("rateLimited", 429));
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "إغلاق" }));
    fillCode("111111");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("عدد محاولات زايد، استنى شوية وجرب تاني");
    for (const input of otpInputs()) expect(input).toBeEnabled();
    expect(otpInputs().map((input) => (input as HTMLInputElement).value)).toEqual(["", "", "", "", "", ""]);
  });

  it("refuses to store a session the response cannot describe", async () => {
    api.requestOtp.mockResolvedValue(challenge);
    api.verifyOtp.mockResolvedValue({ customerId: "customer-1" });
    const user = userEvent.setup();
    renderApp(<LoginView />);

    await requestApiCode(user);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "إغلاق" }));
    fillCode("246810");
    await user.click(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("رد السيرفر مش مفهوم، جرب تاني");
    expect(router.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKeys.session)).toBe("null");
    expect(screen.getByRole("button", { name: /تأكيد الكود والمتابعة/ })).toBeEnabled();
  });
});
