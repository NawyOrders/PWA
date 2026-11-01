import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.tsx"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/**/*.ts",
        "src/hooks/**/*.ts",
        "src/components/providers.tsx",
        "src/components/login-view.tsx",
        "src/components/policies-view.tsx",
        "src/components/site-chrome.tsx",
        "src/components/ui.tsx",
      ],
      exclude: ["src/lib/i18n.ts", "src/lib/account-data.ts"],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 80,
        lines: 90,
      },
    },
  },
});
