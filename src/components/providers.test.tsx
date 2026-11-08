import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_TRANSIENT_REFRESH_RETRIES,
  TRANSIENT_REFRESH_RETRY_MS,
  seedProfile,
  useApp,
  useOptionalApp,
} from "@/components/providers";
import { AppError, type AuthErrorCode } from "@/lib/api";
import { useCustomerSession } from "@/hooks/use-customer-session";
import { localAccount, rememberLocalAccount } from "@/lib/local-accounts";
import { renderAppHook } from "@/test/render";
import { seedCart, seedFavorites, productsById, orders as seedOrders, branches, user, type Order } from "@/lib/data";
import { savedAddresses } from "@/lib/account-data";
import { storageKeys } from "@/lib/storage";
import type { AuthTransport, CustomerSessionPayload, TokenPair } from "@/lib/api";
import type { CustomerSession } from "@/lib/session";

/**
 * The provider talks to the tenant API only when a backend is wired up, so the
 * client is mocked here and one flag switches the whole app between the offline
 * demo, the contract simulator and the real backend. The same flag is what
 * `authTransport()` answers, because the provider asks it before adopting a
 * legacy token, before refreshing and before revoking on sign-out.
 */
const apiMode = vi.hoisted(() => ({ transport: "demo" as AuthTransport }));
const api = vi.hoisted(() => ({
  fetchBranding: vi.fn(),
  refreshSession: vi.fn(),
  revokeSession: vi.fn(),
  attachStoredRefresh: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiConfigured: () => apiMode.transport !== "demo",
    apiBaseUrl: () => (apiMode.transport === "demo" ? "" : "https://api.test"),
    apiUrl: (path: string) => `https://api.test/${path.replace(/^\//, "")}`,
    authTransport: () => apiMode.transport,
    fetchBranding: api.fetchBranding,
    refreshSession: api.refreshSession,
    revokeSession: api.revokeSession,
    attachStoredRefresh: api.attachStoredRefresh,
  };
});

/**
 * What the provider is allowed to keep in storage: the identity and nothing
 * else. The access token is memory-only and the refresh token lives in an
 * httpOnly cookie the BFF routes own, so no fixture here can carry either.
 */
const identity: CustomerSession = {
  customerId: "customer-1",
  phoneNumber: "+201012345678",
  fullName: "Nawy Guest",
  email: null,
};

/** A record written by a pre-cookie build, tokens and all, as found on disk. */
function legacyRecord() {
  return {
    ...identity,
    accessToken: "legacy-access",
    refreshToken: "legacy-refresh",
    accessExpiresAt: Date.now() + 900_000,
  };
}

/** What `/otp/verify` hands the app after the BFF stripped the refresh token. */
function sessionPayload(options: Partial<CustomerSessionPayload> = {}): CustomerSessionPayload {
  return {
    ...identity,
    accessToken: "access-token",
    tokenType: "Bearer",
    expiresIn: 900,
    expiresAtUtc: new Date(Date.now() + 900_000).toISOString(),
    ...options,
  };
}

/** A payload whose token is already inside the 60s safety window the provider watches. */
function dyingPayload(accessToken = "access-token"): CustomerSessionPayload {
  return sessionPayload({
    accessToken,
    expiresIn: 30,
    expiresAtUtc: new Date(Date.now() + 30_000).toISOString(),
  });
}

/** What `/api/auth/refresh` answers: a new access token, never a new refresh token. */
function tokenPair(accessToken = "rotated-access", lifetimeMs = 900_000): TokenPair {
  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: Math.round(lifetimeMs / 1000),
    expiresAtUtc: new Date(Date.now() + lifetimeMs).toISOString(),
    refreshTokenExpiresAtUtc: null,
  };
}

const expiredSessionMessage = "انتهت الجلسة، سجّل الدخول تاني";

/**
 * A refresh failure as the client actually reports one: an `AppError` carrying
 * the status the tenant sent and, when it sent one, the domain code. The
 * distinction the provider makes — the backend refusing a dead credential
 * versus the backend not answering at all — is only visible in those two
 * fields, so a bare `Error` here would test the wrong thing.
 */
function refusal(status: number, code: AuthErrorCode | null): AppError {
  return new AppError({
    kind: status === 401 ? "unauthorized" : status >= 500 ? "server" : "offline",
    status,
    code,
  });
}

type FetchCall = { url: string; init: RequestInit };

/** Records every tenant call the auth fetch wrapper makes and answers with a status. */
function stubFetch(statusFor: (call: FetchCall) => number): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const call: FetchCall = { url: String(input), init };
      calls.push(call);
      return new Response("{}", {
        status: statusFor(call),
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return calls;
}

function bearer(call: FetchCall): string | null {
  return new Headers(call.init.headers).get("Authorization");
}

async function app() {
  const hook = renderAppHook(() => useApp());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

/**
 * Every block that wires the backend flips the transport in its own `beforeEach`
 * and runs inside the mocked client; the offline demo is the default each test
 * starts from, so no suite can leak a live transport into the next one.
 */
beforeEach(() => {
  apiMode.transport = "demo";
});

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
        // A stored line can carry anything a previous version wrote: extras
        // that are not text are dropped rather than rendered.
        { key: "veggie-burger|", productId: "veggie-burger", qty: 1, price: 90, extras: ["جبن", 42, null] },
        { key: 12, productId: null, qty: "many" },
        null,
      ]),
    );
    const { result } = await app();
    expect(result.current.lines).toHaveLength(2);
    expect(result.current.count).toBe(3);
    expect(result.current.subtotal).toBe(330);
    expect(result.current.lines[1]?.extras).toEqual(["جبن"]);
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

describe("AppProvider — checkout details", () => {
  it("persists the selected branch and ignores unknown branches", async () => {
    const { result } = await app();
    expect(result.current.selectedBranchId).toBe(branches[0].id);

    act(() => result.current.selectBranch("smouha"));
    expect(result.current.selectedBranchId).toBe("smouha");
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(storageKeys.selectedBranch)!)).toBe("smouha"),
    );

    act(() => result.current.selectBranch("does-not-exist"));
    expect(result.current.selectedBranchId).toBe("smouha");
  });

  it("hydrates a stored branch but falls back when it is no longer valid", async () => {
    localStorage.setItem(storageKeys.selectedBranch, JSON.stringify("maadi"));
    const first = await app();
    expect(first.result.current.selectedBranchId).toBe("maadi");
    first.unmount();

    localStorage.setItem(storageKeys.selectedBranch, JSON.stringify("closed-store"));
    const second = await app();
    expect(second.result.current.selectedBranchId).toBe(branches[0].id);
  });

  it("updates delivery details, caps long input and persists them", async () => {
    const { result } = await app();
    act(() =>
      result.current.updateDeliveryDetails({
        building: "5",
        floor: "3",
        instructions: "ا".repeat(300),
        name: "منى",
      }),
    );
    expect(result.current.deliveryDetails.building).toBe("5");
    expect(result.current.deliveryDetails.floor).toBe("3");
    expect(result.current.deliveryDetails.name).toBe("منى");
    expect(result.current.deliveryDetails.instructions).toHaveLength(200);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.deliveryDetails)!);
      expect(stored.building).toBe("5");
      expect(stored.instructions).toHaveLength(200);
    });
  });

  it("merges stored delivery details over defaults and drops wrong types", async () => {
    localStorage.setItem(
      storageKeys.deliveryDetails,
      JSON.stringify({ building: 42, name: "ن".repeat(120), phone: null }),
    );
    const { result } = await app();
    expect(result.current.deliveryDetails.building).toBe("12");
    expect(result.current.deliveryDetails.name).toHaveLength(80);
    expect(typeof result.current.deliveryDetails.phone).toBe("string");
  });
});

describe("AppProvider — order lifecycle", () => {
  it("records a delivery order from the current cart and persists it", async () => {
    const { result } = await app();
    expect(result.current.orders).toHaveLength(seedOrders.length);

    let placed: Order | null = null;
    act(() => {
      placed = result.current.placeOrder("cash");
    });

    expect(placed).not.toBeNull();
    expect(placed!.id).toBe("10249");
    expect(placed!.status).toBe("preparing");
    expect(placed!.paymentMethod).toBe("cash");
    expect(placed!.fulfilment).toBe("delivery");
    expect(placed!.total).toBe(345 + 30);
    expect(placed!.items).toHaveLength(seedCart.length);
    expect(placed!.items?.[0]).toMatchObject({ productId: seedCart[0].productId, qty: seedCart[0].qty });
    expect(placed!.branchId).toBeUndefined();
    expect(placed!.address).toContain(savedAddresses[0].detail);
    expect(result.current.orders[0].id).toBe("10249");
    expect(result.current.orders).toHaveLength(seedOrders.length + 1);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.orders)!);
      expect(stored[0].id).toBe("10249");
      expect(stored[0].items).toHaveLength(seedCart.length);
    });
  });

  it("records a delivery order against the account address when the stored selection is gone", async () => {
    // Storage is untrusted input: an id naming an address that no longer exists
    // must not put `undefined` — or a deleted address — into a placed order.
    localStorage.setItem(storageKeys.selectedAddress, JSON.stringify("deleted-address"));

    const { result } = await app();
    expect(result.current.selectedAddressId).toBeNull();

    let placed: Order | null = null;
    act(() => {
      placed = result.current.placeOrder("cash");
    });

    expect(placed).not.toBeNull();
    expect(placed!.fulfilment).toBe("delivery");
    expect(placed!.address).toBe(user.address);
  });

  it("applies coupon and pickup branch to the recorded order", async () => {
    const { result } = await app();
    act(() => result.current.setFulfilment("pickup"));
    act(() => result.current.selectBranch("smouha"));
    act(() => result.current.applyCoupon("nawy20"));

    let placed: Order | null = null;
    act(() => {
      placed = result.current.placeOrder("wallet");
    });

    expect(placed!.total).toBe(345 - 50);
    expect(placed!.fulfilment).toBe("pickup");
    expect(placed!.branchId).toBe("smouha");
    expect(placed!.address).toBe("فرع سموحة");
    expect(placed!.paymentMethod).toBe("wallet");
  });

  it("increments order ids without reusing earlier ids", async () => {
    const { result } = await app();
    let first: Order | null = null;
    let second: Order | null = null;
    act(() => {
      first = result.current.placeOrder("cash");
    });
    act(() => {
      second = result.current.placeOrder("cash");
    });
    expect(first!.id).toBe("10249");
    expect(second!.id).toBe("10250");
  });

  it("refuses to place an empty order", async () => {
    const { result } = await app();
    act(() => result.current.clearCart(true));
    let placed: Order | null = null;
    act(() => {
      placed = result.current.placeOrder("cash");
    });
    expect(placed).toBeNull();
    expect(result.current.orders).toHaveLength(seedOrders.length);
  });

  it("drops malformed stored orders and repairs unsafe fields", async () => {
    localStorage.setItem(
      storageKeys.orders,
      JSON.stringify([
        { id: "9001", title: "طلب صالح", description: "وصف", total: 120, status: "delivered", image: "//evil.example/x.png" },
        { id: "9002", title: "ناقص", description: "وصف", total: -1, status: "preparing" },
        { id: "", title: "بدون رقم", description: "وصف", total: 10, status: "preparing" },
        { id: "../settings", title: "مسار غريب", description: "وصف", total: 10, status: "preparing" },
        { id: "9003", title: "حالة غلط", description: "وصف", total: 10, status: "flying" },
        null,
        "order",
      ]),
    );
    const { result } = await app();
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0]).toMatchObject({ id: "9001", status: "delivered" });
    expect(result.current.orders[0].image).toBe("/images/burger.webp");
  });
});

describe("AppProvider — local account ownership", () => {
  const PHONE = "01012345678";
  const NORMALIZED = "+201012345678";
  const OTHER = "+201198765432";

  it("starts a new local account empty instead of inheriting the seeded history", async () => {
    const { result } = await app();
    expect(result.current.favorites).toEqual(seedFavorites);
    expect(result.current.orders).toHaveLength(seedOrders.length);

    act(() => {
      result.current.adoptLocalAccount(PHONE);
      result.current.login();
    });

    expect(result.current.loggedIn).toBe(true);
    expect(result.current.favorites).toEqual([]);
    expect(result.current.orders).toEqual([]);
    expect(result.current.points).toBe(0);
    await waitFor(() => expect(localAccount(NORMALIZED)).toEqual({ points: 0, favorites: [], orders: [] }));
  });

  it("saves what the customer changes into their own slot and nobody else's", async () => {
    rememberLocalAccount(OTHER, { points: 90, favorites: ["fries"], orders: [] });
    const { result } = await app();
    act(() => {
      result.current.adoptLocalAccount(PHONE);
      result.current.login();
    });

    act(() => result.current.toggleFavorite("beef-burger"));
    act(() => {
      result.current.placeOrder("cash");
    });

    await waitFor(() => {
      expect(localAccount(NORMALIZED)?.favorites).toEqual(["beef-burger"]);
      expect(localAccount(NORMALIZED)?.orders).toHaveLength(1);
    });
    expect(localAccount(OTHER)).toEqual({ points: 90, favorites: ["fries"], orders: [] });
  });

  it("hands the shared device back the neutral view on logout and keeps the slot", async () => {
    const { result } = await app();
    act(() => {
      result.current.adoptLocalAccount(PHONE);
      result.current.login();
    });
    act(() => result.current.toggleFavorite("beef-burger"));
    act(() => {
      result.current.placeOrder("cash");
    });
    await waitFor(() => expect(localAccount(NORMALIZED)?.orders).toHaveLength(1));

    act(() => result.current.logout());

    expect(result.current.loggedIn).toBe(false);
    expect(result.current.favorites).toEqual(seedFavorites);
    expect(result.current.orders).toHaveLength(seedOrders.length);
    expect(result.current.points).toBe(0);
    // The slot is that customer's copy: the sign-out does not erase it, and the
    // neutral view the device now shows is never written over it.
    expect(localAccount(NORMALIZED)?.favorites).toEqual(["beef-burger"]);
    expect(localAccount(NORMALIZED)?.orders).toHaveLength(1);
    await waitFor(() => expect(JSON.parse(String(localStorage.getItem(storageKeys.accountPhone)))).toBeNull());
    await waitFor(() => expect(JSON.parse(String(localStorage.getItem(storageKeys.favorites)))).toEqual(seedFavorites));
  });

  it("restores the saved slot — balance included — on the next sign-in", async () => {
    rememberLocalAccount(PHONE, { points: 240, favorites: ["beef-burger"], orders: [seedOrders[0]] });
    const { result } = await app();
    act(() => {
      // The same customer, typed the way a phone keypad offers it.
      result.current.adoptLocalAccount("0020 10 1234 5678");
      result.current.login();
    });

    expect(result.current.favorites).toEqual(["beef-burger"]);
    expect(result.current.orders.map((order) => order.id)).toEqual([seedOrders[0].id]);
    expect(result.current.points).toBe(240);
  });

  it("drops a tampered balance and an unsafe pointer from storage", async () => {
    localStorage.setItem(storageKeys.points, JSON.stringify(-40));
    localStorage.setItem(storageKeys.accountPhone, JSON.stringify("../../settings"));
    const { result } = await app();

    expect(result.current.points).toBe(0);
    await waitFor(() => expect(JSON.parse(String(localStorage.getItem(storageKeys.points)))).toBe(0));
    await waitFor(() => expect(JSON.parse(String(localStorage.getItem(storageKeys.accountPhone)))).toBeNull());
  });

  it("keeps a reload writing into the slot the pointer names", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    localStorage.setItem(storageKeys.accountPhone, JSON.stringify(NORMALIZED));
    localStorage.setItem(storageKeys.favorites, JSON.stringify(["beef-burger"]));
    const { result } = await app();
    expect(result.current.loggedIn).toBe(true);
    await waitFor(() => expect(localAccount(NORMALIZED)?.favorites).toEqual(["beef-burger"]));

    act(() => result.current.toggleFavorite("beef-burger"));
    await waitFor(() => expect(localAccount(NORMALIZED)?.favorites).toEqual([]));
  });

  it("attaches the data on screen to the signed-in identity when storage has no pointer", async () => {
    // Storage written before account data had an owner: dropping it would lose
    // a returning customer's history, so the identity signs for it instead.
    localStorage.setItem(storageKeys.auth, "true");
    localStorage.setItem(storageKeys.favorites, JSON.stringify(["beef-burger"]));
    const { result } = await app();

    await waitFor(() => expect(localAccount(result.current.profile.phone)?.favorites).toEqual(["beef-burger"]));
  });

  it("attaches a restored session's own number when storage has no pointer", async () => {
    apiMode.transport = "mock";
    api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: null });
    api.refreshSession.mockResolvedValue(tokenPair());
    api.attachStoredRefresh.mockResolvedValue(undefined);
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));
    localStorage.setItem(storageKeys.favorites, JSON.stringify(["fries"]));
    const { result } = await app();

    await waitFor(() => expect(result.current.customer?.customerId).toBe("customer-1"));
    // The session's number owns the slot, not the profile the device happens to
    // be showing: against the simulator the verified identity is the authority.
    await waitFor(() => expect(localAccount(identity.phoneNumber)?.favorites).toEqual(["fries"]));
  });

  it("claims no slot for an identity with no number at all", async () => {
    localStorage.setItem(storageKeys.auth, "true");
    localStorage.setItem(storageKeys.profile, JSON.stringify({ ...seedProfile, phone: "" }));
    const { result } = await app();

    expect(result.current.loggedIn).toBe(true);
    expect(localStorage.getItem(storageKeys.localAccounts)).toBeNull();
  });

  it("lets an existing slot win over the data a load happens to show", async () => {
    rememberLocalAccount(NORMALIZED, { points: 7, favorites: ["fries"], orders: [] });
    localStorage.setItem(storageKeys.auth, "true");
    localStorage.setItem(storageKeys.profile, JSON.stringify({ ...seedProfile, phone: NORMALIZED }));
    localStorage.setItem(storageKeys.favorites, JSON.stringify(["beef-burger"]));
    const { result } = await app();

    await waitFor(() => expect(result.current.favorites).toEqual(["fries"]));
    expect(result.current.points).toBe(7);
  });

  it("ignores a phone with no digits rather than claiming a slot for it", async () => {
    const { result } = await app();
    act(() => result.current.adoptLocalAccount("+++"));
    expect(result.current.favorites).toEqual(seedFavorites);
    expect(localStorage.getItem(storageKeys.localAccounts)).toBeNull();
  });

  it("never reads or writes a browser slot against the live tenant API", async () => {
    apiMode.transport = "live";
    api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: null });
    api.refreshSession.mockResolvedValue(tokenPair());
    api.revokeSession.mockResolvedValue(undefined);
    api.attachStoredRefresh.mockResolvedValue(undefined);
    rememberLocalAccount(NORMALIZED, { points: 240, favorites: ["cola"], orders: [] });

    const { result } = await app();
    // The payload's phone is the slot's phone: only the transport guard stands
    // between a real customer's history and a browser localStorage row.
    act(() => result.current.login(sessionPayload()));
    await waitFor(() => expect(result.current.loggedIn).toBe(true));

    expect(result.current.favorites).toEqual(seedFavorites);
    expect(result.current.orders).toHaveLength(seedOrders.length);
    expect(result.current.points).toBe(0);

    act(() => result.current.toggleFavorite("fries"));
    act(() => {
      result.current.placeOrder("cash");
    });
    const recorded = result.current.orders.length;

    expect(localAccount(NORMALIZED)).toEqual({ points: 240, favorites: ["cola"], orders: [] });
    expect(localStorage.getItem(storageKeys.accountPhone)).toBe("null");

    // And a sign-out does not wipe what this device recorded for a real account.
    act(() => result.current.logout());
    expect(result.current.orders).toHaveLength(recorded);
    expect(result.current.favorites).toContain("fries");
  });
});

describe("AppProvider — untrusted storage", () => {
  it("drops unknown favorite ids and duplicates", async () => {
    localStorage.setItem(
      storageKeys.favorites,
      JSON.stringify(["beef-burger", "not-a-product", "beef-burger", 9]),
    );
    const { result } = await app();
    expect(result.current.favorites).toEqual(["beef-burger"]);
  });

  it("drops malformed addresses and out-of-range coordinates", async () => {
    localStorage.setItem(
      storageKeys.addresses,
      JSON.stringify([
        { ...savedAddresses[0], id: "kept" },
        { ...savedAddresses[1], id: "bad-lat", lat: 900 },
        { ...savedAddresses[2], id: "bad-kind", kind: "castle" },
        { ...savedAddresses[0], id: "kept" },
        "address",
      ]),
    );
    const { result } = await app();
    expect(result.current.addresses.map((address) => address.id)).toEqual(["kept"]);
  });

  it("repairs tampered cart quantities and prices", async () => {
    localStorage.setItem(
      storageKeys.cart,
      JSON.stringify([
        { key: "beef-burger|", productId: "beef-burger", qty: 500, price: -10 },
        { key: "pizza|", productId: "pizza-pepperoni", qty: 0, price: 100 },
      ]),
    );
    const { result } = await app();
    expect(result.current.lines[0].qty).toBe(99);
    expect(result.current.lines[0].price).toBe(productsById["beef-burger"].price);
    expect(result.current.lines[1].qty).toBe(1);
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

const brandingNames = [
  "--color-brand",
  "--color-brand-dark",
  "--color-brand-soft",
  "--color-brand-contrast",
  "--color-gold",
  "--color-cream",
  "--color-cream-50",
];

describe("AppProvider — tenant API session and branding", () => {
  beforeEach(() => {
    apiMode.transport = "live";
    api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: null });
    api.refreshSession.mockResolvedValue(tokenPair());
    api.revokeSession.mockResolvedValue(undefined);
    api.attachStoredRefresh.mockResolvedValue(undefined);
  });

  afterEach(() => {
    clearBranding();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function clearBranding() {
    for (const name of brandingNames) document.documentElement.style.removeProperty(name);
  }

  it("keeps a real session instead of the demo flag once the API is wired", async () => {
    const { result } = await app();

    act(() => result.current.login(sessionPayload()));
    expect(result.current.loggedIn).toBe(true);
    expect(result.current.customer).toEqual(identity);

    // The write the provider itself performs: identity only, no token anywhere.
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(storageKeys.session)!) as Record<string, unknown>;
      expect(stored).toEqual(identity);
      expect(Object.keys(stored).sort()).toEqual(["customerId", "email", "fullName", "phoneNumber"]);
    });
    expect(localStorage.getItem(storageKeys.session)).not.toContain("access-token");
    expect(JSON.parse(localStorage.getItem(storageKeys.auth)!)).toBe(false);
  });

  it("restores a stored identity and reads as signed in", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const { result } = await app();
    expect(result.current.customer).toEqual(identity);
    expect(result.current.loggedIn).toBe(true);
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));

    // The boot recovery refresh is the only token mint, and it is cookie-based:
    // called with no arguments, and its result never reaches storage.
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(api.refreshSession).toHaveBeenCalledWith();
    expect(localStorage.getItem(storageKeys.session)).not.toContain("rotated-access");
  });

  it("sends the minted token as a bearer header without cookies", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));
    const calls = stubFetch(() => 200);

    const { result } = await app();
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));

    const authFetch = result.current.authFetch;
    await act(async () => {
      await authFetch("/api/v1/orders");
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.test/api/v1/orders");
    expect(bearer(calls[0]!)).toBe("Bearer rotated-access");
    expect(calls[0]!.init.credentials).toBe("omit");
    // One refresh for the whole life of the page: the request reused the boot grant.
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(storageKeys.session)).not.toContain("rotated-access");
  });

  it("adopts a refresh token an older build left in storage, exactly once", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(legacyRecord()));

    const { result } = await app();
    await waitFor(() => expect(api.attachStoredRefresh).toHaveBeenCalledTimes(1));
    expect(api.attachStoredRefresh).toHaveBeenCalledWith("legacy-refresh");
    expect(result.current.customer).toEqual(identity);

    // The same page load rewrites the record with the clean identity, so the
    // copy in browser storage is gone as soon as the cookie jar has adopted it.
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(storageKeys.session)!)).toEqual(identity),
    );
    expect(localStorage.getItem(storageKeys.session)).not.toContain("legacy-refresh");
  });

  it("waits for the adoption to land before it mints the first token", async () => {
    let release: (value: void) => void = () => {};
    api.attachStoredRefresh.mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    localStorage.setItem(storageKeys.session, JSON.stringify(legacyRecord()));

    const hook = renderAppHook(() => useApp());
    await waitFor(() => expect(api.attachStoredRefresh).toHaveBeenCalledTimes(1));

    // The recovery refresh reads the very cookie jar the adoption is still
    // writing. Minting a token first would spend a request on a jar the browser
    // has not been given yet, and answer a perfectly good session with a 401.
    expect(api.refreshSession).not.toHaveBeenCalled();

    await act(async () => {
      release();
      await Promise.resolve();
    });

    await waitFor(() => expect(api.refreshSession).toHaveBeenCalledTimes(1));
    expect(hook.result.current.loggedIn).toBe(true);
    expect(hook.result.current.sessionStatus).toBe("active");
  });

  it("leaves a legacy token unadopted while no backend is wired", async () => {
    apiMode.transport = "demo";
    localStorage.setItem(storageKeys.session, JSON.stringify(legacyRecord()));

    const { result } = await app();
    expect(result.current.loggedIn).toBe(true);
    expect(api.attachStoredRefresh).not.toHaveBeenCalled();
    expect(api.refreshSession).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(storageKeys.session)!)).toEqual(identity);
  });

  it("keeps the signed-in identity when the legacy adoption is refused", async () => {
    api.attachStoredRefresh.mockRejectedValue(new Error("offline"));
    localStorage.setItem(storageKeys.session, JSON.stringify(legacyRecord()));

    const { result } = await app();
    await waitFor(() => expect(api.attachStoredRefresh).toHaveBeenCalled());
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));
    expect(result.current.loggedIn).toBe(true);
  });

  it("drops a tampered session instead of trusting it", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify({ accessToken: "a" }));

    const { result } = await app();
    expect(result.current.loggedIn).toBe(false);
    expect(result.current.customer).toBeNull();
    expect(api.refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes once for a burst of 401s and retries each request once", async () => {
    const { result } = await app();
    act(() => result.current.login(sessionPayload({ accessToken: "boot-access" })));

    // The tenant only accepts the rotated token, so every request born with the
    // old one answers 401 and has to be retried.
    const calls = stubFetch((call) => (bearer(call) === "Bearer rotated-access" ? 200 : 401));
    const authFetch = result.current.authFetch;
    let statuses: number[] = [];
    await act(async () => {
      statuses = (await Promise.all([
        authFetch("/api/v1/orders"),
        authFetch("/api/v1/orders"),
        authFetch("/api/v1/orders"),
      ])).map((response) => response.status);
    });

    expect(statuses).toEqual([200, 200, 200]);
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(6);
    expect(calls.filter((call) => bearer(call) === "Bearer boot-access")).toHaveLength(3);
    expect(calls.filter((call) => bearer(call) === "Bearer rotated-access")).toHaveLength(3);
    expect(result.current.loggedIn).toBe(true);
    expect(localStorage.getItem(storageKeys.session)).not.toContain("rotated-access");
  });

  it("gives up after one retry instead of looping on a 401", async () => {
    const { result } = await app();
    act(() => result.current.login(sessionPayload({ accessToken: "never-accepted" })));
    const calls = stubFetch(() => 401);

    const authFetch = result.current.authFetch;
    let status = 0;
    await act(async () => {
      status = (await authFetch("/api/v1/orders")).status;
    });

    expect(status).toBe(401);
    expect(calls).toHaveLength(2);
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(result.current.loggedIn).toBe(false);
    expect(result.current.sessionStatus).toBe("signed-out");
    expect(await screen.findByText(expiredSessionMessage)).toBeInTheDocument();
  });

  it("refreshes inside the safety window instead of waiting for a 401", async () => {
    const { result } = await app();

    act(() => result.current.login(dyingPayload()));
    await waitFor(() => expect(api.refreshSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));

    // The rotated token is healthy, so the effect does not re-arm itself.
    await act(async () => {
      await Promise.resolve();
    });
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(storageKeys.session)!)).toEqual(identity);
  });

  it("sends the rotated token, never the one it replaced", async () => {
    // The refresh that answers is already in place before the dying token is
    // handed over, so nothing can be sent with the token rotation replaced.
    api.refreshSession.mockResolvedValue(tokenPair("second-access"));
    const calls = stubFetch(() => 200);

    const { result } = await app();
    act(() => result.current.login(dyingPayload("first-access")));
    await waitFor(() => expect(api.refreshSession).toHaveBeenCalledTimes(1));

    const authFetch = result.current.authFetch;
    await act(async () => {
      await authFetch("/api/v1/orders");
    });

    expect(calls.map(bearer)).toEqual(["Bearer second-access"]);
    expect(calls.map(bearer)).not.toContain("Bearer first-access");
  });

  it("signs the customer out when the refresh is refused", async () => {
    api.refreshSession.mockRejectedValue(refusal(401, "RefreshToken.Revoked"));
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const { result } = await app();
    await waitFor(() => expect(result.current.loggedIn).toBe(false));

    // One refused refresh, not a retry loop: the boot effect and the proactive
    // effect join the same single-flight call, and a backend that has said "the
    // token is dead" is never asked twice.
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(result.current.customer).toBeNull();
    expect(result.current.sessionStatus).toBe("signed-out");
    expect(localStorage.getItem(storageKeys.session)).toBe("null");
    expect(localStorage.getItem(storageKeys.auth)).toBe("false");
    expect(await screen.findByText(expiredSessionMessage)).toBeInTheDocument();
  });

  it("signs the customer out on a reuse alarm the same way", async () => {
    api.refreshSession.mockRejectedValue(refusal(401, "RefreshToken.CompromisedReuse"));
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const { result } = await app();
    await waitFor(() => expect(result.current.sessionStatus).toBe("signed-out"));
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(expiredSessionMessage)).toBeInTheDocument();
  });

  /**
   * The backoff is a real 30-second timer, so these two tests own the clock.
   * Under fake timers `waitFor` cannot help — testing-library only recognises
   * jest's — so the clock is walked explicitly and every assertion is made
   * after the walk, which is also the more honest statement of what is being
   * proved: nothing happened *until* the window expired.
   */
  async function settle() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  async function waitBackoff() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSIENT_REFRESH_RETRY_MS + 1);
    });
  }

  it("treats a refresh the server could not answer as a bad moment, not a sign-out", async () => {
    vi.useFakeTimers();
    api.refreshSession
      .mockRejectedValueOnce(refusal(500, null))
      .mockResolvedValueOnce(tokenPair("recovered-access"));
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const hook = renderAppHook(() => useApp());
    await settle();

    // A 500 is not the backend refusing the credential, so the customer stays
    // signed in — and the retry is a scheduled one rather than a loop.
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(hook.result.current.loggedIn).toBe(true);
    expect(hook.result.current.sessionStatus).toBe("recovering");
    expect(screen.queryByText(expiredSessionMessage)).not.toBeInTheDocument();
    expect(localStorage.getItem(storageKeys.session)).toBe(JSON.stringify(identity));

    await settle();
    expect(api.refreshSession).toHaveBeenCalledTimes(1);

    await waitBackoff();

    expect(api.refreshSession).toHaveBeenCalledTimes(2);
    expect(hook.result.current.sessionStatus).toBe("active");
    expect(hook.result.current.loggedIn).toBe(true);
  });

  it("gives up on a refresh that keeps failing, rather than refreshing forever", async () => {
    vi.useFakeTimers();
    api.refreshSession.mockRejectedValue(refusal(500, null));
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const hook = renderAppHook(() => useApp());
    await settle();
    expect(hook.result.current.loggedIn).toBe(true);

    // The first attempt plus exactly the bounded number of scheduled ones, each
    // one window apart. Every retry in the budget leaves the customer signed
    // in and recovering; a session stuck behind a dead backend with a
    // nominally valid token is the worst of both, so the last one ends it.
    for (let attempt = 1; attempt < MAX_TRANSIENT_REFRESH_RETRIES; attempt += 1) {
      await waitBackoff();
      expect(api.refreshSession).toHaveBeenCalledTimes(attempt + 1);
      expect(hook.result.current.sessionStatus).toBe("recovering");
      expect(hook.result.current.loggedIn).toBe(true);
    }

    await waitBackoff();
    expect(api.refreshSession).toHaveBeenCalledTimes(MAX_TRANSIENT_REFRESH_RETRIES + 1);
    expect(hook.result.current.sessionStatus).toBe("signed-out");
    expect(hook.result.current.customer).toBeNull();
    expect(localStorage.getItem(storageKeys.session)).toBe("null");
    expect(screen.getByText(expiredSessionMessage)).toBeInTheDocument();

    // And it stays over: no further attempt is queued behind the sign-out.
    await waitBackoff();
    expect(api.refreshSession).toHaveBeenCalledTimes(MAX_TRANSIENT_REFRESH_RETRIES + 1);
  });

  it("publishes the backoff it waits, so the window is a decision not a detail", () => {
    expect(TRANSIENT_REFRESH_RETRY_MS).toBe(30_000);
    expect(MAX_TRANSIENT_REFRESH_RETRIES).toBe(3);
  });

  it("leaves a healthy session alone", async () => {
    const { result } = await app();
    act(() => result.current.login(sessionPayload()));
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));

    expect(api.refreshSession).not.toHaveBeenCalled();
    expect(api.attachStoredRefresh).not.toHaveBeenCalled();
  });

  it("caches tenant branding without repainting the app palette", async () => {
    api.fetchBranding.mockResolvedValue({
      notModified: false,
      branding: { tenantId: "t-1", nameAr: "ناوي", primaryColor: "#123456" },
      etag: '"b1"',
    });

    const { result } = await app();
    await waitFor(() => expect(result.current.branding?.nameAr).toBe("ناوي"));

    expect(api.fetchBranding).toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--color-brand")).toBe("");
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(storageKeys.branding)!)).toMatchObject({ etag: '"b1"' }),
    );
  });

  it("paints the tenant palette only when the deploy opts in", async () => {
    vi.stubEnv("NEXT_PUBLIC_APPLY_TENANT_COLORS", "true");
    api.fetchBranding.mockResolvedValue({
      notModified: false,
      branding: { tenantId: "t-1", primaryColor: "#123456" },
      etag: '"b1"',
    });

    await app();
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--color-brand")).toBe("#123456"));
  });

  it("sends the cached etag and keeps the cache on a 304", async () => {
    localStorage.setItem(
      storageKeys.branding,
      JSON.stringify({ etag: '"b1"', branding: { primaryColor: "#654321", nameAr: "ناوي" } }),
    );
    api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: '"b1"' });

    const { result } = await app();
    await waitFor(() => expect(api.fetchBranding).toHaveBeenCalled());

    expect(api.fetchBranding.mock.calls[0]?.[0]).toEqual({ etag: '"b1"' });
    expect(result.current.branding).toMatchObject({ primaryColor: "#654321" });
    expect(document.documentElement.style.getPropertyValue("--color-brand")).toBe("");
  });

  it("keeps working when branding cannot be loaded", async () => {
    api.fetchBranding.mockRejectedValue(new Error("offline"));

    const { result } = await app();
    await waitFor(() => expect(api.fetchBranding).toHaveBeenCalled());

    expect(result.current.ready).toBe(true);
    expect(result.current.branding).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--color-brand")).toBe("");
  });

  it("does not call the API for branding while no base URL is set", async () => {
    apiMode.transport = "demo";

    const { result } = await app();
    expect(api.fetchBranding).not.toHaveBeenCalled();
    expect(result.current.branding).toBeNull();
  });

  it("seeds the account with the customer who just signed in", async () => {
    const { result } = await app();
    expect(result.current.profile.name).toBe(user.name);

    act(() => result.current.login(sessionPayload()));
    await waitFor(() => expect(result.current.profile.name).toBe("Nawy Guest"));
    expect(result.current.profile.phone).toBe("+201012345678");
    expect(result.current.profile.customerId).toBe("customer-1");
  });

  it("keeps the customer's own edits while the same account stays signed in", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));
    localStorage.setItem(
      storageKeys.profile,
      JSON.stringify({ ...user, email: "me@example.com", customerId: "customer-1", name: "اسمي الجديد" }),
    );

    const { result } = await app();
    expect(result.current.profile.name).toBe("اسمي الجديد");
    expect(result.current.profile.email).toBe("me@example.com");
  });

  it("replaces the account when a different customer signs in on this device", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));
    localStorage.setItem(
      storageKeys.profile,
      JSON.stringify({ ...user, name: "زبون تاني", customerId: "customer-9" }),
    );

    const { result } = await app();
    await waitFor(() => expect(result.current.profile.name).toBe("Nawy Guest"));
    expect(result.current.profile.customerId).toBe("customer-1");
  });

  it("does not blank a saved email when the session carries none", async () => {
    localStorage.setItem(storageKeys.profile, JSON.stringify({ ...user, email: "keep@example.com" }));

    const { result } = await app();
    act(() => result.current.login(sessionPayload()));
    await waitFor(() => expect(result.current.profile.name).toBe("Nawy Guest"));
    expect(result.current.profile.email).toBe("keep@example.com");
  });

  it("does not blank the account when the session carries no identity text", async () => {
    localStorage.setItem(
      storageKeys.session,
      JSON.stringify({ ...identity, fullName: "", phoneNumber: "", email: null }),
    );
    localStorage.setItem(storageKeys.profile, JSON.stringify({ ...user, email: "keep@example.com" }));

    const { result } = await app();
    await waitFor(() => expect(result.current.profile.customerId).toBe("customer-1"));
    expect(result.current.profile.name).toBe(user.name);
    expect(result.current.profile.phone).toBe(user.phone);
    expect(result.current.profile.email).toBe("keep@example.com");
  });

  it("returns the account to the seeded identity on sign out", async () => {
    const { result } = await app();

    act(() => result.current.login(sessionPayload()));
    await waitFor(() => expect(result.current.profile.name).toBe("Nawy Guest"));

    act(() => result.current.logout());
    expect(result.current.profile.name).toBe(user.name);
    expect(result.current.profile.customerId).toBeUndefined();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(storageKeys.profile)!)).toMatchObject({ name: user.name }));
  });

  it("leaves the demo profile alone for a flag-only login", async () => {
    apiMode.transport = "demo";

    const { result } = await app();
    act(() => result.current.login());
    expect(result.current.loggedIn).toBe(true);
    expect(result.current.profile.name).toBe(user.name);
    expect(result.current.profile.customerId).toBeUndefined();
  });
});

describe("AppProvider — signing out", () => {
  beforeEach(() => {
    apiMode.transport = "live";
    api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: null });
    api.refreshSession.mockResolvedValue(tokenPair());
    api.revokeSession.mockResolvedValue(undefined);
    api.attachStoredRefresh.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revokes the cookie session when the customer signs out", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const { result } = await app();
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));
    act(() => result.current.logout());

    expect(result.current.loggedIn).toBe(false);
    expect(result.current.customer).toBeNull();
    // The BFF owns the cookie, so revoking needs no token argument at all.
    expect(api.revokeSession).toHaveBeenCalledTimes(1);
    expect(api.revokeSession).toHaveBeenCalledWith();
    await waitFor(() => expect(localStorage.getItem(storageKeys.session)).toBe("null"));
  });

  it("fires one revoke for a double-tapped logout and clears state when the network is down", async () => {
    api.revokeSession.mockRejectedValue(new Error("offline"));
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const { result } = await app();
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));
    act(() => {
      result.current.logout();
      result.current.logout();
    });

    expect(api.revokeSession).toHaveBeenCalledTimes(1);
    expect(result.current.loggedIn).toBe(false);
    expect(result.current.customer).toBeNull();
    expect(result.current.sessionStatus).toBe("signed-out");
    expect(localStorage.getItem(storageKeys.session)).toBe("null");
  });

  it("re-arms the logout guard for the next sign-in", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const { result } = await app();
    await waitFor(() => expect(result.current.sessionStatus).toBe("active"));
    act(() => result.current.logout());
    act(() => result.current.login(sessionPayload()));
    act(() => {
      result.current.logout();
      result.current.logout();
    });

    expect(api.revokeSession).toHaveBeenCalledTimes(2);
    expect(result.current.loggedIn).toBe(false);
  });

  it("revokes on the mock transport and never on the demo one", async () => {
    apiMode.transport = "mock";
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const live = await app();
    await waitFor(() => expect(live.result.current.loggedIn).toBe(true));
    act(() => live.result.current.logout());
    expect(api.revokeSession).toHaveBeenCalledTimes(1);
    live.unmount();

    apiMode.transport = "demo";
    localStorage.setItem(storageKeys.auth, "true");
    const demo = await app();
    act(() => demo.result.current.logout());

    expect(api.revokeSession).toHaveBeenCalledTimes(1);
    expect(demo.result.current.loggedIn).toBe(false);
  });
});

describe("AppProvider — session status and the customer view", () => {
  beforeEach(() => {
    apiMode.transport = "live";
    api.fetchBranding.mockResolvedValue({ notModified: true, branding: null, etag: null });
    api.refreshSession.mockResolvedValue(tokenPair());
    api.revokeSession.mockResolvedValue(undefined);
    api.attachStoredRefresh.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("walks signed-out, refreshing, active and back to signed-out", async () => {
    let settleRefresh!: (pair: TokenPair) => void;
    api.refreshSession.mockImplementation(
      () =>
        new Promise<TokenPair>((resolve) => {
          settleRefresh = resolve;
        }),
    );
    stubFetch((call) => (bearer(call) === "Bearer rotated-access" ? 200 : 401));

    const { result } = await app();
    expect(result.current.sessionStatus).toBe("signed-out");

    act(() => result.current.login(sessionPayload({ accessToken: "boot-access" })));
    expect(result.current.sessionStatus).toBe("active");

    // A refused request asks for a refresh; until the cookie store answers, the
    // grant is neither live nor gone, and the guard needs to know which.
    const authFetch = result.current.authFetch;
    const request = authFetch("/api/v1/orders");
    await waitFor(() => expect(result.current.sessionStatus).toBe("refreshing"));

    await act(async () => {
      settleRefresh(tokenPair());
      await request;
    });
    expect(result.current.sessionStatus).toBe("active");

    act(() => result.current.logout());
    expect(result.current.sessionStatus).toBe("signed-out");
  });

  it("exposes the session read side through useCustomerSession", async () => {
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const hook = renderAppHook(() => useCustomerSession());
    await waitFor(() => expect(hook.result.current.loggedIn).toBe(true));
    await waitFor(() => expect(hook.result.current.status).toBe("active"));

    expect(hook.result.current.customer).toEqual(identity);
    expect(typeof hook.result.current.authFetch).toBe("function");
    expect(typeof hook.result.current.logout).toBe("function");

    act(() => hook.result.current.logout());
    expect(hook.result.current.customer).toBeNull();
    expect(hook.result.current.loggedIn).toBe(false);
    expect(hook.result.current.status).toBe("signed-out");
  });

  it("reports the demo flag as logged in with no session behind it", async () => {
    apiMode.transport = "demo";
    localStorage.setItem(storageKeys.auth, "true");

    const hook = renderAppHook(() => useCustomerSession());
    await waitFor(() => expect(hook.result.current.loggedIn).toBe(true));

    expect(hook.result.current.customer).toBeNull();
    expect(hook.result.current.status).toBe("signed-out");
    expect(api.refreshSession).not.toHaveBeenCalled();
  });

  it("does not re-mint a grant the fetch wrapper already recovered", async () => {
    // Loaded while the backend was unreachable, so boot recovery stood down;
    // the first authenticated call is what mints the token, and afterwards the
    // recovery effect must find the grant there and stay out of the way.
    apiMode.transport = "demo";
    localStorage.setItem(storageKeys.session, JSON.stringify(identity));

    const { result } = await app();
    expect(api.refreshSession).not.toHaveBeenCalled();

    apiMode.transport = "live";
    const calls = stubFetch(() => 200);
    const authFetch = result.current.authFetch;
    await act(async () => {
      await authFetch("/api/v1/orders");
    });
    expect(api.refreshSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      await authFetch("/api/v1/orders");
    });
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(calls.map(bearer)).toEqual(["Bearer rotated-access", "Bearer rotated-access"]);
  });

  it("refuses the app context outside the provider and offers it optionally", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useApp())).toThrow("useApp must be used within AppProvider");
    errors.mockRestore();

    expect(renderHook(() => useOptionalApp()).result.current).toBeNull();

    const inside = renderAppHook(() => useOptionalApp());
    await waitFor(() => expect(inside.result.current?.ready).toBe(true));
    expect(inside.result.current?.loggedIn).toBe(false);
  });
});

describe("AppProvider — the account picture", () => {
  it("starts a new account with no picture", async () => {
    const { result } = await app();

    expect(result.current.profile.avatar).toBe("");
  });

  it("drops the demo picture an account saved before uploading became the only way in", async () => {
    localStorage.setItem(storageKeys.profile, JSON.stringify({ ...user, avatar: "/images/avatar.webp" }));

    const { result } = await app();

    expect(result.current.profile.name).toBe(user.name);
    expect(result.current.profile.avatar).toBe("");
  });

  it("keeps a picture the customer uploaded", async () => {
    const uploaded = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/";
    localStorage.setItem(storageKeys.profile, JSON.stringify({ ...user, avatar: uploaded }));

    const { result } = await app();

    expect(result.current.profile.avatar).toBe(uploaded);
  });

  it("refuses a picture from a host the image loader is not configured for", async () => {
    localStorage.setItem(storageKeys.profile, JSON.stringify({ ...user, avatar: "https://cdn.example.com/a.png" }));

    const { result } = await app();

    expect(result.current.profile.name).toBe(user.name);
    expect(result.current.profile.avatar).toBe("");
  });

  it("drops a picture large enough to make every later write fail", async () => {
    localStorage.setItem(
      storageKeys.profile,
      JSON.stringify({ ...user, avatar: `data:image/jpeg;base64,${"A".repeat(400_000)}` }),
    );

    const { result } = await app();

    expect(result.current.profile.name).toBe(user.name);
    expect(result.current.profile.avatar).toBe("");
  });
});
