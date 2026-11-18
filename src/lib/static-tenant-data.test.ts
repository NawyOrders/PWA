import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTenantBranding, tenantBrandingPath } from "@/lib/static-tenant-data";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "tenants-"));
  vi.stubEnv("TENANT_DATA_DIR", root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

function writeTenant(slug: string, body: unknown) {
  mkdirSync(path.join(root, slug), { recursive: true });
  writeFileSync(path.join(root, slug, "branding.json"), JSON.stringify(body));
}

describe("loadTenantBranding", () => {
  it("reads the envelope shape from the slug's folder", async () => {
    writeTenant("pablo", { isSuccess: true, data: { tenantId: "pablo", nameEn: "Pablo" } });
    const result = await loadTenantBranding("pablo");
    expect(result).toMatchObject({ status: "ok", branding: { tenantId: "pablo", nameEn: "Pablo" } });
    if (result.status === "ok") expect(result.etag).toMatch(/^"[0-9a-f]{16}"$/);
  });

  it("accepts a bare branding object too", async () => {
    writeTenant("pablo", { tenantId: "pablo", nameAr: "بابلو" });
    expect(await loadTenantBranding("pablo")).toMatchObject({ status: "ok" });
  });

  it("answers not-found for a slug with no folder", async () => {
    expect(await loadTenantBranding("unknown")).toEqual({ status: "not-found" });
  });

  it("answers not-found for a folder without a branding file", async () => {
    mkdirSync(path.join(root, "empty"));
    expect(await loadTenantBranding("empty")).toEqual({ status: "not-found" });
  });

  it("is unavailable, not not-found, when the file is not valid JSON", async () => {
    mkdirSync(path.join(root, "broken"));
    writeFileSync(path.join(root, "broken", "branding.json"), "{ nope");
    expect(await loadTenantBranding("broken")).toEqual({ status: "unavailable" });
  });

  it("never reads outside the data folder for a hostile slug", async () => {
    expect(tenantBrandingPath("../etc")).toBeNull();
    expect(tenantBrandingPath("a/b")).toBeNull();
    expect(tenantBrandingPath("api")).toBeNull();
    expect(await loadTenantBranding("../etc")).toEqual({ status: "not-found" });
  });
});
