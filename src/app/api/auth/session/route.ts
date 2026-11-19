/**
 * `POST /api/auth/session` — adopts a refresh token that an older build left in
 * `localStorage`.
 *
 * Before the cookie existed, the session object carried both tokens. On the
 * first load after this change the client hands the stored token here exactly
 * once, the token goes into the httpOnly jar, and the storage copy is rewritten
 * as identity only — so nobody is signed out by the upgrade, and the token
 * leaves browser storage in the same breath.
 */

import { bffAttach, bffRequest, bffResponse } from "@/lib/auth-bff";

/* No `dynamic` export: `cacheComponents` rejects the route segment config, and
 * reading the body already makes this handler per-request. */

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  return bffResponse(await bffAttach({ ...bffRequest(request), body }));
}
