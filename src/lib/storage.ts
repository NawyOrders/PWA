/**
 * Single entry point for browser persistence.
 *
 * Keys live here so a typo cannot silently create a second store, and every
 * read is defensive: corrupt or blocked storage falls back to seed data.
 */

export const storageKeys = {
  cart: "nawy-cart-v1",
  favorites: "nawy-favorites-v1",
  auth: "nawy-auth-v1",
  lang: "nawy-lang-v1",
  addresses: "nawy-addresses-v1",
  selectedAddress: "nawy-selected-address-v1",
  coupon: "nawy-coupon-v1",
  orderNote: "nawy-order-note-v1",
  profile: "nawy-profile-v1",
  notifications: "nawy-notifications-v1",
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or disabled (private mode); state still works in memory.
  }
}
