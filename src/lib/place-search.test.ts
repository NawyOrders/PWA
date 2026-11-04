import { describe, expect, it } from "vitest";
import { savedAddresses, type SavedAddress } from "@/lib/account-data";
import { translate } from "@/lib/i18n";
import { deliveryAreaLabel, searchPlaces } from "@/lib/place-search";

const t = (text: string) => translate("ar", text);

const search = (query: string, options: { lang?: "ar" | "en"; addresses?: SavedAddress[]; limit?: number } = {}) => {
  const lang = options.lang ?? "ar";
  return searchPlaces({
    query,
    addresses: options.addresses ?? savedAddresses,
    lang,
    t: (text) => translate(lang, text),
    limit: options.limit,
  });
};

describe("searchPlaces", () => {
  it("returns nothing for a blank query", () => {
    expect(search("")).toEqual([]);
    expect(search("   ")).toEqual([]);
  });

  it("finds a delivery district by its Arabic name", () => {
    const results = search("سيدي بشر");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ key: "area-sidi-bishr", saved: false, lat: 31.2139, lng: 29.9611 });
  });

  it("finds the same district by its English name, in either language", () => {
    expect(search("sidi")).toMatchObject([{ key: "area-sidi-bishr" }]);
    expect(search("SIDI BISHR")[0]?.title).toBe("سيدي بشر");
    expect(search("smouha")).toMatchObject([{ key: "area-smouha" }]);
  });

  it("matches saved addresses through their translation, not only the stored Arabic text", () => {
    const english = search("home", { lang: "en" });
    expect(english.some((place) => place.key === "saved-home")).toBe(true);
    expect(english.find((place) => place.key === "saved-home")).toMatchObject({ saved: true, addressId: "home" });

    // The same Arabic record is reachable while the UI speaks Arabic.
    expect(search("المنزل").some((place) => place.key === "saved-home")).toBe(true);
  });

  it("lists saved addresses before districts", () => {
    const results = search("كرموس");
    expect(results[0]?.saved).toBe(true);
    expect(results.map((place) => place.saved)).toContain(false);
  });

  it("allows map searches to move to districts outside the delivery range", () => {
    expect(search("maadi")).toMatchObject([{ key: "area-maadi", lat: 29.9603, lng: 31.2569 }]);
    expect(search("المعادي")).toMatchObject([{ key: "area-maadi" }]);
  });

  it("caps the list so the dropdown stays scannable", () => {
    expect(search("ا", { limit: 3 })).toHaveLength(3);
    expect(search("ا")).toHaveLength(6);
  });

  it("labels districts in the active language", () => {
    expect(deliveryAreaLabel("ar")).toBe("منطقة توصيل");
    expect(deliveryAreaLabel("en")).toBe("Delivery area");
    expect(search("سيدي بشر", { lang: "ar" })[0]?.subtitle).toBe("منطقة توصيل");
    expect(search("سيدي بشر", { lang: "en" })[0]?.subtitle).toBe("Delivery area");
  });
});
