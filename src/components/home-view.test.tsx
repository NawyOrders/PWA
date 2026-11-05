import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeView } from "@/components/home-view";
import { renderApp } from "@/test/render";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
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
    expect(screen.getByRole("button", { name: /متجر آبل/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /جوجل بلاي/ })).toBeInTheDocument();
  });

  it("sizes the phone preview per breakpoint and pins it only from desktop up", () => {
    renderApp(<HomeView />);

    const preview = installSection().querySelector<HTMLElement>("[class*='lg:absolute']");
    expect(preview).not.toBeNull();
    expect(preview?.className).toContain("mx-auto");
    expect(preview?.className).toContain("lg:absolute");
    const phone = preview?.firstElementChild;
    expect(phone?.className).toContain("w-[155px]");
    expect(phone?.className).toContain("lg:w-[258px]");
  });
});
