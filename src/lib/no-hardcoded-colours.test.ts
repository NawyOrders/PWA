import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the bug class the tenant-branding work shipped with: colours baked into
 * components bypass the `--color-*` tokens, so a tenant's brand never reaches them.
 * Source is read from disk on purpose — the tokens cannot be trusted to describe
 * who is using them.
 */

const ROOTS = ["src/components", "src/app"];
// Not \b: Tailwind arbitrary values put hex next to `_`, as in `linear-gradient(...#f25b43_100%)`.
const COLOUR_PATTERN = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])|rgba?\(/g;

type AllowlistEntry = {
  /** Repository-relative path, forward slashes. */
  file: string;
  reason: string;
  /** Lowercase hex values allowed in this file; omit to allow the whole file. */
  values?: string[];
};

const ALLOWLIST: AllowlistEntry[] = [
  {
    file: "src/app/globals.css",
    reason: "Defines the token defaults and CSS-only effects (selection, scrollbar); components must not carry literals.",
  },
  {
    file: "src/app/global-error.tsx",
    reason: "Rendered outside the root layout, so the app's CSS variables are not available to it.",
  },
  {
    file: "src/components/home-view.tsx",
    values: ["#4285f4", "#34a853", "#fbbc04", "#ea4335"],
    reason: "Google Play badge keeps its official four-colour logo.",
  },
  {
    file: "src/components/payment-view.tsx",
    values: ["#fbe7f0", "#b11b64"],
    reason: "InstaPay tile keeps the payment provider's own brand colours.",
  },
  {
    file: "src/components/leaflet-map-impl.tsx",
    values: ["#e8452c"],
    reason: "Leaflet draws to canvas and needs a resolved fallback when --color-brand cannot be read.",
  },
];

type ColourLiteral = { file: string; line: number; value: string };

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (entry.name.includes(".test.")) return [];
    return /\.(?:tsx?|css)$/.test(entry.name) ? [full] : [];
  });
}

function repositoryPath(file: string): string {
  return file.split("\\").join("/");
}

const scannedFiles = ROOTS.flatMap(sourceFiles).map(repositoryPath);

const colourLiterals: ColourLiteral[] = ROOTS.flatMap(sourceFiles).flatMap((path) => {
  const file = repositoryPath(path);
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .flatMap((text, index) =>
      Array.from(text.matchAll(COLOUR_PATTERN)).map((match) => ({
        file,
        line: index + 1,
        value: match[0].toLowerCase(),
      })),
    );
});

function isAllowed({ file, value }: ColourLiteral): boolean {
  const entry = ALLOWLIST.find((candidate) => candidate.file === file);
  if (!entry) return false;
  return !entry.values || entry.values.includes(value);
}

describe("hardcoded colour guard", () => {
  it("catches hex values that sit next to an arbitrary-value underscore", () => {
    expect("linear-gradient(110deg,#f25b43_100%)".match(COLOUR_PATTERN)).toEqual(["#f25b43"]);
  });

  it("scans the component and app trees, skipping tests", () => {
    expect(scannedFiles).toContain("src/components/ui.tsx");
    expect(scannedFiles.some((file) => file.endsWith("globals.css"))).toBe(true);
    expect(scannedFiles.some((file) => file.includes(".test."))).toBe(false);
  });

  it("keeps every colour on a theme token outside the allowlist", () => {
    const violations = colourLiterals
      .filter((literal) => !isAllowed(literal))
      .map(({ file, line, value }) => `${file}:${line} ${value}`);

    expect(violations).toEqual([]);
  });

  it("keeps the allowlist honest", () => {
    const found = new Set(colourLiterals.map(({ file, value }) => `${file} ${value}`));
    for (const entry of ALLOWLIST) {
      for (const value of entry.values ?? []) {
        expect(
          found.has(`${entry.file} ${value}`),
          `${entry.file} no longer contains ${value}; remove it from the allowlist`,
        ).toBe(true);
      }
    }
  });
});
