"use client";

import { Globe } from "lucide-react";
import { useApp } from "@/components/providers";

/**
 * Language switch for the app chrome. The settings page owns the full
 * عربي / English segmented control; this is the one-tap shortcut that lives in
 * the navbar (desktop) and the store header (mobile) so the whole app can be
 * flipped without leaving the current screen.
 */
export function LanguageToggle({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "chip";
  className?: string;
}) {
  const { lang, setLang, t } = useApp();
  const next = lang === "ar" ? "en" : "ar";
  const label = next === "en" ? t("تغيير اللغة إلى الإنجليزية") : t("تغيير اللغة إلى العربية");

  const skin =
    variant === "pill"
      ? "h-12 gap-2 rounded-full bg-brand-soft px-4 text-sm text-brand hover:bg-brand/15"
      : "size-11 justify-center rounded-2xl border border-line bg-white text-ink shadow-soft hover:-rotate-3 hover:text-brand";

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={label}
      title={label}
      className={`motion-press flex shrink-0 items-center font-bold transition-all duration-300 hover:-translate-y-0.5 ${skin} ${className}`.trim()}
    >
      <Globe className="size-5" strokeWidth={2} />
      {variant === "pill" ? <span dir={next === "en" ? "ltr" : "rtl"}>{next === "en" ? "EN" : "ع"}</span> : null}
    </button>
  );
}
