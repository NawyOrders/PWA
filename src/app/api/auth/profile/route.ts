/**
 * `POST /api/auth/profile` — complete the profile the OTP login proved.
 *
 * The page posts the access token it already holds plus the name fields; this
 * forwards them to the tenant API with the token as a bearer credential, keeps
 * the rotated refresh token out of the answer, and puts it in the httpOnly
 * cookie. All the rules live in `src/lib/auth-bff.ts`.
 */

import { bffCompleteProfile, bffRequest, bffResponse } from "@/lib/auth-bff";

/* No `dynamic` export and no caching: `cacheComponents` rejects the route
 * segment config, and reading the body already makes this handler per-request. */

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const token =
    body && typeof body === "object" && "accessToken" in body && typeof body.accessToken === "string"
      ? body.accessToken
      : null;
  return bffResponse(await bffCompleteProfile({ ...bffRequest(request), token, body }));
}
