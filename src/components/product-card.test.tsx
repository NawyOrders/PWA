import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/product-card";
import { useApp } from "@/components/providers";
import { productsById } from "@/lib/data";
import { renderApp } from "@/test/render";

function ClearCartButton() {
  const { clearCart } = useApp();
  return <button onClick={() => clearCart(true)}>Clear cart</button>;
}

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ProductCard cart quantity controls", () => {
  it("adds a product, increments and decrements its quantity, then restores add", async () => {
    const user = userEvent.setup();
    renderApp(<ProductCard product={productsById["veggie-burger"]} />);

    await user.click(await screen.findByRole("button", { name: "أضف إلى السلة" }));
    const quantity = await screen.findByRole("group", { name: "الكمية" });
    expect(quantity).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "زيادة الكمية" }));
    await waitFor(() => expect(quantity).toHaveTextContent("2"));

    await user.click(screen.getByRole("button", { name: "إنقاص الكمية" }));
    await waitFor(() => expect(quantity).toHaveTextContent("1"));

    await user.click(screen.getByRole("button", { name: "إنقاص الكمية" }));
    expect(await screen.findByRole("button", { name: "أضف إلى السلة" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "الكمية" })).not.toBeInTheDocument();
  });

  it("keeps the quantity controls on the same row as the price without an extra spacer", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <ProductCard product={productsById["veggie-burger"]} />
        <ProductCard product={productsById["beef-burger"]} />
        <ClearCartButton />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    const veggieCard = document
      .querySelector('a[href="/product/veggie-burger"]')
      ?.closest("article");
    if (!veggieCard) throw new Error("the veggie burger card is missing");
    await user.click(within(veggieCard).getByRole("button", { name: "أضف إلى السلة" }));
    const quantity = await within(veggieCard).findByRole("group", { name: "الكمية" });
    await waitFor(() => expect(quantity).toHaveTextContent("1"));

    const card = quantity.closest("article");
    const actionRow = quantity.parentElement;
    expect(actionRow).toHaveTextContent("90");
    expect(actionRow?.className).toContain("min-h-11");
    expect(card?.querySelector("div.mt-1.min-h-11")).not.toBeInTheDocument();
  });

  it("shows only the item price, with no crossed-out campaign price", () => {
    renderApp(<ProductCard product={productsById["beef-burger"]} />);

    const card = document.querySelector("article");
    expect(card).toHaveTextContent("120");
    expect(card?.textContent).not.toContain("150");
    expect(screen.queryByLabelText("السعر قبل الخصم 150")).not.toBeInTheDocument();
  });
});
