import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AboutView } from "@/components/about-view";
import { Footer } from "@/components/footer";
import { BrandWordmark, LogoMark } from "@/components/logo";
import { storageKeys } from "@/lib/storage";
import { AppTestProvider, renderApp } from "@/test/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string | { pathname?: string }; children: ReactNode }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

function renderTenant(ui: ReactNode, tenantSlug: string) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppTestProvider tenantSlug={tenantSlug}>{children}</AppTestProvider>
    ),
  });
}

describe("brand rendering", () => {
  it("uses the names the server resolved for LogoMark", () => {
    render(<LogoMark nameAr="بابلو" nameEn="Pablo" />);

    expect(screen.getByRole("img", { name: "بابلو" })).toBeInTheDocument();
  });

  it("switches LogoMark to the English name when the app is in English", async () => {
    localStorage.setItem(storageKeys.lang, JSON.stringify("en"));
    renderApp(<LogoMark nameAr="بابلو" nameEn="Pablo" />);

    expect(await screen.findByRole("img", { name: "Pablo" })).toBeInTheDocument();
  });

  it("keeps the tagline on the default site", () => {
    renderApp(<BrandWordmark />);

    expect(screen.getByText("ناوي أوردرز")).toBeInTheDocument();
    expect(screen.getByText("Nawy Orders")).toBeInTheDocument();
  });

  it("hides the Nawy tagline under the logo for a tenant", () => {
    renderTenant(<BrandWordmark />, "pablo");

    expect(screen.getByText("pablo")).toBeInTheDocument();
    expect(screen.queryByText("Nawy Orders")).not.toBeInTheDocument();
  });

  it("shows the tenant slug, not Nawy Orders, in the footer without branding", () => {
    renderTenant(<Footer />, "pablo");

    expect(screen.getByText("© 2026 pablo — جميع الحقوق محفوظة.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "عن pablo" })).toBeInTheDocument();
    expect(screen.queryByText(/Nawy Orders/)).not.toBeInTheDocument();
    expect(screen.queryByText("ناوي أوردرز")).not.toBeInTheDocument();
  });

  it("shows the tenant slug, not Nawy Orders, on the about page without branding", () => {
    renderTenant(<AboutView />, "pablo");

    expect(screen.getByText("pablo — طعم يوصلك لباب البيت.")).toBeInTheDocument();
    expect(screen.getByText("© 2026 pablo — جميع الحقوق محفوظة.")).toBeInTheDocument();
    expect(screen.queryByText("ناوي أوردرز")).not.toBeInTheDocument();
    // The platform card credits the vendor; only the storefront block is the
    // tenant's, so it must not fall back to the Nawy tagline.
    expect(screen.queryByText(/Nawy Orders — طعم/)).not.toBeInTheDocument();
  });

  it("keeps the default-site footer copy unchanged", () => {
    renderApp(<Footer />);

    expect(screen.getByText("© 2026 ناوي أوردرز — جميع الحقوق محفوظة.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "عن ناوي أوردرز" })).toBeInTheDocument();
    expect(screen.getByText("ناوي أوردرز")).toBeInTheDocument();
  });

  it("keeps the default-site about copy unchanged", () => {
    renderApp(<AboutView />);

    expect(screen.getByText("ناوي أوردرز — طعم يوصلك لباب البيت.")).toBeInTheDocument();
    expect(screen.getByText("© 2026 ناوي أوردرز — جميع الحقوق محفوظة.")).toBeInTheDocument();
  });
});
