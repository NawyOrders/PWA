import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar";
import { loginHref } from "@/lib/routes";
import { storageKeys } from "@/lib/storage";
import { renderApp } from "@/test/render";

const nav = vi.hoisted(() => ({ pathname: "/" }));

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

describe("Navbar", () => {
  it("links Orders where Categories used to be", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<Navbar />);

    expect(await screen.findByRole("link", { name: "الطلبات" })).toHaveAttribute("href", "/orders");
    expect(screen.queryByRole("link", { name: "الاقسام" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "الرئيسية" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "حسابي" })).toHaveAttribute("href", "/profile");
  });

  it("sends signed-out visitors to login from the Orders link", async () => {
    nav.pathname = "/orders";
    renderApp(<Navbar />);

    const orders = await screen.findByRole("link", { name: "الطلبات" });
    await waitFor(() => expect(orders).toHaveAttribute("href", loginHref("/orders")));
  });

  it("marks the active route", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    nav.pathname = "/orders/10248";
    renderApp(<Navbar />);

    await waitFor(() => expect(screen.getByRole("link", { name: "الطلبات" })).toHaveAttribute("aria-current", "page"));
  });

  it("puts the language switch beside the cart", async () => {
    renderApp(<Navbar />);

    const toggle = await screen.findByRole("button", { name: "تغيير اللغة إلى الإنجليزية" });
    expect(toggle).toHaveTextContent("EN");
    expect(toggle.closest("div")?.className).toContain("justify-end");
  });
});
