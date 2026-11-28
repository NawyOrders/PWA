"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/components/providers";
import { authTransport } from "@/lib/api";
import { formatPrice } from "@/lib/data";
import type { Lang } from "@/lib/i18n";
import { heroImage, heroIsMirrored } from "@/lib/media";
import { menuImage } from "@/lib/tenant-menu";
import { useOffers } from "@/hooks/use-tenant-offers";
import type { DailyRecurringOffer, PromotionalOffer } from "@/lib/tenant-offers";

type Slide = {
  id: string;
  image: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  theme: "dark" | "light";
  price?: number | null;
  originalPrice?: number | null;
};

const demoSlides: Slide[] = [
  {
    id: "combo",
    image: "/images/banner.webp",
    title: "كومبو برجر ببلاش",
    text: "جرّب انهيارة عرض الشقاوة.. عرض برجر الشقاوة على الكومبو لآخر اليوم.",
    cta: "اطلب الان",
    href: "/product/beef-burger",
    theme: "dark" as const,
  },
  {
    id: "pizza",
    image: "/images/pizza.webp",
    title: "بيتزا طازة من الفرن",
    text: "خصم 20% على كل أنواع البيتزا مع صوص الجبنة الإضافي.",
    cta: "اطلب بيتزا",
    href: "/search?q=%D8%A8%D9%8A%D8%AA%D8%B2%D8%A7",
    theme: "light" as const,
  },
  {
    id: "chicken",
    image: "/images/chicken.webp",
    title: "فرايد تشيكن مقرمش",
    text: "وجبة العائلة بـ 4 قطع دجاج وبطاطس وكول سلو بسعر مميز.",
    cta: "اطلب دلوقتي",
    href: "/product/chicken-bucket",
    theme: "light" as const,
  },
  {
    id: "free",
    image: "/images/burger.webp",
    title: "توصيل علينا",
    text: "اطلب من 200 جنيه واستمتع بتوصيل مجاني لحد باب البيت.",
    cta: "اطلب الان",
    href: "/categories",
    theme: "dark" as const,
  },
];

function pick(lang: Lang, ar?: string | null, en?: string | null): string {
  const first = lang === "en" ? en : ar;
  const fallback = lang === "en" ? ar : en;
  return (first ?? "").trim() || (fallback ?? "").trim();
}

/** A single-item sale links straight to its product; anything else browses. */
function offerHref(kind: PromotionalOffer["kind"], items?: { menuItemId: string }[] | null): string {
  const first = items?.[0];
  return kind === "SingleItem" && first ? `/product/${first.menuItemId}` : "/categories";
}

function promotionalSlide(offer: PromotionalOffer, lang: Lang): Slide | null {
  const title = pick(lang, offer.titleAr, offer.titleEn);
  if (!offer.imageUrl || !title) return null;
  return {
    id: offer.id,
    image: menuImage(null, offer.imageUrl),
    title,
    text: pick(lang, offer.descriptionAr, offer.descriptionEn),
    cta: "اطلب الان",
    href: offerHref(offer.kind, offer.items),
    theme: "dark",
    price: offer.offerPrice,
    originalPrice: offer.originalPrice,
  };
}

function dailySlide(offer: DailyRecurringOffer, lang: Lang): Slide | null {
  const title = pick(lang, offer.titleAr, offer.titleEn);
  if (!offer.imageUrl || !title) return null;
  return {
    id: `daily-${offer.id}`,
    image: menuImage(null, offer.imageUrl),
    title,
    text: pick(lang, offer.descriptionAr, offer.descriptionEn),
    cta: "اطلب الان",
    href: offerHref("SingleItem", offer.items),
    theme: "dark",
  };
}

export function PromoCarousel({ branchId }: { branchId?: string }) {
  const { t, lang } = useApp();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  /* The demo tenant keeps its marketing artwork; a live tenant shows only the
     offers the dashboard publishes through `GET /api/v1/offers`, and the
     carousel hides entirely while the feed is empty, loading or unavailable. */
  const demoOnly = authTransport() !== "live";
  const feed = useOffers(branchId, !demoOnly);

  const slides = useMemo<Slide[]>(() => {
    if (demoOnly) return demoSlides;
    const data = feed.data;
    if (!data) return [];
    const live = [
      ...(data.promotionalOffers ?? []).map((offer) => promotionalSlide(offer, lang)),
      ...(data.dailyRecurringOffers ?? []).map((offer) => dailySlide(offer, lang)),
    ];
    return live.filter((slide): slide is Slide => slide !== null);
  }, [demoOnly, feed.data, lang]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setIndex((current) => (slides.length ? current % slides.length : 0));
  }, [slides.length]);

  const finishSwipe = (endX: number) => {
    if (touchStartX.current === null) return;

    const distance = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 40 || slides.length < 2) return;

    setIndex((current) =>
      (current + (distance < 0 ? 1 : -1) + slides.length) % slides.length,
    );
  };

  if (slides.length === 0) return null;

  return (
    <div>
      <div
        className="relative aspect-[2.5/1] overflow-hidden rounded-[22px] bg-peach shadow-soft [touch-action:pan-y] sm:aspect-[3.4/1] lg:aspect-[4.75/1] lg:rounded-[26px]"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const endX = event.changedTouches[0]?.clientX;
          if (endX !== undefined) finishSwipe(endX);
        }}
        onTouchCancel={() => {
          touchStartX.current = null;
        }}
      >
        {slides.map((item, slideIndex) => {
          const isHero = item.id === "combo";
          const copy = (
            <>
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-bold lg:text-[10px] ${
                  item.theme === "dark" ? "bg-white/20 text-white backdrop-blur" : "bg-white/80 text-brand"
                }`}
              >
                {t("عرض محدود")}
              </span>
              <h2
                className={`font-display text-xl font-extrabold leading-tight sm:text-2xl lg:text-[34px] ${
                  item.theme === "dark" ? "text-white" : "text-ink"
                }`}
              >
                {t(item.title)}
              </h2>
              {item.text ? (
                <p
                  className={`line-2 max-w-md text-[11px] leading-4 sm:text-xs lg:text-sm ${
                    item.theme === "dark" ? "text-white" : "text-ink/70"
                  }`}
                >
                  {t(item.text)}
                </p>
              ) : null}
              {item.price != null ? (
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-extrabold lg:text-lg ${item.theme === "dark" ? "text-white" : "text-brand"}`}>
                    {formatPrice(item.price)} {t("جنيه")}
                  </span>
                  {item.originalPrice != null && item.originalPrice > item.price ? (
                    <span className={`text-[11px] font-bold line-through lg:text-xs ${item.theme === "dark" ? "text-white/70" : "text-ink/40"}`}>
                      {formatPrice(item.originalPrice)}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <Link
                href={item.href}
                tabIndex={slideIndex === index ? 0 : -1}
                className={`mt-1 inline-flex h-9 w-fit items-center gap-2 rounded-full px-4 text-[11px] font-bold transition lg:h-11 lg:px-6 lg:text-sm ${
                  item.theme === "dark"
                    ? "bg-[#cb2f19] text-white hover:bg-[#b32612]"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {t(item.cta)}
                <ArrowLeft className="size-3.5 lg:size-4 ltr:rotate-180" />
              </Link>
            </>
          );
          return (
          <div
            key={item.id}
            aria-hidden={slideIndex !== index}
            className={`absolute inset-0 transition-opacity duration-700 ${
              slideIndex === index ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <>
                <Image
                  src={isHero ? heroImage(lang) : item.image}
                  alt={t(item.title)}
                  fill
                  priority={slideIndex === 0}
                  sizes="(max-width: 1024px) 100vw, 900px"
                  unoptimized={!item.image.startsWith("/")}
                  className={`object-cover transition-transform duration-700 ${
                    isHero && heroIsMirrored(lang) ? "ltr:-scale-x-100" : ""
                  } ${slideIndex === index ? "motion-zoom" : ""}`}
                />
                <div
                  className={`absolute inset-0 ${
                    item.theme === "dark"
                      ? "from-black/60 via-black/25 to-transparent"
                      : "from-cream/95 via-cream/55 to-transparent"
                  } ${lang === "en" ? "bg-gradient-to-r" : "bg-gradient-to-l"}`}
                />
                <div
                  className={`absolute inset-y-0 start-0 flex w-[68%] flex-col justify-center gap-2 ps-4 text-start sm:w-[55%] lg:w-[48%] lg:gap-3 lg:ps-10 ${
                    slideIndex === index ? "motion-slide" : ""
                  }`}
                >
                  {copy}
                </div>
            </>
          </div>
          );
        })}
      </div>

      {slides.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label={t("العروض")}>
          {slides.map((item, dotIndex) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={t("العرض {n}", { n: dotIndex + 1 })}
              onClick={() => setIndex(dotIndex)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dotIndex === index ? "w-4 bg-brand" : "w-1.5 bg-[#d9ccc0] hover:w-2.5 hover:bg-brand/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
