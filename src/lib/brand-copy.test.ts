import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";

/**
 * The brand name is tenant data, not copy. These files were the places that
 * still rendered "Nawy Orders" for every store; the only literals allowed to
 * survive are the default-site fallbacks and the tagline a tenant never sees.
 */
const files = [
  "src/components/about-view.tsx",
  "src/components/policies-view.tsx",
  "src/components/footer.tsx",
  "src/components/navbar.tsx",
  "src/components/categories-view.tsx",
  "src/components/home-view.tsx",
  "src/components/logo.tsx",
  "src/app/loading.tsx",
];

const allowlist = [
  // Fallback used only when `brandingName` and `tenantSlug` are both null.
  't("ناوي أوردرز")',
  '?? "ناوي أوردرز"',
  // Tagline below the logo, rendered only for the default (non-tenant) site.
  ">Nawy Orders<",
];

const BRAND = /ناوي أوردرز|ناوي اوردرز|Nawy Orders/;

describe("brand copy", () => {
  it.each(files)("has no un-allowlisted Nawy literal left in %s", (file) => {
    let source = readFileSync(file, "utf8");
    for (const snippet of allowlist) source = source.split(snippet).join("");

    expect(source.match(BRAND)?.[0] ?? null).toBeNull();
  });

  it("keeps the default-site copy unchanged in Arabic", () => {
    expect(translate("ar", "© 2026 {brand} — جميع الحقوق محفوظة.", { brand: "ناوي أوردرز" })).toBe(
      "© 2026 ناوي أوردرز — جميع الحقوق محفوظة.",
    );
    expect(translate("ar", "{brand} — طعم يوصلك لباب البيت.", { brand: "ناوي أوردرز" })).toBe(
      "ناوي أوردرز — طعم يوصلك لباب البيت.",
    );
    expect(translate("ar", "عن {brand}", { brand: "ناوي أوردرز" })).toBe("عن ناوي أوردرز");
    expect(translate("ar", "{brand} - الرئيسية", { brand: "ناوي أوردرز" })).toBe("ناوي أوردرز - الرئيسية");
    expect(
      translate("ar", "{count} أقسام رئيسية — كل الأصناف محضرة طازة في مطبخ {brand}", {
        count: 7,
        brand: "ناوي أوردرز",
      }),
    ).toBe("7 أقسام رئيسية — كل الأصناف محضرة طازة في مطبخ ناوي أوردرز");
  });

  it("keeps the default-site copy unchanged in English", () => {
    expect(translate("en", "© 2026 {brand} — جميع الحقوق محفوظة.", { brand: "Nawy Orders" })).toBe(
      "© 2026 Nawy Orders — All rights reserved.",
    );
    expect(translate("en", "{brand} — طعم يوصلك لباب البيت.", { brand: "Nawy Orders" })).toBe(
      "Nawy Orders — great taste delivered to your door.",
    );
    expect(translate("en", "عن {brand}", { brand: "Nawy Orders" })).toBe("About Nawy Orders");
    expect(translate("en", "{brand} - الرئيسية", { brand: "Nawy Orders" })).toBe("Nawy Orders — Home");
    expect(
      translate("en", "{count} أقسام رئيسية — كل الأصناف محضرة طازة في مطبخ {brand}", {
        count: 7,
        brand: "Nawy Orders",
      }),
    ).toBe("7 main categories — everything is freshly prepared in the Nawy Orders kitchen");
  });
});
