import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromoCarousel } from "@/components/promo-carousel";
import { AppTestProvider } from "@/test/render";

describe("PromoCarousel", () => {
  it("advances and goes back when swiped horizontally", () => {
    const { container } = render(
      <AppTestProvider>
        <PromoCarousel />
      </AppTestProvider>,
    );
    const viewport = container.querySelector(".aspect-\\[2\\.5\\/1\\]");
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
});
