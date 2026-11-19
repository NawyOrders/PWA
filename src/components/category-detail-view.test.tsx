import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryDetailView } from "@/components/category-detail-view";
import { renderApp } from "@/test/render";
import { testCategoriesById } from "@/test/menu";

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

const burgerItems = testCategoriesById.get("burger")!.items;

describe("CategoryDetailView", () => {
  it("renders the category heading and the menu item count", () => {
    const { container } = renderApp(<CategoryDetailView categoryId="burger" />);

    expect(screen.getByRole("heading", { name: "قسم «البرجر»" })).toBeInTheDocument();
    expect(screen.getByText(`${burgerItems.length} أصناف`)).toBeInTheDocument();
    expect(container.querySelector('a[href="/product/beef-burger"]')).toBeInTheDocument();
  });

  it("lists every dish in the category exactly once", () => {
    const { container } = renderApp(<CategoryDetailView categoryId="burger" />);

    for (const item of burgerItems) {
      expect(container.querySelectorAll(`a[href="/product/${item.id}"]`).length).toBeGreaterThan(0);
    }

    expect(container.querySelectorAll("article")).toHaveLength(burgerItems.length);
  });

  it("explains that a category missing from the menu is unavailable", () => {
    renderApp(<CategoryDetailView categoryId="not-on-the-menu" />);

    expect(screen.getByText("هذا القسم مش متاح في منيو المطعم دلوقتي.")).toBeInTheDocument();
  });
});
