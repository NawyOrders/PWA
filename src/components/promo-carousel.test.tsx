import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromoCarousel } from "@/components/promo-carousel";
import type { Offer } from "@/lib/offers";
import { AppTestProvider } from "@/test/render";

const VIEWPORT = ".aspect-\\[2\\.5\\/1\\]";

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "offer-1",
    order: 1,
    theme: "dark",
    image: null,
    imageEn: null,
    badgeAr: null,
    badgeEn: null,
    titleAr: "عنوان",
    titleEn: "Title",
    textAr: "نص",
    textEn: "Text",
    ctaAr: "اطلب",
    ctaEn: "Order",
    action: { type: "path", value: "/categories" },
    ...overrides,
  };
}

function renderCarousel(offers: Offer[] | null) {
  return render(
    <AppTestProvider offers={offers}>
      <PromoCarousel />
    </AppTestProvider>,
  );
}

describe("PromoCarousel", () => {
  it("advances and goes back when swiped horizontally", () => {
    const { container } = render(
      <AppTestProvider>
        <PromoCarousel />
      </AppTestProvider>,
    );
    const viewport = container.querySelector(VIEWPORT);
    const tabs = screen.getAllByRole("tab");

    if (!viewport) throw new Error("the promo carousel viewport is missing");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.touchStart(viewport, { touches: [{ clientX: 220 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 150 }] });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.touchStart(viewport, { touches: [{ clientX: 150 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 220 }] });
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the built-in slides when the tenant has no offers file", () => {
    renderCarousel(null);

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByText("كومبو برجر ببلاش")).toBeInTheDocument();
    expect(screen.getAllByText("عرض محدود")).toHaveLength(4);
  });

  it("hides the carousel when the tenant has an empty live list", () => {
    const { container } = renderCarousel([]);

    expect(container.querySelector(VIEWPORT)).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("renders tenant copy, badges, and the CTA route for each action type", () => {
    const { container } = renderCarousel([
      offer({
        id: "product",
        badgeAr: "جديد",
        titleAr: "عرض منتج",
        action: { type: "product", value: "antara" },
      }),
      offer({
        id: "category",
        titleAr: "عرض قسم",
        action: { type: "category", value: "mixes" },
      }),
      offer({
        id: "search",
        titleAr: "عرض بحث",
        action: { type: "search", value: "بيتزا" },
      }),
      offer({
        id: "path",
        titleAr: "عرض مسار",
        action: { type: "path", value: "/categories" },
      }),
    ]);

    expect(screen.getByText("عرض منتج")).toBeInTheDocument();
    expect(screen.getByText("جديد")).toBeInTheDocument();
    expect(screen.queryByText("عرض محدود")).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(4);

    const hrefs = Array.from(container.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/product/antara",
      "/categories/mixes",
      `/search?q=${encodeURIComponent("بيتزا")}`,
      "/categories",
    ]);
  });

  it("lazy-loads tenant artwork and leaves the gradient when there is none", () => {
    const { container } = renderCarousel([
      offer({ id: "with-image", image: "/api/tenant-assets/pablo/images/a.jpg" }),
      offer({ id: "without-image", image: null }),
    ]);

    const images = Array.from(container.querySelectorAll("img"));
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "/api/tenant-assets/pablo/images/a.jpg");
    expect(images[0]).toHaveAttribute("loading", "lazy");
  });

  it("swipes between tenant offers", () => {
    const { container } = renderCarousel([
      offer({ id: "first", titleAr: "الأول" }),
      offer({ id: "second", titleAr: "الثاني" }),
    ]);
    const viewport = container.querySelector(VIEWPORT);
    const tabs = screen.getAllByRole("tab");

    if (!viewport) throw new Error("the promo carousel viewport is missing");
    fireEvent.touchStart(viewport, { touches: [{ clientX: 220 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 150 }] });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });
});
