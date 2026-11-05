"use client";

import { useApp } from "@/components/providers";
import type { AuthFetch, CustomerSession } from "@/lib/session";

export type CustomerSessionView = {
  /** Who is signed in, or `null` when nobody is. */
  customer: CustomerSession | null;
  /**
   * `"signed-out" | "active" | "refreshing"`.
   *
   * The demo path reports `"active"` from `loggedIn` rather than `status`: it
   * has an intent to be signed in but no issued token behind it, and pretending
   * otherwise would send screens looking for a grant that will never arrive.
   */
  status: "signed-out" | "active" | "refreshing";
  loggedIn: boolean;
  logout: () => void;
  /** Fetch that carries the bearer token and refreshes once on a 401. */
  authFetch: AuthFetch;
};

/**
 * The session read side of the app context.
 *
 * Screens that only need to know who is signed in — and how to sign out — use
 * this instead of pulling the whole cart context, which keeps their re-render
 * surface to the three values they actually read.
 */
export function useCustomerSession(): CustomerSessionView {
  const { customer, sessionStatus, loggedIn, logout, authFetch } = useApp();
  return { customer, status: sessionStatus, loggedIn, logout, authFetch };
}
