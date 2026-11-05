import { screen, waitFor } from "@testing-library/react";
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

  it("reserves space below unselected prices only while an item is selected", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <ProductCard product={productsById["veggie-burger"]} />
        <ProductCard product={productsById["beef-burger"]} />
        <ClearCartButton />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Clear cart" }));

    const unselectedCard = document
      .querySelector('a[href="/product/beef-burger"]')
      ?.closest("article");
    const getSpacer = () => unselectedCard?.querySelector("div.mt-1.min-h-11");
    expect(getSpacer()).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "أضف إلى السلة" })[0]);
    await waitFor(() =>
      expect(getSpacer()).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "إنقاص الكمية" }));
    await waitFor(() =>
      expect(getSpacer()).not.toBeInTheDocument(),
    );
  });

  it("shows only the item price, with no crossed-out campaign price", () => {
    renderApp(<ProductCard product={productsById["beef-burger"]} />);

    const card = document.querySelector("article");
    expect(card).toHaveTextContent("120");
    expect(card?.textContent).not.toContain("150");
    expect(screen.queryByLabelText("السعر قبل الخصم 150")).not.toBeInTheDocument();
  });
});
