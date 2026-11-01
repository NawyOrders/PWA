import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginView } from "@/components/login-view";
import { renderApp } from "@/test/render";
import { storageKeys } from "@/lib/storage";

const router = vi.hoisted(() => ({ replace: vi.fn() }));

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
});
