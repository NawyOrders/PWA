import type { NextConfig } from "next";

/**
 * The integration guide names the tenant host `TENANT_API_BASE_URL`, but only
 * `NEXT_PUBLIC_` variables are inlined into the browser bundle — and the login
 * screen makes its anonymous OTP call from the browser, because the tenant is
 * resolved from the host that call reaches. Folding the guide's name in here is
 * what lets a deploy set either one and have both sides of the app agree.
 *
 * Declared only when a value exists: inlining an empty string would override a
 * host the server is meant to read at runtime.
 */
const tenantApiBaseUrl =
  process.env.NEXT_PUBLIC_TENANT_API_BASE_URL?.trim() || process.env.TENANT_API_BASE_URL?.trim() || "";

const nextConfig: NextConfig = {
  ...(tenantApiBaseUrl ? { env: { NEXT_PUBLIC_TENANT_API_BASE_URL: tenantApiBaseUrl } } : {}),
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
