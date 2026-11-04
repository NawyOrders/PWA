import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StoreHeader } from "@/components/store-header";
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
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/leaflet-map", () => ({
  LeafletMap: ({ ariaLabel }: { ariaLabel: string }) => <div data-testid="map" aria-label={ariaLabel} />,
}));

describe("StoreHeader", () => {
  it("opens the delivery-location sheet for a signed-in customer", async () => {
    window.localStorage.setItem("nawy-auth-v1", "true");
    const user = userEvent.setup();
    renderApp(<StoreHeader />);

    const trigger = await screen.findByRole("button", { name: "اختر مكان التوصيل" });
    expect(screen.queryByRole("link", { name: /اختر مكان التوصيل/ })).not.toBeInTheDocument();

    await user.click(trigger);
    expect(await screen.findByRole("heading", { name: "اختر مكان التوصيل" })).toBeInTheDocument();
    expect(screen.getByText("العنواين المحفوظة")).toBeInTheDocument();
  });

  it("sends a guest to login from the location control", async () => {
    renderApp(<StoreHeader />);

    const link = await screen.findByRole("link", { name: /سجل الدخول الآن/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("/login"));
    expect(screen.queryByRole("button", { name: "اختر مكان التوصيل" })).not.toBeInTheDocument();
  });

  it("keeps the language switch next to the notifications bell on mobile", async () => {
    const user = userEvent.setup();
    renderApp(<StoreHeader />);

    const toggle = await screen.findByRole("button", { name: "تغيير اللغة إلى الإنجليزية" });
    expect(toggle.parentElement).toContainElement(screen.getByRole("link", { name: "الإشعارات" }));

    await user.click(toggle);
    await waitFor(() => expect(window.localStorage.getItem("nawy-lang-v1")).toBe('"en"'));
  });
});
