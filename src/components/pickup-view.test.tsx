import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PickupView } from "@/components/pickup-view";
import { renderApp } from "@/test/render";
import { storageKeys } from "@/lib/storage";

const router = vi.hoisted(() => ({ push: vi.fn() }));

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

describe("PickupView", () => {
  it("starts on delivery with the delivery fee included", async () => {
    renderApp(<PickupView />);

    const delivery = await screen.findByRole("radio", { name: /التوصيل/ });
    const pickup = screen.getByRole("radio", { name: /الاستلام/ });
    expect(delivery).toHaveAttribute("aria-checked", "true");
    expect(pickup).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/^375/)).toBeInTheDocument();
  });

  it("routes a delivery order to the delivery details step", async () => {
    const user = userEvent.setup();
    renderApp(<PickupView />);

    await user.click(await screen.findByRole("button", { name: "تأكيد طريقة الاستلام" }));
    expect(router.push).toHaveBeenCalledWith("/checkout/delivery");
  });

  it("switches to pickup, drops the fee and routes to branch selection", async () => {
    const user = userEvent.setup();
    renderApp(<PickupView />);

    const pickup = await screen.findByRole("radio", { name: /الاستلام/ });
    await user.click(pickup);

    expect(pickup).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText(/^345/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /تغيير الفرع/ })).toHaveAttribute("href", "/checkout/branch");

    await user.click(screen.getByRole("button", { name: "تأكيد طريقة الاستلام" }));
    expect(router.push).toHaveBeenCalledWith("/checkout/branch");
  });

  it("applies the persisted NAWY20 discount to the total", async () => {
    localStorage.setItem(storageKeys.coupon, JSON.stringify("NAWY20"));
    renderApp(<PickupView />);

    expect(await screen.findByText(/^- 50/)).toBeInTheDocument();
    expect(screen.getByText(/^325/)).toBeInTheDocument();
  });
});
