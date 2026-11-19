import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useOptionalApp } = vi.hoisted(() => ({ useOptionalApp: vi.fn() }));

vi.mock("@/components/providers", () => ({ useOptionalApp }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { LoadingIndicator } from "@/components/loading-indicator";

const LOGO = "https://cdn.example.com/tenant-logo.png";
const OTHER_LOGO = "https://cdn.example.com/tenant-logo-v2.png";

function branding(logoUrl?: string | null) {
  return { branding: logoUrl === undefined ? null : logoUrl ? { logoUrl } : {} };
}

function renderedImage() {
  return screen.getByRole("status").querySelector("img");
}

beforeEach(() => {
  useOptionalApp.mockReturnValue(null);
});

describe("LoadingIndicator", () => {
  it("uses the tenant logo when branding provides one", () => {
    useOptionalApp.mockReturnValue(branding(LOGO));

    render(<LoadingIndicator className="size-16" />);

    const status = screen.getByRole("status", { name: "جارٍ التحميل" });
    expect(status).toHaveClass("size-16");

    expect(renderedImage()).toHaveAttribute("src", LOGO);
    expect(renderedImage()).toHaveClass("size-full", "animate-pulse-soft");
    expect(renderedImage()).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the shipped loader when branding has no usable logo", () => {
    useOptionalApp.mockReturnValue(branding());
    const { rerender } = render(<LoadingIndicator />);
    expect(renderedImage()).toHaveAttribute("src", "/images/loader.svg");

    // brandingLogoUrl only accepts https, so an insecure URL is "no logo".
    useOptionalApp.mockReturnValue(branding("http://cdn.example.com/logo.png"));
    rerender(<LoadingIndicator />);
    expect(renderedImage()).toHaveAttribute("src", "/images/loader.svg");
  });

  it("falls back to the shipped loader when the logo fails to load", () => {
    useOptionalApp.mockReturnValue(branding(LOGO));

    render(<LoadingIndicator />);
    fireEvent.error(renderedImage()!);

    expect(renderedImage()).toHaveAttribute("src", "/images/loader.svg");
    expect(renderedImage()).not.toHaveClass("animate-pulse-soft");
  });

  it("clears the failure when the logo URL changes", () => {
    useOptionalApp.mockReturnValue(branding(LOGO));

    const { rerender } = render(<LoadingIndicator />);
    fireEvent.error(renderedImage()!);
    expect(renderedImage()).toHaveAttribute("src", "/images/loader.svg");

    useOptionalApp.mockReturnValue(branding(OTHER_LOGO));
    rerender(<LoadingIndicator />);

    expect(renderedImage()).toHaveAttribute("src", OTHER_LOGO);
    expect(renderedImage()).toHaveClass("animate-pulse-soft");
  });

  it("renders the shipped loader without a provider", () => {
    useOptionalApp.mockReturnValue(null);

    expect(() => render(<LoadingIndicator />)).not.toThrow();
    expect(renderedImage()).toHaveAttribute("src", "/images/loader.svg");
  });
});
