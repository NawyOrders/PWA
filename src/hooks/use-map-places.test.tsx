import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReversePlaceName } from "@/hooks/use-map-places";
import { renderAppHook } from "@/test/render";

const SAKAKINI = { lat: 30.0792, lng: 31.2639 };

function geocoder(features: unknown[]) {
  return Promise.resolve({ ok: true, json: async () => ({ features }) });
}

const sakakiniFeature = {
  geometry: { coordinates: [31.2639, 30.0792] },
  properties: { name: "El Sakakini", city: "Cairo", country: "Egypt" },
};

describe("useReversePlaceName", () => {
  it("keeps the geocoded label after the lookup is switched off", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => geocoder([sakakiniFeature])));

    let enabled = true;
    const { result, rerender } = renderAppHook(() => useReversePlaceName(SAKAKINI, "en", "Maadi", enabled));
    expect(result.current).toBe("Maadi");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(result.current).toBe("El Sakakini, Cairo, Egypt");

    enabled = false;
    rerender();
    expect(result.current).toBe("El Sakakini, Cairo, Egypt");
  });

  it("falls back for a new point instead of reusing the previous label", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => geocoder([sakakiniFeature])));

    let point = SAKAKINI;
    const { result, rerender } = renderAppHook(() => useReversePlaceName(point, "en", "Smouha", true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(result.current).toBe("El Sakakini, Cairo, Egypt");

    point = { lat: 31.2, lng: 29.93 };
    rerender();
    expect(result.current).toBe("Smouha");
  });

  it("does not call the geocoder while disabled", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => geocoder([sakakiniFeature]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderAppHook(() => useReversePlaceName(SAKAKINI, "en", "Maadi", false));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toBe("Maadi");
  });

  it("stays on the fallback when the geocoder has no match", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => geocoder([])));

    const { result } = renderAppHook(() => useReversePlaceName(SAKAKINI, "en", "Maadi", true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(result.current).toBe("Maadi");
  });
});
