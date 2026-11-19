import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/bottom-nav";
import { loginHref } from "@/lib/routes";
import { storageKeys } from "@/lib/storage";
import { renderApp } from "@/test/render";

const nav = vi.hoisted(() => ({ pathname: "/orders" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
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

describe("BottomNav", () => {
  it("offers home, orders, cart and account tabs", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<BottomNav />);

    expect(await screen.findByRole("link", { name: /الرئيسية/ })).toHaveAttribute("href", "/");
    await waitFor(() => expect(screen.getByRole("link", { name: /طلباتي/ })).toHaveAttribute("href", "/orders"));
    expect(screen.getByRole("link", { name: /السلة/ })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("link", { name: /حسابي/ })).toHaveAttribute("href", "/profile");
  });

  it("marks the current tab and sends signed-out visitors to login for orders", async () => {
    renderApp(<BottomNav />);

    const ordersTab = await screen.findByRole("link", { name: /طلباتي/ });
    expect(ordersTab).toHaveAttribute("aria-current", "page");
    expect(ordersTab).toHaveAttribute("href", loginHref("/orders"));
  });
});
