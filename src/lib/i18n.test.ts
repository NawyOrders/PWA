import { describe, expect, it } from "vitest";
import { pickText, translate, type Lang } from "@/lib/i18n";

describe("translation layer", () => {
  it("returns Arabic copy unchanged and interpolates variables", () => {
    expect(translate("ar", "الاصدار رقم {version}", { version: "1.0" })).toBe("الاصدار رقم 1.0");
  });

  it("translates known Arabic keys to English", () => {
    expect(translate("en", "تسجيل الدخول")).toBe("Sign in");
    expect(translate("en", "السلة")).toBe("Cart");
  });

  it("falls back to the Arabic key for missing English entries", () => {
    expect(translate("en", "نص غير مترجم")).toBe("نص غير مترجم");
  });

  it("replaces repeated variables everywhere", () => {
    expect(translate("ar", "{name} ثم {name}", { name: "برجر" })).toBe("برجر ثم برجر");
  });

  it("coerces numeric variables", () => {
    expect(translate("en", "الاصدار رقم {version}", { version: 2 })).toBe("Version 2");
  });

  it("keeps the demo OTP flow translated", () => {
    expect(translate("en", "الكود غير صحيح، جرب تاني")).toBe("Incorrect code, please try again");
    expect(translate("en", "استخدم كود التجربة {code} لإكمال تسجيل الدخول.", { code: "123456" })).toBe(
      "Use demo code 123456 to complete sign in.",
    );
  });

  it("picks localized values by language", () => {
    const lang: Lang = "en";
    expect(pickText(lang, "عربي", "English")).toBe("English");
    expect(pickText("ar", "عربي", "English")).toBe("عربي");
  });
});
