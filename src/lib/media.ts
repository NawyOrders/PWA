import type { Lang } from "@/lib/i18n";

// Swap these paths to change the hero artwork without touching components.
// The RTL banner has the food on the left and clear space on the right.
// In LTR the same image is mirrored so the clear space sits on the left.
// Provide `ltr` with a dedicated LTR artwork to use it instead of mirroring.
export const heroMedia = {
  rtl: "/images/banner.webp",
  ltr: null as string | null,
};

export function heroImage(lang: Lang) {
  return lang === "en" && heroMedia.ltr ? heroMedia.ltr : heroMedia.rtl;
}

export function heroIsMirrored(lang: Lang) {
  return lang === "en" && !heroMedia.ltr;
}
