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
  const { count, clearCart, subtotal } = useApp();
  return (
    <>
      <output data-testid="cart-count">{count}</output>
      <output data-testid="cart-subtotal">{subtotal}</output>
      <button type="button" onClick={() => clearCart(true)}>Clear cart</button>
    </>
  );
}

describe("ProductDetail cart quantity controls", () => {
  it("starts at zero, disables adding, and quantity controls only adjust the pending order", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <ProductDetail product={productsById["beef-burger"]} />
        <CartControls />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    expect(screen.getAllByTestId("selected-quantity")).toHaveLength(2);
    expect(screen.getAllByTestId("selected-quantity").map((quantity) => quantity.textContent)).toEqual(["0", "0"]);
    const decrementButtons = screen.getAllByRole("button", { name: "إنقاص الكمية" });
    expect(decrementButtons[0]).toBeDisabled();
    const addButtons = screen.getAllByRole("button", { name: /أضف إلى السلة/ });
    expect(addButtons[0]).toBeDisabled();
    expect(addButtons[1]).toBeDisabled();

    const incrementButtons = screen.getAllByRole("button", { name: "زيادة الكمية" });
    expect(incrementButtons[0]).toBeEnabled();
    await user.click(incrementButtons[0]);
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    expect(screen.getAllByTestId("selected-quantity").map((quantity) => quantity.textContent)).toEqual(["1", "1"]);
    expect(addButtons[0]).toBeEnabled();
    expect(addButtons[1]).toBeEnabled();

    await user.click(decrementButtons[0]);
    expect(screen.getAllByTestId("selected-quantity").map((quantity) => quantity.textContent)).toEqual(["0", "0"]);
    expect(screen.getAllByRole("button", { name: /أضف إلى السلة/ })).toHaveLength(2);
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    expect(addButtons[0]).toBeDisabled();
    expect(addButtons[1]).toBeDisabled();
  });

  it("adds the selected quantity, combo and extras at their combined price", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <ProductDetail product={productsById["beef-burger"]} />
        <CartControls />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    await user.click(screen.getByRole("radio", { name: /كومبو/ }));
    await user.click(screen.getByRole("checkbox", { name: /شريحة جبنة/ }));
    await user.click(screen.getByRole("checkbox", { name: /بطاطس صغيرة/ }));
    await user.type(screen.getByPlaceholderText(/مثال: من غير بصل/), "no onions");
    await user.click(screen.getAllByRole("button", { name: "زيادة الكمية" })[0]);
    await user.click(screen.getAllByRole("button", { name: "زيادة الكمية" })[0]);

    const addButtons = screen.getAllByRole("button", { name: /أضف إلى السلة/ });
    expect(addButtons[1]).toHaveTextContent("400");
    await user.click(addButtons[1]);

    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("2");
      expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("400");
    });

    expect(screen.getAllByTestId("selected-quantity").map((quantity) => quantity.textContent)).toEqual(["0", "0"]);
    expect(screen.getByRole("radio", { name: /ساندوتش فقط/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /كومبو/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /شريحة جبنة/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /بطاطس صغيرة/ })).not.toBeChecked();
    expect(screen.getByPlaceholderText(/مثال: من غير بصل/)).toHaveValue("");
    expect(screen.getAllByRole("button", { name: /أضف إلى السلة/ })[1]).toBeDisabled();
  });
});
