import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeView } from "@/components/home-view";
import { renderApp } from "@/test/render";

const homeApiState = vi.hoisted(() => ({
  enabled: false,
  categories: [] as Array<{
    id: string;
    nameAr?: string;
    nameEn?: string;
    imageUrl?: string;
  }>,
  items: [] as Array<{ id: string; nameAr?: string; nameEn?: string }>,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiConfigured: () => homeApiState.enabled };
});

vi.mock("@/hooks/use-tenant-menu", () => ({
  useMenuCategories: () => ({
    data: homeApiState.categories,
    loading: false,
    error: false,
  }),
  useMenuItems: (filters: { categoryId?: string }) => ({
    data: {
      items: filters.categoryId === "tenant-pizza" ? homeApiState.items : [],
    },
    loading: false,
    error: false,
  }),
  useMostSold: () => ({
    data: [],
    loading: false,
    error: false,
  }),
  useMenuItem: (id: string, _branchId?: string, enabled = true) => ({
    data: enabled
      ? { id, imageUrl: "https://images.unsplash.com/photo-tenant-pizza.jpg" }
      : null,
    loading: false,
    error: false,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  homeApiState.enabled = false;
  homeApiState.categories = [];
  homeApiState.items = [];
});

function installSection(): HTMLElement {
  const heading = screen.getByRole("heading", { name: /احصل على طعامك/ });
  const section = heading.closest("section");
  if (!section) throw new Error("the app install section is missing");
  return section;
}

describe("HomeView app install section", () => {
  it("renders on phones and tablets instead of staying desktop only", () => {
    renderApp(<HomeView />);

    // The section used to be `hidden lg:block`, so nothing below desktop saw it.
    expect(installSection().className).not.toContain("hidden");
    expect(
      screen.getByRole("button", { name: /متجر آبل/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /جوجل بلاي/ }),
    ).toBeInTheDocument();
  });

  it("sizes the phone preview per breakpoint and pins it only from desktop up", () => {
    renderApp(<HomeView />);

    const preview = installSection().querySelector<HTMLElement>(
      "[class*='lg:absolute']",
    );
    expect(preview).not.toBeNull();
    expect(preview?.className).toContain("mx-auto");
    expect(preview?.className).toContain("lg:absolute");
    const phone = preview?.firstElementChild;
    expect(phone?.className).toContain("w-[155px]");
    expect(phone?.className).toContain("lg:w-[258px]");
  });
});

function categoriesSection(): HTMLElement {
  const section = screen
    .getByRole("heading", { name: "الاقسام" })
    .closest("section");
  if (!section) throw new Error("the categories section is missing");
  return section;
}

/** The scrolling rail, the only category list shown below the tablet breakpoint. */
function categoryRail(): HTMLElement {
  const rail = categoriesSection().querySelector<HTMLElement>(
    "div[class*='sm:hidden']",
  );
  if (!rail) throw new Error("the phone category rail is missing");
  return rail;
}

/** The card grid that replaces the rail from `sm` (tablet) upwards. */
function categoryGrid(): HTMLElement {
  const grid = categoriesSection().querySelector<HTMLElement>(
    "div[class*='sm:grid']",
  );
  if (!grid) throw new Error("the tablet category grid is missing");
  return grid;
}

describe("HomeView categories section", () => {
  it("shows product cards for the selected tenant category", async () => {
    homeApiState.enabled = true;
    homeApiState.categories = [
      {
        id: "tenant-pizza",
        nameAr: "بيتزا",
        imageUrl: "https://images.unsplash.com/photo-tenant-category.jpg",
      },
    ];
    homeApiState.items = [{ id: "tenant-pizza-item", nameAr: "بيتزا خاصة" }];
    const user = userEvent.setup();
    renderApp(<HomeView />);

    await user.click(
      within(categoryGrid()).getByRole("button", { name: /بيتزا/ }),
    );

    expect(
      within(categoryGrid()).getByRole("img", { name: "بيتزا" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("photo-tenant-category.jpg"),
    );
    // The picked category's items fill the food menu; "الأكثر طلباً" now lists
    // the tenant's most sold items instead (useMostSold).
    const section = screen
      .getByRole("heading", { name: "قائمة الطعام" })
      .closest("section");
    if (!section) throw new Error("the food menu section is missing");
    expect(
      await within(section).findByRole("heading", { name: "بيتزا خاصة" }),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("img", { name: "بيتزا خاصة" }),
    ).toHaveAttribute("src", expect.stringContaining("photo-tenant-pizza.jpg"));
  });

  it("offers every category on the phone rail instead of a truncated five", () => {
    renderApp(<HomeView />);

    expect(within(categoryRail()).getAllByRole("button")).toHaveLength(7);
  });

  it("lets the rail scroll edge to edge on phones and stops there", () => {
    renderApp(<HomeView />);

    const rail = categoryRail();
    expect(rail.className).toContain("overflow-x-auto");
    expect(rail.className).toContain("sm:hidden");
    const firstItem = within(rail).getAllByRole("button")[0];
    expect(firstItem.className).toContain("w-[68px]");
    expect(firstItem.className).toContain("shrink-0");
  });

  it("spreads the same categories across the shell from the tablet breakpoint", () => {
    renderApp(<HomeView />);

    const grid = categoryGrid();
    // Used to be `hidden ... lg:grid`, so tablets only ever saw the phone rail.
    expect(grid.className).toContain("sm:grid");
    expect(grid.className).toContain("grid-cols-4");
    expect(grid.className).toContain("lg:grid-cols-7");
    expect(within(grid).getAllByRole("button")).toHaveLength(7);
  });

  it("keeps both layouts in sync when a tablet card is picked", async () => {
    const user = userEvent.setup();
    renderApp(<HomeView />);

    await user.click(
      within(categoryGrid()).getByRole("button", { name: /بيتزا/ }),
    );

    expect(
      within(categoryGrid()).getByRole("button", { name: /بيتزا/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(categoryRail()).getByRole("button", { name: /بيتزا/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(categoryRail()).getByRole("button", { name: /برجر/ }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
