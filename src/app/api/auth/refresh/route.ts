/**
 * `POST /api/auth/refresh` — rotation, done where the token actually lives.
 *
 * The client sends no body: the credential is the cookie, and the answer it
 * gets back is the new access token only. Keeping the call empty is what makes
 * it impossible for a page to refresh with a token it cached somewhere.
 */

import { REFRESH_COOKIE_NAME, readCookie } from "@/lib/auth-cookie";
import { bffRefresh, bffResponse } from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const token = readCookie(request.headers.get("cookie"), REFRESH_COOKIE_NAME);
  return bffResponse(await bffRefresh({ token, origin: request.url }));
}
