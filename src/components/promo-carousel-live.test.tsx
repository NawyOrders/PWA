import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromoCarousel } from "@/components/promo-carousel";
import { AppTestProvider } from "@/test/render";

const mocks = vi.hoisted(() => ({ feed: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiConfigured: () => true, authTransport: () => "live" as const, apiBaseUrl: () => "https://api.test" };
});
vi.mock("@/lib/tenant-offers", () => ({ offersApi: { feed: mocks.feed } }));

function mount() {
  return render(
    <AppTestProvider>
      <PromoCarousel branchId="b1" />
    </AppTestProvider>,
  );
}

describe("PromoCarousel on a live tenant", () => {
  beforeEach(() => mocks.feed.mockReset());

  it("renders the offers returned by the API", async () => {
    mocks.feed.mockResolvedValue({
      promotionalOffers: [
        { id: "o1", kind: "SingleItem", titleAr: "عرض تجريبي", titleEn: "Test offer", imageUrl: "https://img.test/o1.png", offerPrice: 12, originalPrice: 15, items: [{ menuItemId: "m1" }] },
      ],
      dailyRecurringOffers: [],
    });
    mount();
    expect(await screen.findByText("عرض تجريبي")).toBeInTheDocument();
    expect(mocks.feed).toHaveBeenCalledWith({ branchId: "b1" });
    expect(screen.getByRole("link", { name: /اطلب/ })).toHaveAttribute("href", "/product/m1");
    expect(screen.queryByText("توصيل علينا")).not.toBeInTheDocument();
  });

  it("renders nothing when the feed is empty", async () => {
    mocks.feed.mockResolvedValue({ promotionalOffers: [], dailyRecurringOffers: [] });
    const { container } = mount();
    await waitFor(() => expect(mocks.feed).toHaveBeenCalled());
    expect(container.querySelector("h2")).toBeNull();
  });

  it("skips offers that have no image or title", async () => {
    mocks.feed.mockResolvedValue({
      promotionalOffers: [{ id: "o2", kind: "Combo", titleAr: "", titleEn: "", imageUrl: null }],
      dailyRecurringOffers: [],
    });
    const { container } = mount();
    await waitFor(() => expect(mocks.feed).toHaveBeenCalled());
    expect(container.querySelector("h2")).toBeNull();
  });
});
