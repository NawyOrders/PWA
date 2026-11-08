/**
 * `POST /api/auth/otp/request` — the BFF hop for step 1 of the login flow.
 *
 * The browser posts the phone number here; this forwards it to the tenant API
 * from the app server, where the tenant's deployment-specific CORS allow-list
 * does not apply. The answer is relayed unchanged so the client's error catalog
 * and `Retry-After` countdown still work. All the rules live in
 * `src/lib/auth-bff.ts`, which is the part under test.
 */

import { bffRequest, bffRequestOtp, bffResponse } from "@/lib/auth-bff";

/* No `dynamic` export and no caching: `cacheComponents` rejects the route
 * segment config, and reading the body already makes this handler per-request. */

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  return bffResponse(await bffRequestOtp({ ...bffRequest(request), body }));
}
