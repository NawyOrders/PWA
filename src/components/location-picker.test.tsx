import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationPicker } from "@/components/location-picker";
import { useApp } from "@/components/providers";
import { renderApp } from "@/test/render";

vi.mock("@/components/leaflet-map", () => ({
  LeafletMap: ({ ariaLabel, center }: { ariaLabel: string; center: [number, number] }) => (
    <div data-testid="map" aria-label={ariaLabel} data-center={center.join(",")} />
  ),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function AddressProbe() {
  const { addresses, selectedAddressId } = useApp();
  return (
    <p data-testid="probe">
      {addresses.length}::{selectedAddressId ?? "none"}
    </p>
  );
}

describe("LocationPicker", () => {
  it("lists saved addresses and selects one from the sheet", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderApp(
      <>
        <AddressProbe />
        <LocationPicker open onClose={onClose} />
      </>,
    );

    expect(await screen.findByRole("heading", { name: "اختر مكان التوصيل" })).toBeInTheDocument();
    expect(screen.getByText("العنواين المحفوظة")).toBeInTheDocument();

    const saved = screen.getByRole("button", { name: /المنزل/ });
    await user.click(saved);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe").textContent).toContain(":home");
  });

  it("keeps only the map and current-location actions when nothing is saved", async () => {
    window.localStorage.setItem("nawy-addresses-v1", "[]");
    window.localStorage.setItem("nawy-selected-address-v1", "null");
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    expect(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /التوصيل لمكانك الحالي/ })).toBeInTheDocument();
    expect(screen.queryByText("العنواين المحفوظة")).not.toBeInTheDocument();
  });

  it("walks map → details form → save and stores the new address", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderApp(
      <>
        <AddressProbe />
        <LocationPicker open onClose={onClose} />
      </>,
    );

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));
    expect(screen.getByText("طلبك هيوصل هنا")).toBeInTheDocument();
    expect(screen.getByTestId("map")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "تأكيد العنوان" }));
    expect(await screen.findByRole("heading", { name: "تفاصيل العنوان" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("اسم العقار"), "12331");
    await user.type(screen.getByLabelText("الشارع"), "شارع المعراج العلوي");
    await user.type(screen.getByLabelText("اسم العنوان"), "البيت");

    const before = screen.getByTestId("probe").textContent?.split("::");
    await user.click(screen.getByRole("button", { name: "حفظ العنوان" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const after = screen.getByTestId("probe").textContent?.split("::");
    expect(Number(after?.[0])).toBe(Number(before?.[0]) + 1);
    expect(after?.[1]).toMatch(/^addr-\d+$/);
  });

  it("returns from the form to the map and discards the draft with remove", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderApp(<LocationPicker open onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));
    await user.click(screen.getByRole("button", { name: "تأكيد العنوان" }));
    await user.click(screen.getByRole("button", { name: "تغيير" }));
    expect(screen.getByText("طلبك هيوصل هنا")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "تأكيد العنوان" }));
    await user.click(screen.getByRole("button", { name: "ازالة" }));
    expect(await screen.findByRole("heading", { name: "اختر مكان التوصيل" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes from the sheet close control", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderApp(<LocationPicker open onClose={onClose} />);

    await user.click(await screen.findByRole("button", { name: "إغلاق" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps modal semantics while the map stage is showing", async () => {
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));

    const dialog = await screen.findByRole("dialog", { name: "حدد مكان التوصيل على الخريطة" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("طلبك هيوصل هنا")).toBeInTheDocument();
  });

  it("stores the place type picked from the chips", async () => {
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));
    await user.click(screen.getByRole("button", { name: "تأكيد العنوان" }));
    await user.click(await screen.findByRole("button", { name: "مكتب" }));
    await user.type(screen.getByLabelText("اسم العنوان"), "الشغل");
    await user.click(screen.getByRole("button", { name: "حفظ العنوان" }));

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("nawy-addresses-v1") ?? "[]") as {
        kind: string;
        title: string;
      }[];
      expect(stored[stored.length - 1]?.kind).toBe("work");
      expect(stored[stored.length - 1]?.title).toBe("الشغل");
    });
  });

  it("saves the geocoded area shown on the map instead of the offline guess", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            features: [
              {
                geometry: { coordinates: [31.2639, 30.0792] },
                properties: { name: "El Sakakini", city: "Cairo", country: "Egypt" },
              },
            ],
          }),
        }),
      ),
    );
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));
    await screen.findByText("El Sakakini, Cairo, Egypt", {}, { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: "تأكيد العنوان" }));
    expect(await screen.findByRole("heading", { name: "تفاصيل العنوان" })).toBeInTheDocument();
    expect(screen.getByText("El Sakakini, Cairo, Egypt")).toBeInTheDocument();

    await user.type(screen.getByLabelText("اسم العنوان"), "الشغل");
    await user.click(screen.getByRole("button", { name: "حفظ العنوان" }));

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("nawy-addresses-v1") ?? "[]") as {
        area: string;
      }[];
      expect(stored[stored.length - 1]?.area).toBe("El Sakakini, Cairo, Egypt");
    });
  });

  it("centers the map on the browser location when it is available", async () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: (position: { coords: { latitude: number; longitude: number } }) => void) =>
          ok({ coords: { latitude: 31.2096, longitude: 29.9401 } }),
      },
    });

    try {
      const user = userEvent.setup();
      renderApp(<LocationPicker open onClose={vi.fn()} />);

      await user.click(await screen.findByRole("button", { name: /التوصيل لمكانك الحالي/ }));

      expect(await screen.findByText("طلبك هيوصل هنا")).toBeInTheDocument();
      expect(screen.getByTestId("map")).toHaveAttribute("data-center", "31.2096,29.9401");
    } finally {
      Reflect.deleteProperty(window.navigator, "geolocation");
    }
  });

  it("stays on the sheet when the browser cannot locate the device", async () => {
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكانك الحالي/ }));

    expect(await screen.findByRole("heading", { name: "اختر مكان التوصيل" })).toBeInTheDocument();
    expect(screen.queryByText("طلبك هيوصل هنا")).not.toBeInTheDocument();
  });

  it("searches saved places on the map and recenters on the match", async () => {
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));
    const search = await screen.findByLabelText("ابحث عن موقع");

    await user.type(search, "كرموس");
    const suggestion = await screen.findByRole("button", { name: /العمل/ });
    await user.click(suggestion);

    expect(screen.getByTestId("map")).toHaveAttribute("data-center", "31.1906,29.9131");
    expect(search).toHaveValue("");

    await user.type(search, "مفيش كده");
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("map")).toHaveAttribute("data-center", "31.1906,29.9131");
    expect(search).toHaveValue("مفيش كده");
  });

  it("suggests delivery districts, not only saved addresses", async () => {
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));
    const search = await screen.findByLabelText("ابحث عن موقع");

    await user.type(search, "سيدي بشر");
    await user.click(await screen.findByRole("button", { name: /سيدي بشر/ }));

    expect(screen.getByTestId("map")).toHaveAttribute("data-center", "31.2139,29.9611");
  });

  it("says so when a search matches nothing", async () => {
    const user = userEvent.setup();
    renderApp(<LocationPicker open onClose={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /التوصيل لمكان اخر/ }));
    const search = await screen.findByLabelText("ابحث عن موقع");

    await user.type(search, "زفتة");
    expect(await screen.findByText("مفيش نتيجة مطابقة")).toBeInTheDocument();
  });
});
