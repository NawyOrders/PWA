import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationsView } from "@/components/notifications-view";
import { renderApp } from "@/test/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

describe("NotificationsView", () => {
  it("shows an empty state and no sample notifications", async () => {
    renderApp(<NotificationsView />);
    expect(await screen.findByText("مفيش إشعارات جديدة")).toBeInTheDocument();
    expect(screen.queryByText(/طلبك في الطريق/)).toBeNull();
    expect(screen.queryByText(/عرض الشقاوة/)).toBeNull();
    expect(screen.queryByText(/١٠٢٤٨/)).toBeNull();
  });
});
