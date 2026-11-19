import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddressesView } from "@/components/addresses-view";
import { useApp } from "@/components/providers";
import { renderApp } from "@/test/render";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: (...args: unknown[]) => push(...args),
    replace: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/leaflet-map", () => ({
  LeafletMap: ({ ariaLabel, center }: { ariaLabel: string; center: [number, number] }) => (
    <div data-testid="map" aria-label={ariaLabel} data-center={center.join(",")} />
  ),
}));

function SelectionProbe() {
  const { selectedAddressId } = useApp();
  return <span data-testid="probe">{selectedAddressId ?? "none"}</span>;
}

const searchBox = async () => screen.findByLabelText("ابحث عن عنوان أو موقع");

describe("AddressesView", () => {
  it("shows saved addresses without rendering the map", async () => {
    renderApp(
      <>
        <SelectionProbe />
        <AddressesView />
      </>,
    );

    expect(await screen.findByRole("heading", { name: "عناوينك المحفوظة" })).toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("home");
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ابحث عن عنوان أو موقع")).not.toBeInTheDocument();
  });

  it("selects a saved address from the list", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <SelectionProbe />
        <AddressesView />
      </>,
    );

    const savedAddress = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("القهوة"));
    expect(savedAddress).toBeDefined();
    await user.click(savedAddress!);
    expect(screen.getByTestId("probe").textContent).toBe("cafe");
  });

  it("opens the delivery picker when adding a new address", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    await user.click(await screen.findByRole("button", { name: /اضافة عنوان جديد/ }));
    expect(await screen.findByRole("heading", { name: "اختر مكان التوصيل" })).toBeInTheDocument();
  });

  it("drops an address from the saved list", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    await screen.findByRole("heading", { name: "عناوينك المحفوظة" });
    const before = JSON.parse(window.localStorage.getItem("nawy-addresses-v1") ?? "[]").length;

    await user.click(screen.getAllByRole("button", { name: "حذف العمل" })[0]);

    await waitFor(() => {
      const after = JSON.parse(window.localStorage.getItem("nawy-addresses-v1") ?? "[]").length;
      expect(after).toBe(before - 1);
    });
  });

  it("returns to the profile after saving address changes", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    await user.click(await screen.findByRole("button", { name: "حفظ التغييرات" }));

    expect(push).toHaveBeenCalledWith("/profile");
  });
});
