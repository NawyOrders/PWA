import { screen, waitFor, within } from "@testing-library/react";
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
  it("shows the saved addresses and the map search together", async () => {
    renderApp(
      <>
        <SelectionProbe />
        <AddressesView />
      </>,
    );

    expect(await screen.findByRole("heading", { name: "عناوينك المحفوظة" })).toBeInTheDocument();
    expect(screen.getByTestId("probe").textContent).toBe("home");
    expect(await searchBox()).toBeInTheDocument();
    expect(screen.getByTestId("map")).toBeInTheDocument();
  });

  it("searches districts on the desktop map and moves the view to the match", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    const search = await searchBox();
    await user.type(search, "سيدي بشر");

    const option = await screen.findByRole("button", { name: /سيدي بشر/ });
    await user.click(option);

    expect(screen.getByTestId("map")).toHaveAttribute("data-center", "31.2139,29.9611");
    expect(search).toHaveValue("");
  });

  it("accepts an English district name even though the data is Arabic", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    const search = await searchBox();
    await user.type(search, "karmous");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(screen.getByTestId("map")).toHaveAttribute("data-center", "31.1906,29.9131"));
    expect(search).toHaveValue("");
  });

  it("selects a saved address from the search results", async () => {
    const user = userEvent.setup();
    renderApp(
      <>
        <SelectionProbe />
        <AddressesView />
      </>,
    );

    const search = await searchBox();
    await user.type(search, "القهوة");

    const list = search.parentElement?.parentElement as HTMLElement;
    const option = await within(list).findByRole("button", { name: /القهوة/ });
    await user.click(option);

    expect(screen.getByTestId("probe").textContent).toBe("cafe");
    expect(search).toHaveValue("");
  });

  it("keeps the query and the map still when nothing matches", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    const search = await searchBox();
    const before = screen.getByTestId("map").getAttribute("data-center");

    await user.type(search, "زفتة");
    expect(await screen.findByText("مفيش نتيجة مطابقة")).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(search).toHaveValue("زفتة");
    expect(screen.getByTestId("map")).toHaveAttribute("data-center", String(before));
  });

  it("never offers a district outside the delivery range", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    const search = await searchBox();
    await user.type(search, "المعادي");
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByRole("button", { name: /المعادي/ })).not.toBeInTheDocument();
    expect(screen.getByText("مفيش نتيجة مطابقة")).toBeInTheDocument();
  });

  it("clears the search from the inline cancel control", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    const search = await searchBox();
    await user.type(search, "سموحة");
    expect(search).toHaveValue("سموحة");

    await user.click(screen.getByRole("button", { name: "إلغاء" }));
    expect(search).toHaveValue("");
    expect(screen.queryByText("مفيش نتيجة مطابقة")).not.toBeInTheDocument();
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

  it("moves the map to the browser location when it is available", async () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: (position: { coords: { latitude: number; longitude: number } }) => void) =>
          ok({ coords: { latitude: 31.2096, longitude: 29.9401 } }),
      },
    });

    try {
      const user = userEvent.setup();
      renderApp(<AddressesView />);

      await user.click(await screen.findByRole("button", { name: /استخدم موقعي الحالي/ }));

      await waitFor(() => expect(screen.getByTestId("map")).toHaveAttribute("data-center", "31.2096,29.9401"));
    } finally {
      Reflect.deleteProperty(window.navigator, "geolocation");
    }
  });

  it("says so when the browser cannot locate the device", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    await user.click(await screen.findByRole("button", { name: /استخدم موقعي الحالي/ }));

    expect(await screen.findByText("متصفحك مش بيدعم تحديد الموقع")).toBeInTheDocument();
  });

  it("carries the chosen address into checkout", async () => {
    const user = userEvent.setup();
    renderApp(<AddressesView />);

    await user.click(await screen.findByRole("button", { name: "حفظ التغييرات" }));

    expect(push).toHaveBeenCalledWith("/checkout/delivery");
  });
});
