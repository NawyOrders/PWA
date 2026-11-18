/**
 * Static tenant data, read from disk on the server.
 *
 * Each tenant owns one folder under `tenants/`, named by its slug:
 *
 *   tenants/pablo/branding.json
 *
 * The slug comes from the request host (`pablo.nawyorders.com` → `pablo`), so
 * the folder that matches the host is the store that gets rendered. A slug with
 * no folder, or a folder with no branding file, is an unknown tenant and gets
 * the same 404 the tenant API used to send.
 *
 * The file may hold the API envelope (`{ isSuccess, data, … }`) or the bare
 * branding object, the same two shapes `unwrapBranding` accepts from the API.
 *
 * Node only: this uses `fs`. Middleware imports it, which is why its config
 * opts into the Node runtime.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isValidTenantSlug } from "@/lib/tenant";
import { unwrapBranding, type TenantBrandingResult } from "@/lib/tenant-branding";

/** Overrides the data folder, e.g. for tests or a mounted volume. */
export const TENANT_DATA_DIR_ENV = "TENANT_DATA_DIR";

/** Relative to the working directory when `TENANT_DATA_DIR` is not set. */
export const TENANT_DATA_DIR_DEFAULT = "tenants";

export const TENANT_BRANDING_FILE = "branding.json";

export function tenantDataDir(): string {
  const configured = (process.env[TENANT_DATA_DIR_ENV] ?? "").trim();
  return path.resolve(configured || path.join(process.cwd(), TENANT_DATA_DIR_DEFAULT));
}

/**
 * The branding file for a slug, or `null` when the slug cannot be a folder name.
 * Validation comes first, so a slug can never walk out of the data folder.
 */
export function tenantBrandingPath(slug: string): string | null {
  if (!isValidTenantSlug(slug)) return null;
  return path.join(tenantDataDir(), slug, TENANT_BRANDING_FILE);
}

function isMissingFile(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return error.code === "ENOENT" || error.code === "ENOTDIR";
}

/**
 * Same result shape as the old API fetch, so callers did not need to change:
 * `ok` with branding and an ETag, `not-found` for an unknown tenant, or
 * `unavailable` when the file exists but cannot be used.
 */
export async function loadTenantBranding(slug: string): Promise<TenantBrandingResult> {
  const file = tenantBrandingPath(slug);
  if (!file) return { status: "not-found" };

  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    return isMissingFile(error) ? { status: "not-found" } : { status: "unavailable" };
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { status: "unavailable" };
  }

  const branding = unwrapBranding(body);
  if (!branding) return { status: "unavailable" };

  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return { status: "ok", branding, etag: `"${digest}"` };
}
