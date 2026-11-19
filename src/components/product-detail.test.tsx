import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductDetail } from "@/components/product-detail";
import { useApp } from "@/components/providers";
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
      <button type="button" onClick={() => clearCart(true)}>
        Clear cart
      </button>
    </>
  );
}

function selectedQuantity() {
  return screen.getAllByTestId("selected-quantity").map((quantity) => quantity.textContent);
}

describe("ProductDetail", () => {
  it("starts at zero and only commits the pending quantity when added", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <ProductDetail productId="beef-burger" />
        <CartControls />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    expect(selectedQuantity()).toEqual(["0", "0"]);
    const addButtons = screen.getAllByRole("button", { name: /أضف إلى السلة/ });
    expect(addButtons[0]).toBeDisabled();
    expect(addButtons[1]).toBeDisabled();

    await user.click(screen.getAllByRole("button", { name: "زيادة الكمية" })[0]);
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
    expect(selectedQuantity()).toEqual(["1", "1"]);

    await user.type(screen.getByPlaceholderText(/مثال: من غير بصل/), "no onions");
    await user.click(screen.getAllByRole("button", { name: "زيادة الكمية" })[0]);
    expect(selectedQuantity()).toEqual(["2", "2"]);

    await user.click(screen.getAllByRole("button", { name: /أضف إلى السلة/ })[1]);
    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("2");
      expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("240");
    });

    // The pending state resets, and the note travelled with the line.
    expect(selectedQuantity()).toEqual(["0", "0"]);
    expect(screen.getByPlaceholderText(/مثال: من غير بصل/)).toHaveValue("");
  });

  it("requires a variant before a variant-only item can be added", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <ProductDetail productId="strips-meal" />
        <CartControls />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    // The lowest variant is what the card priced, behind "من".
    expect(screen.getAllByText("من").length).toBeGreaterThan(0);
    expect(screen.getAllByText("155").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "زيادة الكمية" })[0]);
    expect(screen.getAllByRole("button", { name: /أضف إلى السلة/ })[0]).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /8 قطع/ }));
    expect(screen.getAllByRole("button", { name: /أضف إلى السلة/ })[0]).toBeEnabled();

    await user.click(screen.getAllByRole("button", { name: /أضف إلى السلة/ })[0]);
    await waitFor(() => {
      expect(screen.getByTestId("cart-count")).toHaveTextContent("1");
      expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("200");
    });
    expect(selectedQuantity()).toEqual(["0", "0"]);
    expect(screen.getByRole("radio", { name: /5 قطع/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /8 قطع/ })).not.toBeChecked();
  });

  it("shows a neutral empty state for an item missing from the menu", () => {
    renderApp(<ProductDetail productId="not-on-the-menu" />);

    expect(screen.getByText("الصنف مش موجود")).toBeInTheDocument();
    expect(screen.getByText("هذا الصنف مش متاح في منيو المطعم دلوقتي.")).toBeInTheDocument();
  });
});
