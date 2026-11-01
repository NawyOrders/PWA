import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SiteChrome } from "@/components/site-chrome";
import { renderApp } from "@/test/render";
import { loginHref } from "@/lib/routes";
import { storageKeys } from "@/lib/storage";

const nav = vi.hoisted(() => ({ pathname: "/", replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({
    replace: nav.replace,
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

function renderChrome(pathname: string, options: { loggedIn?: boolean } = {}) {
  nav.pathname = pathname;
  if (options.loggedIn) localStorage.setItem(storageKeys.auth, "true");
  return renderApp(
    <SiteChrome>
      <p>protected content</p>
    </SiteChrome>,
  );
}

describe("SiteChrome route guard", () => {
  it.each(["/profile", "/checkout", "/checkout/payment", "/orders", "/addresses"])(
    "redirects signed-out visitors from %s to login with a return path",
    async (pathname) => {
      renderChrome(pathname);

      await waitFor(() => expect(nav.replace).toHaveBeenCalledWith(loginHref(pathname)));
      await waitFor(() => expect(screen.queryByText("protected content")).not.toBeInTheDocument());
      expect(loginHref(pathname)).toContain(encodeURIComponent(pathname));
    },
  );

  it("renders protected content for a restored session without redirecting", async () => {
    renderChrome("/profile", { loggedIn: true });

    expect(await screen.findByText("protected content")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("opens the login prompt on the cart instead of redirecting", async () => {
    renderChrome("/cart");

    const dialog = await screen.findByRole("dialog", { name: "سجل الدخول، علشان تكمل طلبك" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "سجل الآن" })).toHaveAttribute("href", "/login?next=%2Fcart");
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("keeps the cart prompt closed for signed-in visitors", async () => {
    renderChrome("/cart", { loggedIn: true });

    expect(await screen.findByText("protected content")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the login prompt from the close button", async () => {
    const user = userEvent.setup();
    renderChrome("/cart");

    const dialog = await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "إغلاق" }));

    expect(dialog).not.toBeInTheDocument();
  });

  it("hides the footer and bottom navigation on focused checkout screens", async () => {
    renderChrome("/checkout/payment", { loggedIn: true });

    expect(await screen.findByText("protected content")).toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "التنقل السفلي" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "التنقل الرئيسي" })).toBeInTheDocument();
  });

  it("hides chrome on the login route while leaving content visible", async () => {
    renderChrome("/login");

    expect(await screen.findByText("protected content")).toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "التنقل السفلي" })).not.toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("keeps the public shell chrome on an open route", async () => {
    renderChrome("/");

    expect(await screen.findByText("protected content")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "التنقل السفلي" })).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
