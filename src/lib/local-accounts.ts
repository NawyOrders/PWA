/**
 * The account data behind the two local transports.
 *
 * Demo mode and `AUTH_MOCK` have no server to ask "what has this customer
 * saved?", so favorites and orders used to live in one device-wide slot: every
 * person who signed in on the device saw the same seeded history, logout left
 * it on screen for the next person, and points were not state at all — the
 * account screen read a constant out of the seed data.
 *
 * This table is the durable row a real backend would keep: one slot per phone
 * number holding that customer's own favorites, orders and points. It survives
 * logout and reload, and it is only ever read back *after* that phone completes
 * a fresh OTP challenge, so one customer's history never appears for somebody
 * who did not just prove they hold the number.
 *
 * Nothing here is a credential: no code, no token, no session — only the data
 * the customer themselves created. Corrupt or blocked storage degrades to "no
 * saved account", which is the same answer a first-time registration gives.
 */

import { normalizeEgyptianPhone } from "@/lib/api";
import type { Order } from "@/lib/data";
import { readStorage, storageKeys, writeStorage } from "@/lib/storage";

/** What the provider writes: state it already holds, validated, in memory. */
export type LocalAccount = {
  points: number;
  favorites: string[];
  orders: Order[];
};

/**
 * What a slot reads back as. `points` is checked here because it is a plain
 * number; the two lists stay untrusted so the domain decoders in the provider —
 * the same ones that guard the visible state — validate every product id, order
 * field and line item before any of it reaches a screen.
 */
export type StoredLocalAccount = {
  points: number;
  favorites: unknown[];
  orders: unknown[];
};

/**
 * One number, one slot, however it was typed: `01012345678`, `0020 10 1234 5678`
 * and `+201012345678` are the same customer, so the key is the normalised
 * number's digits — the same normalisation the login screen sends to the API,
 * and the same key the customer table in local-customers.ts uses.
 */
function digitsOf(phone: string): string {
  return normalizeEgyptianPhone(phone).replace(/\D/g, "");
}

/** Storage is untrusted input: anything that is not a slot is dropped, not thrown. */
function readTable(): Record<string, StoredLocalAccount> {
  const raw = readStorage<unknown>(storageKeys.localAccounts, null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const table: Record<string, StoredLocalAccount> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(key) || !value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (!Array.isArray(row.favorites) || !Array.isArray(row.orders)) continue;
    // A tampered balance is repaired to nothing rather than believed: points are
    // a reward, so a negative, fractional or non-numeric value is never a gain.
    const points =
      typeof row.points === "number" && Number.isSafeInteger(row.points) && row.points >= 0
        ? row.points
        : 0;
    table[key] = { points, favorites: row.favorites, orders: row.orders };
  }
  return table;
}

/** The saved account for a phone, or null when this phone has never saved one. */
export function localAccount(phone: string): StoredLocalAccount | null {
  const digits = digitsOf(phone);
  if (!digits) return null;
  return readTable()[digits] ?? null;
}

/**
 * Writes the slot for a phone, replacing whatever that phone had before. Every
 * other customer's slot is carried over untouched, which is what keeps a shared
 * device from turning one person's save into everybody's history.
 */
export function rememberLocalAccount(phone: string, account: LocalAccount): void {
  const digits = digitsOf(phone);
  if (!digits) return;
  const table = readTable();
  table[digits] = {
    points: Number.isSafeInteger(account.points) && account.points >= 0 ? account.points : 0,
    favorites: account.favorites,
    orders: account.orders,
  };
  writeStorage(storageKeys.localAccounts, table);
}

/** Lets the simulator's reset put the device back to a first-run state. */
export function clearLocalAccounts(): void {
  try {
    window.localStorage.removeItem(storageKeys.localAccounts);
  } catch {
    // Blocked storage is already behaving as if the table were empty.
  }
}