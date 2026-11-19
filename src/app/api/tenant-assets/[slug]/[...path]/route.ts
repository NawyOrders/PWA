/**
 * `GET /api/tenant-assets/<slug>/<path>` — menu artwork stored beside a tenant's
 * `menu.json`.
 *
 * A relative `image` in the menu ("images/antara.jpg") is normalised to this
 * route by `normalizeMenuImage`, so changing a picture is a data edit, not a
 * deploy. Only raster image extensions are served, and both the requested path
 * and its real path must stay inside `tenants/<slug>/`, so `..`, encoded
 * traversal and symlinks cannot read anything else on disk.
 */

import { realpath, readFile } from "node:fs/promises";
import path from "node:path";
import { isValidTenantSlug } from "@/lib/tenant";
import { tenantDataDir } from "@/lib/static-tenant-data";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}

function isInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; path: string[] }> },
): Promise<Response> {
  const { slug, path: segments } = await params;
  if (!isValidTenantSlug(slug) || segments.length === 0) return notFound();

  const extension = path.extname(segments[segments.length - 1] ?? "").toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return notFound();

  const tenantDir = path.join(tenantDataDir(), slug);
  if (!isInside(tenantDir, path.resolve(tenantDir, ...segments))) return notFound();

  let root: string;
  let file: string;
  try {
    // realpath resolves symlinks too, so a link may not point outside the folder.
    [root, file] = await Promise.all([realpath(tenantDir), realpath(path.resolve(tenantDir, ...segments))]);
  } catch {
    return notFound();
  }
  if (!isInside(root, file)) return notFound();

  let data: Buffer;
  try {
    data = await readFile(file);
  } catch {
    return notFound();
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.byteLength),
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
