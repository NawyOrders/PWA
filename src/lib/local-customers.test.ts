import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearLocalCustomers, localCustomer, rememberLocalCustomer } from "@/lib/local-customers";
import { storageKeys } from "@/lib/storage";

/**
 * The local customer table is the only durable identity the two offline
 * transports keep, so its contract is small and strict: phone digits in, the
 * registered name and a stable id out, and nothing else ever stored.
 */

const PHONE = "+201012345678";

beforeEach(() => {
  localStorage.clear();
});

describe("rememberLocalCustomer / localCustomer", () => {
  it("round-trips a registered name under the phone's digits, whatever the formatting", () => {
    const row = rememberLocalCustomer(PHONE, "Mona Hassan");
    expect(row).toEqual({ id: "local-201012345678", fullName: "Mona Hassan" });
    expect(localCustomer("0020 10 1234 5678")).toEqual(row);
    expect(localCustomer("01012345678")).toEqual(row);
    expect(JSON.parse(String(localStorage.getItem(storageKeys.localCustomers)))).toEqual({
      "201012345678": row,
    });
  });

  it("keeps one stable id when the same phone registers again under a new name", () => {
    const first = rememberLocalCustomer(PHONE, "Mona Hassan");
    const second = rememberLocalCustomer(PHONE, "Mona H. Ali");
    expect(second?.id).toBe(first?.id);
    expect(second?.fullName).toBe("Mona H. Ali");
    expect(localCustomer(PHONE)?.fullName).toBe("Mona H. Ali");
  });

  it("accepts an explicit id so the simulator can persist the id it already minted", () => {
    rememberLocalCustomer(PHONE, "Mona Hassan", "cus-mock-0005");
    expect(localCustomer(PHONE)).toEqual({ id: "cus-mock-0005", fullName: "Mona Hassan" });
    // A later rename without an explicit id keeps the simulator's id, not a new one.
    expect(rememberLocalCustomer(PHONE, "Mona Ali")?.id).toBe("cus-mock-0005");
  });

  it("trims the name and caps it at the same 200 characters the API applies", () => {
    const long = `  ${"م".repeat(250)}  `;
    const row = rememberLocalCustomer(PHONE, long);
    expect(row?.fullName).toBe("م".repeat(200));
    expect(localCustomer(PHONE)?.fullName).toHaveLength(200);
  });

  it("stores nothing for a blank name or a phone with no digits", () => {
    expect(rememberLocalCustomer(PHONE, "   ")).toBeNull();
    expect(rememberLocalCustomer("+++", "Mona Hassan")).toBeNull();
    expect(localStorage.getItem(storageKeys.localCustomers)).toBeNull();
    expect(localCustomer("+++")).toBeNull();
  });

  it("answers null for a phone that never registered", () => {
    rememberLocalCustomer(PHONE, "Mona Hassan");
    expect(localCustomer("+201198765432")).toBeNull();
  });

  it("reads corrupt storage as an empty table instead of throwing", () => {
    for (const raw of ["not json", "[]", '"a string"', "42", "null"]) {
      localStorage.setItem(storageKeys.localCustomers, raw);
      expect(localCustomer(PHONE)).toBeNull();
    }
    localStorage.setItem(
      storageKeys.localCustomers,
      JSON.stringify({
        "201012345678": { id: "ok", fullName: "Mona Hassan" },
        "201012345679": { id: 7, fullName: "Wrong id type" },
        "201012345680": { id: "ok", fullName: "   " },
        "201012345681": "not a row",
        "not-digits": { id: "ok", fullName: "Wrong key" },
      }),
    );
    expect(localCustomer(PHONE)?.fullName).toBe("Mona Hassan");
    expect(localCustomer("+201012345679")).toBeNull();
    expect(localCustomer("+201012345680")).toBeNull();
    expect(localCustomer("+201012345681")).toBeNull();
  });

  it("still answers in memory when storage writes are blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const row = rememberLocalCustomer(PHONE, "Mona Hassan");
    expect(row?.fullName).toBe("Mona Hassan");
    expect(localCustomer(PHONE)).toBeNull();
    spy.mockRestore();
  });

  it("clearLocalCustomers puts the device back to a first-run state", () => {
    rememberLocalCustomer(PHONE, "Mona Hassan");
    clearLocalCustomers();
    expect(localStorage.getItem(storageKeys.localCustomers)).toBeNull();
    expect(localCustomer(PHONE)).toBeNull();
  });

  it("clearLocalCustomers stays quiet when storage refuses to remove", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => clearLocalCustomers()).not.toThrow();
    spy.mockRestore();
  });
});