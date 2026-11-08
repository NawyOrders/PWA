import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileView } from "@/components/profile-view";
import { orders as seedOrders } from "@/lib/data";
import { storageKeys } from "@/lib/storage";
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
    <a href={typeof href === "string" ? href : String(href.pathname ?? "")} {...props}>
      {children}
    </a>
  ),
}));

/**
 * The three counts on the account screen are the customer's own saved data, not
 * constants from the seed file: a balance in particular used to be the same 320
 * for everybody who ever signed in on the device.
 */

/** The number rendered directly above a stat label. */
function statValue(label: string): string {
  return String(screen.getAllByText(label)[0].previousElementSibling?.textContent);
}

function savedVisit(favorites: string[], orders: unknown[], points: number) {
  localStorage.setItem(storageKeys.auth, "true");
  localStorage.setItem(storageKeys.accountPhone, JSON.stringify("+201012345678"));
  localStorage.setItem(storageKeys.favorites, JSON.stringify(favorites));
  localStorage.setItem(storageKeys.orders, JSON.stringify(orders));
  localStorage.setItem(storageKeys.points, JSON.stringify(points));
}

describe("ProfileView", () => {
  it("shows the signed-in customer's own counts and balance", async () => {
    savedVisit(["beef-burger"], [seedOrders[0]], 240);

    renderApp(<ProfileView />);

    await waitFor(() => expect(statValue("النقاط")).toBe("240"));
    expect(statValue("المفضلة")).toBe("1");
    expect(statValue("الطلبات")).toBe("1");
  });

  it("shows nothing saved for a customer who has saved nothing", async () => {
    savedVisit([], [], 0);

    renderApp(<ProfileView />);

    await waitFor(() => expect(statValue("المفضلة")).toBe("0"));
    expect(statValue("الطلبات")).toBe("0");
    expect(statValue("النقاط")).toBe("0");
  });
});