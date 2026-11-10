import type { NextConfig } from "next";

/**
 * The storefront is multi-tenant at runtime: the request host decides which
 * tenant API to call, so there is deliberately no build-time
 * `NEXT_PUBLIC_*_API_BASE_URL` here. One image serves every store.
 *
 * `cacheComponents` stays on; `src/app/layout.tsx` opts into a blocking render
 * because tenant branding must be known before the first paint.
 */
const nextConfig: NextConfig = {
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
