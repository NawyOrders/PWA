import { act, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useApp } from "@/components/providers";
import { renderAppHook } from "@/test/render";
import { seedCart, productsById } from "@/lib/data";
import { savedAddresses } from "@/lib/account-data";
import { storageKeys } from "@/lib/storage";

async function app() {
  const hook = renderAppHook(() => useApp());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

describe("AppProvider — cart flow", () => {
  it("hydrates the seeded cart and derives totals", async () => {
    const { result } = await app();
    expect(result.current.lines).toHaveLength(seedCart.length);
    expect(result.current.count).toBe(3);
    expect(result.current.subtotal).toBe(345);
  });

  it("restores a saved cart instead of the seed and drops tampered lines", async () => {
    localStorage.setItem(
      storageKeys.cart,
      JSON.stringify([
        { key: "beef-burger|", productId: "beef-burger", qty: 2, price: 120 },
        { key: 12, productId: null, qty: "many" },
        null,
      ]),
    );
    const { result } = await app();
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.count).toBe(2);
    expect(result.current.subtotal).toBe(240);
  });

  it("merges identical configurations and keeps notes separate", async () => {
    const { result } = await app();
    act(() => result.current.addItem("beef-burger", { price: 120, size: "ساندوتش فقط" }));
    expect(result.current.lines.find((line) => line.key === "beef-burger|ساندوتش فقط")?.qty).toBe(2);

    act(() => result.current.addItem("beef-burger", { price: 120, extras: ["جبن", "بصل"] }));
    act(() => result.current.addItem("beef-burger", { price: 120, extras: ["بصل", "جبن"] }));
    const extraLines = result.current.lines.filter((line) => line.extras?.length);
    expect(extraLines).toHaveLength(1);
    expect(extraLines[0].qty).toBe(2);
    expect(extraLines[0].extras).toEqual(["بصل", "جبن"]);

    act(() => result.current.addItem("beef-burger", { price: 120, note: "بدون بصل" }));
    expect(result.current.lines.filter((line) => line.note === "بدون بصل")).toHaveLength(1);
  });

  it("ignores unknown products", async () => {
    const { result } = await app();
    const before = result.current.lines.length;
    act(() => result.current.addItem("does-not-exist", { price: 10 }));
    expect(result.current.lines).toHaveLength(before);
  });

  it("supports quick add, quantity changes and removal", async () => {
    const { result } = await app();
    act(() => result.current.quickAdd("veggie-burger"));
    const created = result.current.lines.find((line) => line.productId === "veggie-burger")!.key;
    expect(productsById["veggie-burger"].category).toBe("burger");
    expect(result.current.lines.find((line) => line.key === created)?.size).toBe("ساندوتش فقط");

    act(() => result.current.changeQty(created, 2));
    expect(result.current.lines.find((line) => line.key === created)?.qty).toBe(3);

    act(() => result.current.changeQty(created, -3));
    expect(result.current.lines.some((line) => line.key === created)).toBe(false);
  });

  it("removes a single line without touching the rest", async () => {
    const { result } = await app();
    const key = result.current.lines[0].key;
    act(() => result.current.removeLine(key));
    expect(result.current.lines).toHaveLength(seedCart.length - 1);
    expect(result.current.lines.some((line) => line.key === key)).toBe(false);
  });

  it("persists cart mutations", async () => {
    const { result } = await app();
    act(() => result.current.clearCart(true));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.cart)!)).toEqual([]));
  });
});

describe("AppProvider — discounts and notes", () => {
  it("accepts only the supported coupon, case-insensitively", async () => {
    const { result } = await app();
    act(() => expect(result.current.applyCoupon("SAVE50")).toBe(false));
    expect(result.current.coupon).toBeNull();

    act(() => expect(result.current.applyCoupon("  nawy20 ")).toBe(true));
    expect(result.current.coupon).toBe("NAWY20");
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.coupon)!)).toBe("NAWY20"));
  });

  it("clears cart, coupon and note together", async () => {
    const { result } = await app();
    act(() => result.current.applyCoupon("NAWY20"));
    act(() => result.current.setOrderNote("اتصل قبل الوصول"));
    act(() => result.current.clearCart(true));
    expect(result.current.lines).toEqual([]);
    expect(result.current.coupon).toBeNull();
    expect(result.current.orderNote).toBe("");
  });

  it("stores a capped order note", async () => {
    const { result } = await app();
    act(() => result.current.setOrderNote("ملاحظة"));
    expect(result.current.orderNote).toBe("ملاحظة");
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.orderNote)!)).toBe("ملاحظة"));
  });
});

describe("AppProvider — favorites, profile and language", () => {
  it("toggles favorites without duplicates", async () => {
    const { result } = await app();
    expect(result.current.isFavorite("beef-burger")).toBe(true);
    act(() => result.current.toggleFavorite("beef-burger"));
    expect(result.current.isFavorite("beef-burger")).toBe(false);
    act(() => result.current.toggleFavorite("beef-burger"));
    expect(result.current.favorites.filter((id) => id === "beef-burger")).toHaveLength(1);
  });

  it("updates the profile and persists it", async () => {
    const { result } = await app();
    act(() => result.current.updateProfile({ name: "أحمد الجديد", phone: "01000000000" }));
    expect(result.current.profile.name).toBe("أحمد الجديد");
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.profile)!);
      expect(stored.name).toBe("أحمد الجديد");
      expect(stored.phone).toBe("01000000000");
    });
  });

  it("switches language and document direction", async () => {
    const { result } = await app();
    act(() => result.current.setLang("en"));
    expect(result.current.lang).toBe("en");
    expect(result.current.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.lang)!)).toBe("en"));
  });

  it("changes fulfilment without persisting it", async () => {
    const { result } = await app();
    act(() => result.current.setFulfilment("pickup"));
    expect(result.current.fulfilment).toBe("pickup");
    expect(localStorage.getItem("nawy-fulfilment-v1")).toBeNull();
  });
});

describe("AppProvider — auth and addresses", () => {
  it("restores a session from storage", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    const { result } = await app();
    expect(result.current.loggedIn).toBe(true);
  });

  it("logs in, clears the prompt and persists the session", async () => {
    const { result } = await app();
    act(() => result.current.openLoginPrompt("/checkout/payment"));
    expect(result.current.loginPromptOpen).toBe(true);
    expect(result.current.loginPromptNext).toBe("/checkout/payment");

    act(() => result.current.login());
    expect(result.current.loggedIn).toBe(true);
    expect(result.current.loginPromptOpen).toBe(false);
    expect(result.current.loginPromptNext).toBeNull();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.auth)!)).toBe(true));
  });

  it("defaults the prompt to the cart and can close it", async () => {
    const { result } = await app();
    act(() => result.current.openLoginPrompt());
    expect(result.current.loginPromptNext).toBe("/cart");
    act(() => result.current.closeLoginPrompt());
    expect(result.current.loginPromptOpen).toBe(false);
  });

  it("logs out and persists the signed-out state", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    const { result } = await app();
    act(() => result.current.logout());
    expect(result.current.loggedIn).toBe(false);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.auth)!)).toBe(false));
  });

  it("adds, updates, selects and removes addresses", async () => {
    const { result } = await app();
    expect(result.current.addresses).toHaveLength(savedAddresses.length);
    expect(result.current.selectedAddressId).toBe(savedAddresses[0].id);

    act(() =>
      result.current.addAddress({
        id: "home",
        title: "المنزل الجديد",
        detail: "شارع جديد",
        area: "سموحة",
        kind: "home",
        lat: 31.2,
        lng: 29.9,
      }),
    );
    expect(result.current.addresses).toHaveLength(savedAddresses.length);
    expect(result.current.addresses.at(-1)?.title).toBe("المنزل الجديد");
    expect(result.current.selectedAddressId).toBe("home");

    act(() =>
      result.current.addAddress({
        id: "gym",
        title: "الجيم",
        detail: "شارع الرياضة",
        area: "سيدي بشر",
        kind: "other",
        lat: 31.21,
        lng: 29.96,
      }),
    );
    expect(result.current.addresses).toHaveLength(savedAddresses.length + 1);
    expect(result.current.selectedAddressId).toBe("gym");

    act(() => result.current.removeAddress("gym"));
    expect(result.current.selectedAddressId).toBeNull();
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.addresses)!);
      expect(stored.some((address: { id: string }) => address.id === "gym")).toBe(false);
    });
  });
});
