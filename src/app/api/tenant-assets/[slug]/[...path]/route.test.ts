import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/tenant-assets/[slug]/[...path]/route";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "tenant-assets-"));
  vi.stubEnv("TENANT_DATA_DIR", root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

function call(slug: string, segments: string[]) {
  return GET(new Request(`http://localhost/api/tenant-assets/${slug}/${segments.join("/")}`), {
    params: Promise.resolve({ slug, path: segments }),
  });
}

describe("tenant asset route", () => {
  it("serves a tenant image with the right content type", async () => {
    mkdirSync(path.join(root, "pablo", "images"), { recursive: true });
    writeFileSync(path.join(root, "pablo", "images", "antara.jpg"), "jpeg-bytes");

    const response = await call("pablo", ["images", "antara.jpg"]);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("jpeg-bytes");
  });

  it("refuses traversal, unsupported extensions and unknown tenants", async () => {
    mkdirSync(path.join(root, "pablo"), { recursive: true });
    writeFileSync(path.join(root, "secret.jpg"), "outside");

    expect((await call("pablo", ["..", "secret.jpg"])).status).toBe(404);
    expect((await call("pablo", ["images", "..", "..", "secret.jpg"])).status).toBe(404);
    expect((await call("pablo", ["menu.json"])).status).toBe(404);
    expect((await call("unknown", ["a.jpg"])).status).toBe(404);
    expect((await call("../etc", ["passwd.jpg"])).status).toBe(404);
  });
});
