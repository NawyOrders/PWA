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
    // User-event interaction tests run several seconds each on CI-class
    // hardware; the default 5s ceiling is too tight for the slowest flows.
    // 30s, not 15s: the suite runs 46 jsdom environments in parallel, and the
    // two longest demo-code cases (a 45-tick countdown walk, and five typed
    // wrong codes) land at the ceiling under that contention while passing in
    // isolation. The ceiling only ever hides a hung test, never a wrong one.
    testTimeout: 30000,
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
        "src/components/addresses-view.tsx",
        "src/components/language-toggle.tsx",
        "src/components/login-view.tsx",
        "src/components/location-picker.tsx",
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
