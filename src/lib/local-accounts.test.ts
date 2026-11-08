import { beforeEach, describe, expect, it, vi } from "vitest";
import { orders as seedOrders } from "@/lib/data";
import {
  clearLocalAccounts,
  localAccount,
  rememberLocalAccount,
  type LocalAccount,
} from "@/lib/local-accounts";
import { storageKeys } from "@/lib/storage";

/**
 * The local account table is the only durable history the two offline
 * transports keep, so its contract is small and strict: one slot per phone,
 * holding that customer's own favorites, orders and points — and nothing that
 * belongs to anybody else ever comes back out of it.
 */

const PHONE = "+201012345678";
const OTHER = "+201198765432";

function account(overrides: Partial<LocalAccount> = {}): LocalAccount {
  return {
    points: 120,
    favorites: ["beef-burger"],
    orders: [seedOrders[0]],
    ...overrides,
  };
}

function storedTable(): Record<string, unknown> {
  return JSON.parse(String(localStorage.getItem(storageKeys.localAccounts))) as Record<string, unknown>;
}

beforeEach(() => {
  localStorage.clear();
});

describe("rememberLocalAccount / localAccount", () => {
  it("round-trips a saved account under the phone's digits, whatever the formatting", () => {
    const saved = account();
    rememberLocalAccount(PHONE, saved);

    expect(localAccount("0020 10 1234 5678")).toEqual(saved);
    expect(localAccount("01012345678")).toEqual(saved);
    expect(localAccount(PHONE)).toEqual(saved);
    expect(storedTable()).toEqual({ "201012345678": saved });
  });

  it("keeps every other customer's slot when one of them saves", () => {
    rememberLocalAccount(PHONE, account());
    rememberLocalAccount(OTHER, account({ points: 0, favorites: [], orders: [] }));

    expect(localAccount(PHONE)).toEqual(account());
    expect(localAccount(OTHER)).toEqual(account({ points: 0, favorites: [], orders: [] }));
    expect(Object.keys(storedTable()).sort()).toEqual(["201012345678", "201198765432"]);
  });

  it("replaces the slot for a phone instead of merging two visits into one", () => {
    rememberLocalAccount(PHONE, account());
    const next = account({ points: 5, favorites: ["fries"], orders: [] });
    rememberLocalAccount("01012345678", next);

    expect(localAccount(PHONE)).toEqual(next);
    expect(Object.keys(storedTable())).toEqual(["201012345678"]);
  });

  it("answers null for a phone that never saved, and stores nothing without digits", () => {
    rememberLocalAccount(PHONE, account());
    expect(localAccount(OTHER)).toBeNull();
    expect(localAccount("+++")).toBeNull();

    rememberLocalAccount("+++", account());
    expect(Object.keys(storedTable())).toEqual(["201012345678"]);
  });

  it("hands the list contents back untrusted, for the domain decoders to validate", () => {
    // The store checks the containers; product ids, order fields and line items
    // are the provider's decoders' job, exactly as they are for visible state.
    localStorage.setItem(
      storageKeys.localAccounts,
      JSON.stringify({
        "201012345678": { points: 3, favorites: ["beef-burger", 7], orders: [null, "order"] },
      }),
    );
    expect(localAccount(PHONE)).toEqual({ points: 3, favorites: ["beef-burger", 7], orders: [null, "order"] });
  });
});

describe("untrusted storage", () => {
  it("reads a corrupt table as empty instead of throwing", () => {
    for (const raw of ["not json", "[]", '"a string"', "42", "null"]) {
      localStorage.setItem(storageKeys.localAccounts, raw);
      expect(localAccount(PHONE)).toBeNull();
    }
  });

  it("drops rows that are not slots and keeps the one that is", () => {
    localStorage.setItem(
      storageKeys.localAccounts,
      JSON.stringify({
        "201012345678": { points: 12, favorites: [], orders: [] },
        "201012345679": { points: 12, favorites: "not a list", orders: [] },
        "201012345680": { points: 12, favorites: [], orders: null },
        "201012345681": "not a row",
        "201012345682": null,
        "not-digits": { points: 12, favorites: [], orders: [] },
      }),
    );

    expect(localAccount(PHONE)).toEqual({ points: 12, favorites: [], orders: [] });
    expect(localAccount("+201012345679")).toBeNull();
    expect(localAccount("+201012345680")).toBeNull();
    expect(localAccount("+201012345681")).toBeNull();
    expect(localAccount("+201012345682")).toBeNull();
  });

  it("repairs a tampered balance to nothing rather than believing it", () => {
    for (const points of [-1, 1.5, "120", null, true]) {
      localStorage.setItem(
        storageKeys.localAccounts,
        JSON.stringify({ "201012345678": { points, favorites: [], orders: [] } }),
      );
      expect(localAccount(PHONE)?.points).toBe(0);
    }
  });

  it("never writes a balance that is not a whole, non-negative, safe integer", () => {
    for (const points of [-5, 2.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      rememberLocalAccount(PHONE, account({ points }));
      expect(localAccount(PHONE)?.points).toBe(0);
    }
    rememberLocalAccount(PHONE, account({ points: Number.MAX_SAFE_INTEGER }));
    expect(localAccount(PHONE)?.points).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("stays quiet when storage writes are blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => rememberLocalAccount(PHONE, account())).not.toThrow();
    expect(localAccount(PHONE)).toBeNull();
    spy.mockRestore();
  });

  it("reads an empty table when storage refuses to answer at all", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(localAccount(PHONE)).toBeNull();
    spy.mockRestore();
  });
});

describe("clearLocalAccounts", () => {
  it("puts the device back to a first-run state", () => {
    rememberLocalAccount(PHONE, account());
    rememberLocalAccount(OTHER, account());
    clearLocalAccounts();
    expect(localStorage.getItem(storageKeys.localAccounts)).toBeNull();
    expect(localAccount(PHONE)).toBeNull();
    expect(localAccount(OTHER)).toBeNull();
  });

  it("stays quiet when storage refuses to remove", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearLocalAccounts()).not.toThrow();
    spy.mockRestore();
  });
});