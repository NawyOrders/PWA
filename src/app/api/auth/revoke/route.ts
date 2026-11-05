/**
 * `POST /api/auth/revoke` — logout.
 *
 * The cookie is cleared whatever the tenant API answers, which is the guide's
 * rule: the local session is always dropped, even when the call fails. The
 * client additionally treats `409 RefreshToken.AlreadyRevoked` as success, so a
 * double tap cannot look like an error.
 */

import { REFRESH_COOKIE_NAME, readCookie } from "@/lib/auth-cookie";
import { bffResponse, bffRevoke } from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const token = readCookie(request.headers.get("cookie"), REFRESH_COOKIE_NAME);
  return bffResponse(await bffRevoke({ token, origin: request.url }));
}
