import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductDetail } from "@/components/product-detail";
import { useApp } from "@/components/providers";
import { productsById } from "@/lib/data";
import { renderApp } from "@/test/render";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/product/beef-burger",
}));

function CartControls() {
  const { count, clearCart } = useApp();
  return (
    <>
      <output data-testid="cart-count">{count}</output>
      <button type="button" onClick={() => clearCart(true)}>Clear cart</button>
    </>
  );
}

describe("ProductDetail cart quantity controls", () => {
  it("starts at zero, updates the cart directly, and links to the cart", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <ProductDetail product={productsById["beef-burger"]} />
        <CartControls />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    const viewCartButtons = screen.getAllByRole("button", { name: /عرض السلة/ });
    expect(viewCartButtons).toHaveLength(2);
    expect(viewCartButtons[0]).toBeDisabled();
    expect(viewCartButtons[1]).toBeDisabled();

    const incrementButtons = screen.getAllByRole("button", { name: "زيادة الكمية" });
    expect(incrementButtons[0]).toBeEnabled();
    await user.click(incrementButtons[0]);
    await waitFor(() => expect(screen.getByTestId("cart-count")).toHaveTextContent("1"));
    expect(viewCartButtons[0]).toBeEnabled();
    expect(viewCartButtons[1]).toBeEnabled();

    const decrementButtons = screen.getAllByRole("button", { name: "إنقاص الكمية" });
    await user.click(decrementButtons[0]);
    await waitFor(() => expect(screen.getByTestId("cart-count")).toHaveTextContent("0"));
    expect(viewCartButtons[0]).toBeDisabled();
    expect(viewCartButtons[1]).toBeDisabled();
  });
});
