/**
 * The customer table behind the two local transports.
 *
 * Demo mode and `AUTH_MOCK` have no server to ask "who is this phone?", so the
 * name a customer types at registration would otherwise live only in the
 * visible profile — which logout deliberately resets to the neutral seeded
 * identity on a shared device. The next login then showed the seed name (demo)
 * or demanded registration again (mock after a reload), losing the name the
 * customer just gave.
 *
 * This table is the durable row a real backend would keep: phone digits in,
 * the registered name and a stable id out. It survives logout and reload, and
 * it is only ever read back *after* that phone completes a fresh OTP challenge,
 * so a name never appears on screen for somebody who did not just prove they
 * hold the number.
 *
 * Nothing here is a credential: no code, no token, no session — only the
 * identity the customer themselves typed, capped exactly like the API caps
 * `fullName`. Corrupt or blocked storage degrades to "no remembered customer",
 * which is the same answer a first-time registration gives.
 */

import { normalizeEgyptianPhone } from "@/lib/api";
import { readStorage, storageKeys, writeStorage } from "@/lib/storage";

export type LocalCustomer = {
  /** Stable across reloads so the account screens keep one identity per phone. */
  id: string;
  fullName: string;
};

/** The same ceiling `customerName()` in src/lib/api.ts applies to the API's name. */
const NAME_LIMIT = 200;

/**
 * One number, one row, however it was typed: `01012345678`, `0020 10 1234 5678`
 * and `+201012345678` are the same customer, so the key is the normalised
 * number's digits — the same normalisation the login screen sends to the API.
 */
function digitsOf(phone: string): string {
  return normalizeEgyptianPhone(phone).replace(/\D/g, "");
}

/** Storage is untrusted input: anything that is not a row is dropped, not thrown. */
function readTable(): Record<string, LocalCustomer> {
  const raw = readStorage<unknown>(storageKeys.localCustomers, null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const table: Record<string, LocalCustomer> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(key) || !value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id || typeof row.fullName !== "string" || !row.fullName.trim()) continue;
    table[key] = { id: row.id, fullName: row.fullName };
  }
  return table;
}

/** The remembered customer for a phone, or null when this phone never registered. */
export function localCustomer(phone: string): LocalCustomer | null {
  const digits = digitsOf(phone);
  if (!digits) return null;
  return readTable()[digits] ?? null;
}

/**
 * Writes the row for a phone. A re-registration renames the customer but keeps
 * the id, so screens and stored profiles stay attached to the same identity.
 * An explicit id lets the mock simulator persist the id it already minted.
 * Returns the stored row, or null when there was nothing storable.
 */
export function rememberLocalCustomer(phone: string, fullName: string, id?: string): LocalCustomer | null {
  const digits = digitsOf(phone);
  const name = fullName.trim().slice(0, NAME_LIMIT);
  if (!digits || !name) return null;
  const table = readTable();
  const row: LocalCustomer = { id: id ?? table[digits]?.id ?? `local-${digits}`, fullName: name };
  table[digits] = row;
  writeStorage(storageKeys.localCustomers, table);
  return row;
}

/** Lets the simulator's reset put the device back to a first-run state. */
export function clearLocalCustomers(): void {
  try {
    window.localStorage.removeItem(storageKeys.localCustomers);
  } catch {
    // Blocked storage is already behaving as if the table were empty.
  }
}