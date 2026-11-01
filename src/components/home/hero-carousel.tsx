"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/format";

const slides = [
  {
    title: "كومبو برجر ببلاش",
    description: "جرب انهاردة عرض الشقاوة جرب برجر الشقاوة انهاردة عرض برجر الشقاوة",
    cta: "اطلب الان",
    href: "/categories/burger",
  },
  {
    title: "خصم 30% على البيتزا",
    description: "بيتزا طازة من الفرن على بابك، استخدم كود PIZZA30 عند إتمام الطلب",
    cta: "اطلب بيتزا",
    href: "/categories/pizza",
  },
  {
    title: "وجبات العيلة توصل لباب البيت",
    description: "كومبو يكفي العيلة كلها مع بطاطس ومشروبات بسعر واحد",
    cta: "شوف العرض",
    href: "/categories",
  },
  {
    title: "توصيل مجاني فوق 999 جنيه",
    description: "اطلب من أي فرع وتوصيلك علينا لكل الطلبات فوق 999 جنيه",
    cta: "ابدأ الطلب",
    href: "/categories/burger",
  },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  const go = useCallback((next: number) => {
    setIndex((next + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section aria-label="العروض الحالية" className="relative">
      <div className="relative h-[172px] overflow-hidden rounded-3xl bg-brand-deep shadow-soft sm:h-[230px] lg:h-[286px]">
        <Image
          src="/images/brand/hero.jpg"
          alt="برجر مزدوج مع بطاطس وكولا من ناوي أوردر"
          fill
          priority
          sizes="(min-width: 1024px) 1200px, 100vw"
          className="object-cover object-left"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(183,38,18,0.88)_0%,rgba(222,65,28,0.4)_45%,rgba(237,66,39,0.02)_78%)]" />

        {slides.map((slide, slideIndex) => (
          <div
            key={slide.title}
            aria-hidden={slideIndex !== index}
            className={cn(
              "absolute inset-0 flex items-center transition-opacity duration-700",
              slideIndex === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <div className="me-auto flex w-full max-w-[92%] flex-col items-start gap-2 p-4 text-start text-white sm:max-w-[64%] sm:gap-3 sm:p-7 lg:max-w-[52%] lg:gap-4 lg:p-10">
              <h2 className="text-xl font-extrabold leading-tight drop-shadow-sm sm:text-3xl lg:text-4xl">
                {slide.title}
              </h2>
              <p className="max-w-lg text-[11px] leading-5 text-white/90 sm:text-sm sm:leading-6">
                {slide.description}
              </p>
              <Link
                href={slide.href}
                className="mt-1 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-pop transition hover:bg-brand-strong sm:px-6 sm:py-2.5 sm:text-sm lg:mt-2"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                {slide.cta}
              </Link>
            </div>
          </div>
        ))}

        <div className="absolute inset-x-0 bottom-2.5 z-10 flex items-center justify-center gap-1.5">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => go(slideIndex)}
              aria-label={`الشريحة ${slideIndex + 1}: ${slide.title}`}
              aria-current={slideIndex === index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                slideIndex === index ? "w-4 bg-brand" : "w-1.5 bg-white/70 hover:bg-white",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
