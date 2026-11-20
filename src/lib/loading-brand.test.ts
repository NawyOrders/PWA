import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAND_NAME_AR, DEFAULT_BRAND_NAME_EN, resolveLoadingBrand } from "@/lib/loading-brand";
import { TENANT_DATA_DIR_ENV } from "@/lib/static-tenant-data";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "loading-brand-"));
  vi.stubEnv(TENANT_DATA_DIR_ENV, root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

function writeTenant(slug: string, body: unknown) {
  mkdirSync(path.join(root, slug), { recursive: true });
  writeFileSync(path.join(root, slug, "branding.json"), JSON.stringify(body));
}

function requestHeaders(values: Record<string, string>) {
  return (name: string) => values[name] ?? null;
}

describe("resolveLoadingBrand", () => {
  it("uses the tenant's own name when its branding file exists", async () => {
    writeTenant("pablo", { nameAr: "بابلو", nameEn: "Pablo" });

    await expect(resolveLoadingBrand(requestHeaders({ "x-tenant-slug": "pablo" }))).resolves.toEqual({
      nameAr: "بابلو",
      nameEn: "Pablo",
      isTenant: true,
    });
  });

  it("resolves the slug from the host when middleware did not forward it", async () => {
    writeTenant("pablo", { nameAr: "بابلو", nameEn: "Pablo" });

    await expect(
      resolveLoadingBrand(requestHeaders({ host: "pablo.nawyorders.com" })),
    ).resolves.toMatchObject({ nameAr: "بابلو", nameEn: "Pablo", isTenant: true });
  });

  it("keeps the default name when there is no tenant", async () => {
    const expected = {
      nameAr: DEFAULT_BRAND_NAME_AR,
      nameEn: DEFAULT_BRAND_NAME_EN,
      isTenant: false,
    };

    await expect(resolveLoadingBrand(requestHeaders({ host: "localhost:3000" }))).resolves.toEqual(expected);
    await expect(resolveLoadingBrand(requestHeaders({ host: "nawyorders.com" }))).resolves.toEqual(expected);
    await expect(resolveLoadingBrand(requestHeaders({}))).resolves.toEqual(expected);
  });

  it("shows the slug, never Nawy Orders, for a tenant without branding", async () => {
    mkdirSync(path.join(root, "unbranded"));

    const brand = await resolveLoadingBrand(requestHeaders({ "x-tenant-slug": "unbranded" }));

    expect(brand).toEqual({ nameAr: "unbranded", nameEn: "unbranded", isTenant: true });
    expect([brand.nameAr, brand.nameEn]).not.toContain("Nawy Orders");
    expect([brand.nameAr, brand.nameEn]).not.toContain("ناوي أوردرز");
  });
});
