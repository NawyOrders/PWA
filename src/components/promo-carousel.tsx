"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/components/providers";
import { heroImage, heroIsMirrored } from "@/lib/media";
import { localizedOffer, offerHref } from "@/lib/offers";

/** Built-in slides, used when the tenant has no usable offers file. */
const demoSlides = [
  {
    id: "combo",
    image: "/images/banner.webp",
    title: "كومبو برجر ببلاش",
    text: "جرّب انهيارة عرض الشقاوة.. عرض برجر الشقاوة على الكومبو لآخر اليوم.",
    cta: "اطلب الان",
    href: "/categories",
    theme: "dark" as const,
  },
  {
    id: "pizza",
    image: "/images/pizza.webp",
    title: "بيتزا طازة من الفرن",
    text: "خصم 20% على كل أنواع البيتزا مع صوص الجبنة الإضافي.",
    cta: "اطلب بيتزا",
    href: "/categories",
    theme: "light" as const,
  },
  {
    id: "chicken",
    image: "/images/chicken.webp",
    title: "فرايد تشيكن مقرمش",
    text: "وجبة العائلة بـ 4 قطع دجاج وبطاطس وكول سلو بسعر مميز.",
    cta: "اطلب دلوقتي",
    href: "/categories",
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

type Slide = {
  id: string;
  src: string | null;
  /** True for the mirrored LTR demo hero; tenant artwork is never mirrored. */
  mirror: boolean;
  theme: "dark" | "light";
  badge: string | null;
  title: string;
  text: string;
  cta: string;
  href: string;
  /** Plain `<img>` for tenant images, `next/image` for the built-in slides. */
  plain: boolean;
};

export function PromoCarousel() {
  const { t, lang, offers } = useApp();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const [failed, setFailed] = useState<Record<string, string>>({});

  const slides: Slide[] =
    offers === null
      ? demoSlides.map((item) => {
          const isHero = item.id === "combo";
          return {
            id: item.id,
            src: isHero ? heroImage(lang) : item.image,
            mirror: isHero && heroIsMirrored(lang),
            theme: item.theme,
            badge: t("عرض محدود"),
            title: t(item.title),
            text: t(item.text),
            cta: t(item.cta),
            href: item.href,
            plain: false,
          };
        })
      : offers.map((offer) => {
          const copy = localizedOffer(offer, lang);
          return {
            id: offer.id,
            src: copy.image,
            mirror: false,
            theme: offer.theme,
            badge: copy.badge,
            title: copy.title,
            text: copy.text,
            cta: copy.cta,
            href: offerHref(offer.action),
            plain: true,
          };
        });

  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const activeIndex = index % count;

  const finishSwipe = (endX: number) => {
    if (touchStartX.current === null) return;

    const distance = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 40) return;

    setIndex((current) => (current + (distance < 0 ? 1 : -1) + count) % count);
  };

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
          const isActive = slideIndex === activeIndex;
          const src = item.src;
          const showImage = src !== null && failed[item.id] !== src;
          return (
            <div
              key={item.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {showImage ? (
                item.plain ? (
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed((current) => ({ ...current, [item.id]: src }))}
                    className={`absolute inset-0 size-full object-cover transition-transform duration-700 ${
                      isActive ? "motion-zoom" : ""
                    }`}
                  />
                ) : (
                  <Image
                    src={src}
                    alt={item.title}
                    fill
                    priority={slideIndex === 0}
                    sizes="(max-width: 1024px) 100vw, 900px"
                    className={`object-cover transition-transform duration-700 ${
                      item.mirror ? "ltr:-scale-x-100" : ""
                    } ${isActive ? "motion-zoom" : ""}`}
                  />
                )
              ) : null}
              <div
                className={`absolute inset-0 ${
                  item.theme === "dark"
                    ? "from-black/35 via-black/5 to-transparent"
                    : "from-cream/95 via-cream/55 to-transparent"
                } ${lang === "en" ? "bg-gradient-to-r" : "bg-gradient-to-l"}`}
              />
              <div
                className={`absolute inset-y-0 start-0 flex w-[68%] flex-col justify-center gap-2 ps-4 text-start sm:w-[55%] lg:w-[48%] lg:gap-3 lg:ps-10 ${
                  isActive ? "motion-slide" : ""
                }`}
              >
                {item.badge ? (
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-bold lg:text-[10px] ${
                      item.theme === "dark" ? "bg-white/20 text-white backdrop-blur" : "bg-white/80 text-brand"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
                <h2
                  className={`font-display text-xl font-extrabold leading-tight sm:text-2xl lg:text-[34px] ${
                    item.theme === "dark" ? "text-white" : "text-ink"
                  }`}
                >
                  {item.title}
                </h2>
                <p
                  className={`line-2 max-w-md text-[10px] leading-4 sm:text-[11px] lg:line-1 lg:text-xs ${
                    item.theme === "dark" ? "text-white/85" : "text-ink/60"
                  }`}
                >
                  {item.text}
                </p>
                <Link
                  href={item.href}
                  tabIndex={isActive ? 0 : -1}
                  className={`mt-1 inline-flex h-9 w-fit items-center gap-2 rounded-full px-4 text-[11px] font-bold transition lg:h-11 lg:px-6 lg:text-sm ${
                    item.theme === "dark"
                      ? "bg-brand-600 text-brand-contrast hover:bg-brand-700"
                      : "bg-brand text-brand-contrast hover:bg-brand-dark"
                  }`}
                >
                  {item.cta}
                  <ArrowLeft className="size-3.5 lg:size-4 ltr:rotate-180" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label={t("العروض")}>
        {slides.map((item, dotIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={dotIndex === activeIndex}
            aria-label={t("العرض {n}", { n: dotIndex + 1 })}
            onClick={() => setIndex(dotIndex)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              dotIndex === activeIndex ? "w-4 bg-brand" : "w-1.5 bg-line-soft hover:w-2.5 hover:bg-brand/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
