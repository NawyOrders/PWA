"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  Flame,
  LayoutGrid,
  ListFilter,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  categoriesById,
  categoryCounts,
  desktopCategoryOrder,
  filterMenu,
  homeCategoryOrder,
  menuFilters,
  products,
  type CategoryId,
} from "@/lib/data";
import { PromoCarousel } from "@/components/promo-carousel";
import { ProductCard } from "@/components/product-card";
import { MenuRow } from "@/components/menu-row";
import { InstallButton } from "@/components/install-button";
import { MenuFilters } from "@/components/menu-filters";
import { SectionTitle } from "@/components/ui";
import { StoreHeader } from "@/components/store-header";
import {
  DesktopOrderTrackingCard,
  MobileOrderTrackingBanner,
} from "@/components/order-tracking-promo";
import { useApp } from "@/components/providers";

function PhoneMockup() {
  const { lang, t } = useApp();
  const isEnglish = lang === "en";
  const mockup = isEnglish ? "/images/phonomockupen.PNG" : "/images/phonomockupar.PNG";
  const mockupDimensions = isEnglish
    ? { width: 728, height: 1356 }
    : { width: 740, height: 1360 };

  return (
    <div className="relative h-[288px] w-[155px] shrink-0 rounded-t-[32px] bg-gradient-to-br from-[#f58b78] via-[#ed604a] to-[#ffd2c3] p-[5px] shadow-[0_32px_70px_-30px_rgba(115,43,27,0.6)] sm:h-[360px] sm:w-[194px] sm:rounded-t-[42px] sm:p-[6px] lg:h-[480px] lg:w-[258px] lg:rounded-t-[52px]">
      <div className="relative h-full w-full overflow-hidden rounded-t-[27px] bg-cream sm:rounded-t-[37px] lg:rounded-t-[46px]">
        <Image
          src={mockup}
          alt={t("Nawy Orders mobile app")}
          {...mockupDimensions}
          sizes="(max-width: 639px) 145px, (max-width: 1023px) 182px, 246px"
          unoptimized
          className="absolute inset-x-0 top-4 h-auto w-full sm:top-5 lg:top-6"
        />
        <span className="absolute left-1/2 top-2 z-10 h-2.5 w-7 -translate-x-1/2 rounded-full bg-black sm:top-2.5 sm:h-3 sm:w-8 lg:top-3 lg:w-9" />
      </div>
    </div>
  );
}

export function HomeView() {
  const { t, loggedIn, orders, toast } = useApp();
  const [filter, setFilter] = useState("الكل");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(
    "burger",
  );
  const [showActiveOrder, setShowActiveOrder] = useState(true);
  const menu = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : filterMenu(filter);
  const activeOrder = orders.find((order) => order.status === "preparing");

  const selectCategory = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    setFilter("الكل");
  };

  const selectMenuFilter = (value: string) => {
    setSelectedCategory(null);
    setFilter(value);
  };

  return (
    <div className="pb-6 lg:pb-0">
      <div className="shell pt-5 lg:pt-8">
        <StoreHeader />
      </div>

      <div className="shell mt-5 lg:mt-7">
        <PromoCarousel />
      </div>

      <section className="shell relative mt-7 lg:mt-9">
        <SectionTitle
          title="الاقسام"
          icon={<LayoutGrid className="size-5 text-brand lg:size-6" />}
          action={{ label: "عرض كل الأصناف (12)", href: "/categories" }}
        />

        <div className="motion-stagger hide-scrollbar -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:hidden">
          {homeCategoryOrder.map((id) => {
            const category = categoriesById[id];
            const active = id === selectedCategory;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => selectCategory(id)}
                className="group flex w-[60px] shrink-0 flex-col items-center gap-2 text-center"
              >
                <span
                  className={`grid size-[60px] place-items-center rounded-full border-2 bg-white transition duration-300 group-hover:-translate-y-1 group-hover:border-brand/60 ${
                    active
                      ? "border-brand shadow-[0_10px_24px_-14px_rgba(232,69,44,0.7)]"
                      : "border-[#ece0d4]"
                  }`}
                >
                  <span className="relative size-12 overflow-hidden rounded-full">
                    <Image
                      src={category.image}
                      alt={t(category.name)}
                      fill
                      sizes="48px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                </span>
                <span
                  className={`whitespace-nowrap text-[10px] font-bold ${active ? "text-brand" : "text-ink"}`}
                >
                  {t(category.name)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="motion-stagger mt-4 hidden grid-cols-7 gap-3 lg:grid">
          {desktopCategoryOrder.map((id) => {
            const category = categoriesById[id];
            const active = id === selectedCategory;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => selectCategory(id)}
                className={`group flex flex-col items-center rounded-[18px] bg-white px-3 py-4 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98] ${
                  active ? "ring-2 ring-inset ring-brand/60" : ""
                }`}
              >
                <span className="grid size-[68px] place-items-center rounded-full bg-peach/80 transition-colors duration-300 group-hover:bg-brand-soft">
                  <span className="relative size-12 overflow-hidden rounded-full">
                    <Image
                      src={category.image}
                      alt={t(category.name)}
                      fill
                      sizes="48px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                </span>
                <span
                  className={`mt-2.5 text-sm font-extrabold ${active ? "text-brand" : "text-ink"}`}
                >
                  {t(category.name)}
                </span>
                <span className="mt-1 text-[10px] font-semibold text-muted">
                  {categoryCounts[id] ?? 0} {t("صنف")}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="shell mt-7 lg:mt-10">
        <SectionTitle
          title="الأكثر طلباً"
          icon={<Flame className="size-5 fill-brand/20 text-brand lg:size-6" />}
          className="translate-x-1.5"
        />
        <div className="motion-stagger mt-3 grid grid-cols-2 gap-3 lg:mt-5 lg:grid-cols-5 lg:gap-4">
          {products
            .filter(
              (product) => product.category === (selectedCategory ?? "burger"),
            )
            .sort(
              (a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)),
            )
            .slice(0, 4)
            .map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}

          <div className="motion-lift relative hidden overflow-hidden rounded-[26px] bg-[#e8452c] p-5 text-white shadow-soft lg:block">
            <div className="motion-float absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
            <div
              className="motion-float absolute -bottom-14 -left-8 size-40 rounded-full bg-[#f6a723]/25"
              style={{ animationDelay: "1.4s" }}
            />
            <div className="relative flex h-full flex-col justify-between">
              <span className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur">
                <Sparkles className="size-5" />
              </span>
              <div className="mt-10">
                <p className="text-[11px] font-semibold text-white/80">
                  {t("عرض محدود")}
                </p>
                <p className="mt-1 text-xl font-extrabold leading-7">
                  {t("توصيل مجاني")}
                  <br />
                  {t("خلال 30 - 45 دقيقة")}
                </p>
              </div>
              <Link
                href="/categories"
                className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-white text-xs font-bold text-brand transition hover:bg-brand-soft"
              >
                {t("تصفح العروض")}
              </Link>
            </div>
          </div>
        </div>
        {loggedIn && activeOrder && showActiveOrder ? (
          <>
            <MobileOrderTrackingBanner
              order={activeOrder}
              onClose={() => setShowActiveOrder(false)}
            />
            <DesktopOrderTrackingCard
              order={activeOrder}
              onClose={() => setShowActiveOrder(false)}
            />
          </>
        ) : null}
      </section>

      <section className="shell mt-8 lg:mt-11">
        <div className="motion-header flex items-center justify-between gap-3">
          <h2 className="flex shrink-0 items-center gap-2 text-lg font-extrabold lg:text-xl">
            <ListFilter className="size-5 text-brand lg:size-6" />
            {t("قائمة الطعام")}
          </h2>
          <MenuFilters
            filters={menuFilters}
            value={filter}
            onChange={selectMenuFilter}
            className="hidden lg:flex"
          />
        </div>

        <div className="motion-stagger mt-3 grid gap-3 lg:mt-5 lg:grid-cols-2 lg:gap-4">
          {menu.slice(0, 6).map((product) => (
            <MenuRow key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-5 hidden justify-center lg:flex">
          <Link
            href="/categories"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-6 text-sm font-bold text-ink transition hover:border-brand/40 hover:text-brand"
          >
            {t("عرض جميع أصناف القائمة")}
            <ChevronDown className="size-4" />
          </Link>
        </div>
      </section>

      <section className="shell mt-10 lg:mt-12">
        <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(110deg,#f9d6ce_0%,#f8c1b2_48%,#f25b43_100%)] px-5 py-7 sm:px-8 lg:h-[448px] lg:px-11 lg:py-8">
          <div className="absolute -right-16 -top-40 size-[410px] rounded-full bg-[#ff9b73]/35" />
          <div className="absolute -bottom-48 left-[8%] size-[390px] rounded-full bg-[#f47b55]/45" />
          <div className="absolute -bottom-64 right-[28%] size-[360px] rounded-full bg-[#ffad8b]/35" />
          <div className="relative grid grid-cols-1 items-center lg:h-full">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3.5 py-1.5 text-[11px] font-bold text-ink/70">
                <Smartphone className="size-3.5 text-brand" />
                {t("ناوي أوردرز")}
              </span>
              <h2 className="mt-3 text-[26px] font-extrabold leading-[1.3] sm:text-[30px] lg:mt-4 lg:text-[36px]">
                {t("احصل على طعامك")}
                <br />
                {t("المفضل بلمسة واحدة")}
              </h2>
              <p className="mt-3 max-w-md text-xs font-bold leading-6 text-ink/70 sm:text-sm sm:leading-7 lg:mt-4">
                {t(
                  "حمّل التطبيق عشان تحصل على عروض حصرية، وتتبع طلبك لحظة بلحظة، وتوصيل أسرع على مزاجك.",
                )}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toast(t("التطبيق هيكون متاح على المتجر قريباً"), "info")
                  }
                  className="flex h-14 w-32 items-center justify-center gap-2 rounded-xl bg-[#1f1a16] px-3 text-white transition hover:bg-black"
                >
                  <span className="text-start leading-tight">
                    <span className="block text-[9px] text-white/70">
                      {t("حمل من")}
                    </span>
                    <span className="text-sm font-bold">{t("متجر آبل")}</span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="size-9 shrink-0 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M16.37 12.21c.02 2.13 1.87 2.84 1.89 2.85-.02.05-.3 1.04-.98 2.06-.59.88-1.21 1.75-2.18 1.77-.95.02-1.25-.57-2.33-.57-1.08 0-1.42.55-2.32.59-.93.04-1.64-.95-2.23-1.83-1.21-1.78-2.14-5.03-.9-7.22a3.44 3.44 0 0 1 2.9-1.76c.91-.02 1.77.62 2.33.62.56 0 1.61-.77 2.71-.66.46.02 1.77.18 2.61 1.41-.07.04-1.56.91-1.5 2.74ZM14.6 6.96c.49-.59.82-1.41.73-2.23-.7.03-1.55.46-2.06 1.05-.45.52-.85 1.35-.74 2.15.78.06 1.57-.4 2.07-.97Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toast(t("التطبيق هيكون متاح على المتجر قريباً"), "info")
                  }
                  className="flex h-14 w-36 items-center justify-center gap-2 rounded-xl bg-[#1f1a16] px-3 text-white transition hover:bg-black"
                >
                  <span className="text-start leading-tight">
                    <span className="block text-[9px] text-white/70">
                      {t("حمل من")}
                    </span>
                    <span className="text-sm font-bold">{t("جوجل بلاي")}</span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="size-7 shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.3 2.8c-.2.3-.3.7-.3 1.2v16c0 .5.1.9.3 1.2l9-9.2-9-9.2Z"
                      fill="#4285F4"
                    />
                    <path
                      d="m15.3 15.1-3-3.1-9 9.2c.4.4 1.1.5 1.8.1l10.2-6.2Z"
                      fill="#34A853"
                    />
                    <path
                      d="m20.2 10.4-3.1-1.9-3.4 3.5 3.4 3.5 3.1-1.9c1.2-.7 1.2-2.4 0-3.2Z"
                      fill="#FBBC04"
                    />
                    <path
                      d="  M5.1 2.7c-.7-.4-1.4-.3-1.8.1l9 9.2 3.4-3.5L5.1 2.7Z"
                      fill="#EA4335"
                    />
                  </svg>
                </button>
                <InstallButton />
              </div>
            </div>
          </div>
          {/* Centred under the copy on phones and tablets, pinned to the far
              edge of the card from lg up, where the card has a fixed height. */}
          <div className="mx-auto mt-7 sm:mt-8 lg:absolute lg:top-10 lg:left-[7%] lg:right-auto lg:mt-0 ltr:lg:left-auto ltr:lg:right-[7%]">
            <PhoneMockup />
          </div>
        </div>
      </section>
    </div>
  );
}
