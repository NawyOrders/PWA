import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoriesView } from "@/components/categories-view";
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

describe("CategoriesView", () => {
  it("renders the mobile category catalogue with a link per category", () => {
    const { container } = renderApp(<CategoriesView />);

    for (const id of ["burger", "pizza", "appetizers", "desserts", "chicken", "drinks", "tost"]) {
      expect(container.querySelector(`a[href="/categories/${id}"]`)).toBeInTheDocument();
    }

    expect(screen.getByRole("heading", { name: "الاقسام" })).toBeInTheDocument();
    expect(container.querySelectorAll('a[href^="/categories/"]')).toHaveLength(7);
    expect(screen.getAllByText(/صنف/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/عرض كل الأصناف/)).not.toBeInTheDocument();
  });
});
