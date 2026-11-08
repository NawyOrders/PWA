import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OtpCodeDialog } from "@/components/otp-code-dialog";
import { renderApp } from "@/test/render";

const copyText = vi.hoisted(() => vi.fn(async (_value: string) => true));

vi.mock("@/lib/clipboard", () => ({
  copyText: (value: string) => copyText(value),
}));

function renderDialog(
  props: Partial<{
    code: string;
    channel: "sms" | "whatsapp";
    expiresInSeconds: number;
    onUse: () => void;
    onClose: () => void;
  }> = {},
) {
  const onClose = vi.fn();
  renderApp(
    <OtpCodeDialog code="246810" channel="sms" expiresInSeconds={0} onClose={onClose} {...props} />,
  );
  return { onClose, dialog: screen.getByRole("dialog") };
}

describe("OtpCodeDialog", () => {
  it("shows the code as real, selectable text in an accessible dialog", () => {
    const { dialog } = renderDialog();

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("كود التحقق جاهز");

    const code = within(dialog).getByText("246810");
    expect(code).toHaveClass("select-all");
    expect(code).toHaveAttribute("dir", "ltr");
    // the digits are the text content, not an image or a masked placeholder
    expect(code.textContent).toBe("246810");
  });

  it("copies the code and confirms it", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog();

    await user.click(within(dialog).getByRole("button", { name: /انسخ الكود/ }));

    await waitFor(() => expect(copyText).toHaveBeenCalledWith("246810"));
    expect(within(dialog).getByRole("button", { name: /تم النسخ/ })).toBeInTheDocument();
    expect(screen.getByText("تم نسخ كود التحقق")).toBeInTheDocument();
  });

  it("hands the code to the form when the customer taps use", async () => {
    copyText.mockClear();
    const onUse = vi.fn();
    const user = userEvent.setup();
    const { dialog } = renderDialog({ onUse });

    await user.click(within(dialog).getByRole("button", { name: /استخدم الكود/ }));

    expect(onUse).toHaveBeenCalledTimes(1);
    expect(copyText).not.toHaveBeenCalled();
  });

  it("tells the customer to type it when the clipboard is refused", async () => {
    copyText.mockImplementationOnce(async () => false);
    const user = userEvent.setup();
    const { dialog } = renderDialog();

    await user.click(within(dialog).getByRole("button", { name: /انسخ الكود/ }));

    expect(await screen.findByText("نسخ الكود مش متاح، اكتبه بإيدك")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /تم النسخ/ })).not.toBeInTheDocument();
  });

  it("names the channel the code was sent through", () => {
    const { dialog } = renderDialog({ channel: "whatsapp" });
    expect(within(dialog).getByText("اتُبعت عن طريق واتساب")).toBeInTheDocument();
  });

  it("describes an SMS delivery", () => {
    const { dialog } = renderDialog({ channel: "sms" });
    expect(within(dialog).getByText("اتُبعت عن طريق رسالة SMS")).toBeInTheDocument();
  });

  it("counts the code down when the backend gave a lifetime", async () => {
    const { dialog } = renderDialog({ expiresInSeconds: 120 });

    expect(within(dialog).getByText(/الكود صالح 120 ثانية/)).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByText(/الكود صالح 11[89] ثانية/)).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it("falls back to paste guidance without a lifetime", () => {
    const { dialog } = renderDialog({ expiresInSeconds: 0 });
    expect(within(dialog).getByText("لصقه في خانات الكود عشان تكمل تسجيل الدخول")).toBeInTheDocument();
  });

  it("closes from the dismiss button, the backdrop and Escape", async () => {
    const user = userEvent.setup();
    const { onClose, dialog } = renderDialog();

    await user.click(within(dialog).getByRole("button", { name: "إغلاق" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // clicking inside the panel must not dismiss it
    fireEvent.mouseDown(within(dialog).getByText("246810"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("moves focus into the dialog when it opens", async () => {
    const { dialog } = renderDialog();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });
});
