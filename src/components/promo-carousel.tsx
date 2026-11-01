"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/components/providers";
import { heroImage, heroIsMirrored } from "@/lib/media";

const slides = [
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

export function PromoCarousel() {
  const { t, lang } = useApp();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[index];

  return (
    <div>
      <div className="relative aspect-[2.5/1] overflow-hidden rounded-[22px] bg-peach shadow-soft sm:aspect-[3.4/1] lg:aspect-[4.75/1] lg:rounded-[26px]">
        {slides.map((item, slideIndex) => {
          const isHero = item.id === "combo";
          return (
          <div
            key={item.id}
            aria-hidden={slideIndex !== index}
            className={`absolute inset-0 transition-opacity duration-700 ${
              slideIndex === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={isHero ? heroImage(lang) : item.image}
              alt={t(item.title)}
              fill
              priority={slideIndex === 0}
              sizes="(max-width: 1024px) 100vw, 900px"
              className={`object-cover ${isHero && heroIsMirrored(lang) ? "ltr:-scale-x-100" : ""}`}
            />
            <div
              className={`absolute inset-0 ${
                item.theme === "dark"
                  ? "from-black/35 via-black/5 to-transparent"
                  : "from-cream/95 via-cream/55 to-transparent"
              } ${lang === "en" ? "bg-gradient-to-r" : "bg-gradient-to-l"}`}
            />
            <div className="absolute inset-y-0 start-0 flex w-[68%] flex-col justify-center gap-2 ps-4 text-start sm:w-[55%] lg:w-[48%] lg:gap-3 lg:ps-10">
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
              <p
                className={`line-2 max-w-md text-[10px] leading-4 sm:text-[11px] lg:line-1 lg:text-xs ${
                  item.theme === "dark" ? "text-white/85" : "text-ink/60"
                }`}
              >
                {t(item.text)}
              </p>
              <Link
                href={slide.href}
                className={`mt-1 inline-flex h-9 w-fit items-center gap-2 rounded-full px-4 text-[11px] font-bold transition lg:h-11 lg:px-6 lg:text-sm ${
                  item.theme === "dark"
                    ? "bg-[#cb2f19] text-white hover:bg-[#b32612]"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {t(slide.cta)}
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
            aria-selected={dotIndex === index}
            aria-label={t("العرض {n}", { n: dotIndex + 1 })}
            onClick={() => setIndex(dotIndex)}
            className={`h-1.5 rounded-full transition-all ${
              dotIndex === index ? "w-4 bg-brand" : "w-1.5 bg-[#d9ccc0] hover:bg-brand/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
