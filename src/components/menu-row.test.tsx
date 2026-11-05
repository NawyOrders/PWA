import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MenuRow } from "@/components/menu-row";
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

describe("MenuRow cart quantity controls", () => {
  it("replaces add with quantity controls in the add button position", async () => {
    const user = userEvent.setup();
    renderApp(<MenuRow product={productsById["veggie-burger"]} />);

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

  it("uses compact controls on narrow screens and shows no crossed-out old price", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <MenuRow product={productsById["beef-burger"]} />
        <ClearCartButton />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Clear cart" }));
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.queryByLabelText("السعر قبل الخصم 150")).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "أضف إلى السلة" }));
    const quantity = await screen.findByRole("group", { name: "الكمية" });
    expect(quantity.className).toContain("max-[375px]:[&_button]:size-7");
  });
});
