import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentView } from "@/components/payment-view";
import { renderApp } from "@/test/render";
import { storageKeys } from "@/lib/storage";

const router = vi.hoisted(() => ({ push: vi.fn() }));
const writeText = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: router.push,
    replace: vi.fn(),
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

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

function stubClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

beforeEach(() => {
  writeText.mockResolvedValue(undefined);
});

function fileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function upload(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } });
}

describe("PaymentView", () => {
  it("requires a receipt before confirming an InstaPay order", async () => {
    const user = userEvent.setup();
    renderApp(<PaymentView />);

    await user.click(await screen.findByRole("button", { name: "تأكيد الطلب" }));

    expect(screen.getByText("ارفع صورة إثبات الدفع الأول قبل تأكيد الطلب.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("rejects a receipt that is not an image", async () => {
    renderApp(<PaymentView />);

    upload(new File(["invoice"], "invoice.pdf", { type: "application/pdf" }));

    expect(await screen.findByText("ارفع صورة بصيغة JPG أو PNG.")).toBeInTheDocument();
    expect(screen.queryByText("invoice.pdf")).not.toBeInTheDocument();
  });

  it("rejects a receipt larger than five megabytes", async () => {
    renderApp(<PaymentView />);

    upload(new File([new Uint8Array(6 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" }));

    expect(await screen.findByText("حجم الصورة أكبر من 5 ميجا، اختار صورة أصغر.")).toBeInTheDocument();
  });

  it("accepts a valid receipt, asks for confirmation and completes the order", async () => {
    const user = userEvent.setup();
    renderApp(<PaymentView />);

    upload(new File(["proof"], "proof.png", { type: "image/png" }));

    expect(await screen.findByText("proof.png")).toBeInTheDocument();
    expect(screen.getByText(/تم الرفع/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    const dialog = await screen.findByRole("dialog", { name: "تأكيد إيصال الدفع" });
    expect(within(dialog).getByText("proof.png")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "تأكيد" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/orders"));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.cart)!)).toEqual([]));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves the cart untouched when the receipt review is dismissed", async () => {
    const user = userEvent.setup();
    renderApp(<PaymentView />);

    upload(new File(["proof"], "proof.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "إغلاق" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(storageKeys.cart) ?? "[]")).toHaveLength(3);
  });

  it("finalizes a cash order without a receipt", async () => {
    const user = userEvent.setup();
    renderApp(<PaymentView />);

    await user.click(await screen.findByRole("button", { name: /الدفع عند الاستلام/ }));
    expect(screen.queryByText("إثبات الدفع")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "تأكيد الطلب" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/orders"));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.cart)!)).toEqual([]));
  });

  it("finalizes an e-wallet order and shows the wallet instructions", async () => {
    const user = userEvent.setup();
    renderApp(<PaymentView />);

    await user.click(await screen.findByRole("button", { name: /محفظة إلكترونية/ }));
    expect(
      screen.getByText("هيتواصل معاك مندوب الدفع لتأكيد تحويل المحفظة قبل تجهيز الطلب."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "تأكيد الطلب" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/orders"));
  });

  it("copies the InstaPay number and confirms visually", async () => {
    const user = userEvent.setup();
    stubClipboard();
    renderApp(<PaymentView />);

    await user.click(screen.getByRole("button", { name: "نسخ الرقم" }));

    expect(writeText).toHaveBeenCalledWith("01010010010");
    expect(await screen.findByText("تم النسخ")).toBeInTheDocument();
  });

  it("shows the number as a fallback when the clipboard is blocked", async () => {
    const user = userEvent.setup();
    writeText.mockRejectedValueOnce(new Error("denied"));
    stubClipboard();
    renderApp(<PaymentView />);

    await user.click(screen.getByRole("button", { name: "نسخ الرقم" }));

    expect(await screen.findByText("انسخ الرقم يدوياً: 01010010010")).toBeInTheDocument();
  });
});
