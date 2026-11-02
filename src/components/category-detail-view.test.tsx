import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryDetailView } from "@/components/category-detail-view";
import { products } from "@/lib/data";
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
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

describe("CategoryDetailView", () => {
  it("renders the category heading, count and popular dishes", () => {
    const { container } = renderApp(<CategoryDetailView categoryId="burger" />);
    const burgerCount = products.filter((product) => product.category === "burger").length;

    expect(screen.getByRole("heading", { name: "قسم «البرجر»" })).toBeInTheDocument();
    expect(screen.getByText(`${burgerCount} أصناف`)).toBeInTheDocument();
    expect(screen.getAllByText("الأكثر طلباً").length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="/product/beef-burger"]')).toBeInTheDocument();
  });

  it("lists every dish in the category exactly once", () => {
    const { container } = renderApp(<CategoryDetailView categoryId="burger" />);

    for (const product of products.filter((item) => item.category === "burger")) {
      expect(container.querySelectorAll(`a[href="/product/${product.id}"]`).length).toBeGreaterThan(0);
    }

    const featured = container.querySelectorAll("article");
    expect(featured.length).toBe(products.filter((product) => product.category === "burger").length);
  });
});
