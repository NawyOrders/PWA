import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";

/**
 * Guards the bug class the delivery-location flow shipped with: a label wrapped
 * in `t()` but never added to the dictionary, so English mode silently rendered
 * the Arabic key. Source is read from disk on purpose — the dictionary cannot be
 * trusted to describe itself.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (entry.name.includes(".test.") || entry.name === "i18n.ts") return [];
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const literalKeys = new Set<string>();
for (const file of sourceFiles("src")) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) literalKeys.add(match[1]);
}

describe("translation coverage", () => {
  it("collects the labels the app actually asks for", () => {
    expect(literalKeys.size).toBeGreaterThan(350);
  });

  it("has an English entry for every t() literal", () => {
    const missing = [...literalKeys].filter((key) => translate("en", key) === key);
    expect(missing).toEqual([]);
  });
});
