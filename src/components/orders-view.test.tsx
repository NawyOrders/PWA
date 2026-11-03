import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrdersView } from "@/components/orders-view";
import { renderApp } from "@/test/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
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

describe("OrdersView", () => {
  it("renders the orders tab as a root screen without a back control", async () => {
    renderApp(<OrdersView />);

    expect(await screen.findByRole("heading", { name: "طلباتك" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "طلبك الحالي" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "الطلبات السابقة" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "رجوع" })).not.toBeInTheDocument();
  });

  // Orders is reached from the tab bar, so the desktop escape hatch points back
  // to the storefront rather than the account screen.
  it("sends the desktop back link to home instead of the profile", async () => {
    renderApp(<OrdersView />);

    expect(await screen.findByRole("link", { name: /العودة للرئيسية/ })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: /العودة للملف الشخصي/ })).not.toBeInTheDocument();
  });

  it("keeps order tracking and reorder actions reachable", async () => {
    renderApp(<OrdersView />);

    expect(await screen.findByRole("link", { name: /تتبع الطلب/ })).toHaveAttribute("href", "/orders/10248");
    expect(screen.getAllByRole("button", { name: /اطلب تاني/ }).length).toBeGreaterThan(0);
  });
});
