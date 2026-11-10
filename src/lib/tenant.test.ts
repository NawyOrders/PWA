import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TENANT_API_BASE_URL_TEMPLATE,
  DEFAULT_TENANT_ROOT_DOMAIN,
  isTenantNotFoundProblem,
  isTenantRootHost,
  normalizeHostname,
  reservedTenantSlugs,
  tenantApiBaseUrl,
  tenantRootDomain,
  tenantSlugFromHost,
} from "@/lib/tenant";

const SLUG = "el-fahm-01a1c1ed11cf79ffbe51681899bb90fd";

beforeEach(() => {
  vi.stubEnv("TENANT_ROOT_DOMAIN", "");
  vi.stubEnv("TENANT_API_BASE_URL_TEMPLATE", "");
  vi.stubEnv("TENANT_RESERVED_SLUGS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tenant host resolution", () => {
  it("uses the documented defaults", () => {
    expect(tenantRootDomain()).toBe(DEFAULT_TENANT_ROOT_DOMAIN);
    expect(tenantApiBaseUrl(SLUG)).toBe(
      `${DEFAULT_TENANT_API_BASE_URL_TEMPLATE.split("{slug}").join(SLUG)}`,
    );
  });

  it("takes the first hostname label as the slug", () => {
    expect(tenantSlugFromHost(`${SLUG}.nawyorders.com`)).toBe(SLUG);
    expect(tenantSlugFromHost(`${SLUG}.nawyorders.com:443`)).toBe(SLUG);
    expect(tenantSlugFromHost(`${SLUG}.NAWYORDERS.COM.`)).toBe(SLUG);
  });

  it("rejects reserved labels", () => {
    for (const slug of ["www", "api", "admin", "platform-api", "tenant-api", "app", "static", "assets", "health", "cdn", "media", "dashboard"]) {
      expect(tenantSlugFromHost(`${slug}.nawyorders.com`)).toBeNull();
    }
  });

  it("rejects hosts that are not under the storefront root", () => {
    expect(tenantSlugFromHost("localhost:3000")).toBeNull();
    expect(tenantSlugFromHost("nawyorders.com")).toBeNull();
    expect(tenantSlugFromHost("example.com")).toBeNull();
    expect(tenantSlugFromHost("")).toBeNull();
    expect(tenantSlugFromHost(null)).toBeNull();
  });

  it("never mistakes a tenant API host for a storefront", () => {
    expect(tenantSlugFromHost(`${SLUG}.api.nawyorders.com`)).toBeNull();
    expect(isTenantRootHost(`${SLUG}.api.nawyorders.com`)).toBe(true);
  });

  it("rejects labels that cannot be one DNS label", () => {
    expect(tenantSlugFromHost("-bad.nawyorders.com")).toBeNull();
    expect(tenantSlugFromHost("bad-.nawyorders.com")).toBeNull();
    expect(tenantSlugFromHost("bad_label.nawyorders.com")).toBeNull();
    expect(tenantSlugFromHost("a".repeat(64) + ".nawyorders.com")).toBeNull();
  });

  it("accepts a configured root domain and reserved list", () => {
    vi.stubEnv("TENANT_ROOT_DOMAIN", "example.test");
    vi.stubEnv("TENANT_RESERVED_SLUGS", "shop, store");
    expect(tenantSlugFromHost("alpha.example.test")).toBe("alpha");
    expect(tenantSlugFromHost("shop.example.test")).toBeNull();
    expect(reservedTenantSlugs().has("store")).toBe(true);
  });

  it("normalises ports, IPv6 brackets and trailing dots", () => {
    expect(normalizeHostname("Example.TEST:8080")).toBe("example.test");
    expect(normalizeHostname("[::1]:3000")).toBe("[::1]");
    expect(normalizeHostname("example.test.")).toBe("example.test");
  });
});

describe("tenant API base URL", () => {
  it("substitutes the slug into the configured template", () => {
    vi.stubEnv("TENANT_API_BASE_URL_TEMPLATE", "https://{slug}.api.example.test");
    expect(tenantApiBaseUrl(SLUG)).toBe(`https://${SLUG}.api.example.test`);
  });

  it("strips trailing slashes so joins stay clean", () => {
    vi.stubEnv("TENANT_API_BASE_URL_TEMPLATE", "https://{slug}.api.example.test///");
    expect(tenantApiBaseUrl(SLUG)).toBe(`https://${SLUG}.api.example.test`);
  });

  it("refuses a template that cannot name a tenant", () => {
    vi.stubEnv("TENANT_API_BASE_URL_TEMPLATE", "https://api.example.test");
    expect(tenantApiBaseUrl(SLUG)).toBeNull();
  });

  it("refuses a template that is not an http(s) URL", () => {
    vi.stubEnv("TENANT_API_BASE_URL_TEMPLATE", "ftp://{slug}.api.example.test");
    expect(tenantApiBaseUrl(SLUG)).toBeNull();
  });
});

describe("Tenant Not Found detection", () => {
  it("recognises the documented 404 problem", () => {
    const problem = {
      title: "Tenant Not Found",
      status: 404,
      detail: "The tenant identified by subdomain 't' was not found.",
      instance: "/",
    };
    expect(isTenantNotFoundProblem(problem, 404)).toBe(true);
  });

  it("recognises the title even when a proxy changed the status", () => {
    expect(isTenantNotFoundProblem({ title: "Tenant Not Found" }, 500)).toBe(true);
  });

  it("does not treat every 404 body as a tenant problem when the status is not 404", () => {
    expect(isTenantNotFoundProblem({ title: "Something Else" }, 500)).toBe(false);
    expect(isTenantNotFoundProblem(null, 500)).toBe(false);
  });
});
