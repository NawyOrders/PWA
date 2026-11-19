import { describe, expect, it } from "vitest";
import { localizedOffer, offerHref, type Offer } from "@/lib/offers";

const offer: Offer = {
  id: "offer-1",
  order: 1,
  theme: "dark",
  image: "https://cdn.example.com/ar.jpg",
  imageEn: "https://cdn.example.com/en.jpg",
  badgeAr: "عرض",
  badgeEn: "Offer",
  titleAr: "عنوان",
  titleEn: "Title",
  textAr: "نص",
  textEn: "Text",
  ctaAr: "اطلب",
  ctaEn: "Order",
  action: { type: "path", value: "/categories" },
};

describe("offerHref", () => {
  it("maps each action type to the app's real route", () => {
    expect(offerHref({ type: "product", value: "antara" })).toBe("/product/antara");
    expect(offerHref({ type: "category", value: "mixes" })).toBe("/categories/mixes");
    expect(offerHref({ type: "search", value: "بيتزا" })).toBe(
      `/search?q=${encodeURIComponent("بيتزا")}`,
    );
    expect(offerHref({ type: "path", value: "/categories" })).toBe("/categories");
  });
});

describe("localizedOffer", () => {
  it("uses the English overrides when the language is English", () => {
    expect(localizedOffer(offer, "en")).toEqual({
      title: "Title",
      text: "Text",
      cta: "Order",
      badge: "Offer",
      image: "https://cdn.example.com/en.jpg",
    });
  });

  it("keeps the base image and badge per language", () => {
    expect(localizedOffer(offer, "ar")).toEqual({
      title: "عنوان",
      text: "نص",
      cta: "اطلب",
      badge: "عرض",
      image: "https://cdn.example.com/ar.jpg",
    });
  });

  it("falls back to the other language for copy but not for the image override", () => {
    const onlyArabic = { ...offer, titleEn: "", textEn: "", ctaEn: "", badgeEn: null, imageEn: null };
    expect(localizedOffer(onlyArabic, "en")).toMatchObject({
      title: "عنوان",
      text: "نص",
      cta: "اطلب",
      badge: null,
      image: "https://cdn.example.com/ar.jpg",
    });
  });
});
