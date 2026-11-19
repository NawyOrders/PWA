/**
 * `POST /api/auth/otp/verify` — the BFF hop for step 2 of the login flow.
 *
 * The browser posts the challenge and the code here; this forwards them to the
 * tenant API, keeps the refresh token out of the answer, and puts it in an
 * httpOnly cookie. All the rules live in `src/lib/auth-bff.ts`, which is the
 * part under test.
 */

import { bffRequest, bffResponse, bffVerify } from "@/lib/auth-bff";

/* No `dynamic` export and no caching: `cacheComponents` rejects the route
 * segment config, and reading the body already makes this handler per-request. */

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  return bffResponse(await bffVerify({ ...bffRequest(request), body }));
}
