import type { Lang } from "@/lib/i18n";

/**
 * Tenant offers, shaped like `tenants/<slug>/offers.json` after the loader has
 * dropped disabled, expired, malformed and orphaned entries.
 *
 * This module stays browser-safe (no `fs`): the server loader in
 * `static-offers-data.ts` reads and validates the file, then hands the result
 * to the provider.
 */
export type OfferTheme = "dark" | "light";

/**
 * Where an offer's CTA leads. The value is an item id, a category id, a search
 * phrase or a site path depending on the type; the loader has already checked
 * that a product or category exists in the menu.
 */
export type OfferAction =
  | { type: "product"; value: string }
  | { type: "category"; value: string }
  | { type: "search"; value: string }
  | { type: "path"; value: string };

export type Offer = {
  id: string;
  order: number;
  theme: OfferTheme;
  /** Absolute https URL or same-origin tenant asset URL; `null` means no artwork. */
  image: string | null;
  /** English-only artwork; falls back to `image` when absent. */
  imageEn: string | null;
  badgeAr: string | null;
  badgeEn: string | null;
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
  ctaAr: string;
  ctaEn: string;
  action: OfferAction;
};

/** The CTA target for an offer action, using the app's real routes. */
export function offerHref(action: OfferAction): string {
  switch (action.type) {
    case "product":
      return `/product/${encodeURIComponent(action.value)}`;
    case "category":
      return `/categories/${encodeURIComponent(action.value)}`;
    case "search":
      return `/search?q=${encodeURIComponent(action.value)}`;
    case "path":
      return action.value;
  }
}

/**
 * The offer copy for the active language. Titles, text and CTA fall back to the
 * other language; a badge does not, because "no badge" is a valid design.
 */
export function localizedOffer(offer: Offer, lang: Lang) {
  const en = lang === "en";
  return {
    title: en ? offer.titleEn || offer.titleAr : offer.titleAr || offer.titleEn,
    text: en ? offer.textEn || offer.textAr : offer.textAr || offer.textEn,
    cta: en ? offer.ctaEn || offer.ctaAr : offer.ctaAr || offer.ctaEn,
    badge: en ? offer.badgeEn : offer.badgeAr,
    image: en ? offer.imageEn || offer.image : offer.image,
  };
}
