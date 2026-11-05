import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CartBar } from "@/components/cart-bar";
import { renderApp } from "@/test/render";
import { storageKeys } from "@/lib/storage";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

function pinnedBar(): HTMLElement {
  const bar = document.querySelector<HTMLElement>("[data-cart-bar]");
  if (!bar) throw new Error("the cart bar is not mounted");
  return bar;
}

function barText(): string {
  return pinnedBar().textContent ?? "";
}

describe("CartBar", () => {
  it("opens the basket instead of pushing straight to checkout", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<CartBar />);

    const action = await screen.findByRole("link", { name: "عرض السلة" });
    expect(action).toHaveAttribute("href", "/cart");
    expect(screen.queryByText("متابعة الطلب والدفع")).not.toBeInTheDocument();
  });

  it("summarises the count, the items and the running total", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<CartBar />);

    expect(await screen.findByText("لديك 3 وجبات في سلة الطلب")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "السلة" })).toHaveTextContent("3");
    // 125 + 120 + 100 from the seeded basket, plus the 30 EGP delivery fee.
    expect(barText()).toContain("برجر سمك (×1)، برجر لحم (×1)");
    expect(barText()).toContain("توصيل لزهراء المعادي");
    expect(barText()).toContain("375");
  });

  it("pins the bar to the viewport, above the tab bar on mobile and the page edge on desktop", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<CartBar />);

    const anchor = pinnedBar();
    await within(anchor).findByRole("link", { name: "عرض السلة" });
    expect(anchor.className).toContain("fixed");
    expect(anchor.className).toContain("bottom-[calc(76px+env(safe-area-inset-bottom))]");
    expect(anchor.className).toContain("lg:bottom-5");
  });

  it("drops the bar out of the tab-bar slot when a screen has no tab bar", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    renderApp(<CartBar aboveBottomNav={false} />);

    const anchor = pinnedBar();
    await within(anchor).findByRole("link", { name: "عرض السلة" });
    expect(anchor.className).toContain("bottom-4");
    expect(anchor.className).not.toContain("calc(76px");
  });

  it("disappears with an empty basket", () => {
    localStorage.setItem(storageKeys.cart, "[]");
    renderApp(<CartBar />);

    expect(screen.queryByText(/سلة الطلب/)).not.toBeInTheDocument();
    expect(document.querySelector("[data-cart-bar]")).toBeNull();
  });
});
