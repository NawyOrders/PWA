"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  Download,
  Flame,
  LayoutGrid,
  ListFilter,
  MapPin,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  categoriesById,
  desktopCategoryOrder,
  filterMenu,
  homeCategoryOrder,
  menuFilters,
  orders,
  products,
} from "@/lib/data";
import { PromoCarousel } from "@/components/promo-carousel";
import { ProductCard } from "@/components/product-card";
import { MenuRow } from "@/components/menu-row";
import { CartBar } from "@/components/cart-bar";
import { InstallButton } from "@/components/install-button";
import { MenuFilters } from "@/components/menu-filters";
import { SectionTitle } from "@/components/ui";
import { StoreHeader } from "@/components/store-header";
import { DesktopOrderTrackingCard, MobileOrderTrackingBanner } from "@/components/order-tracking-promo";
import { useApp } from "@/components/providers";

function PhoneMockup() {
  const { t } = useApp();
  return (
    <div className="relative mx-auto h-[430px] w-[232px] shrink-0 rounded-[42px] border-[7px] border-[#241b16] bg-cream shadow-[0_40px_70px_-35px_rgba(70,30,15,0.55)]">
      <div className="absolute left-1/2 top-2.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-[#241b16]" />
      <div className="h-full overflow-hidden rounded-[35px]">
        <div className="flex items-center justify-between px-4 pt-3 text-[7px] font-bold">
          <span>9:41</span>
          <span className="flex gap-1">‖▮ ▮</span>
        </div>
        <div className="mt-2 flex items-center justify-between px-3.5">
          <div>
            <p className="text-[6px] text-muted">{t("مرحبا أحمد")}</p>
            <p className="text-[8px] font-bold">{t("زهراء المعادي، المعراج العلوي")}</p>
          </div>
          <span className="grid size-5 place-items-center rounded-full bg-[#f6a723] text-white">
            <MapPin className="size-3" />
          </span>
        </div>
        <div className="mx-3.5 mt-2 h-6 rounded-full bg-white shadow-sm" />
        <div className="relative mx-3.5 mt-2.5 h-[74px] overflow-hidden rounded-xl">
          <Image src="/images/banner.webp" alt="" fill sizes="200px" className="object-cover ltr:-scale-x-100" />
          <div className="absolute inset-y-0 start-0 flex w-[62%] flex-col justify-center gap-1 pe-2 ps-3">
            <p className="text-[9px] font-extrabold text-white">{t("كومبو برجر ببلاش")}</p>
            <p className="text-[5px] text-white/80">{t("جرّب انهيارة عرض الشقاوة.. عرض برجر الشقاوة على الكومبو لآخر اليوم.")}</p>
            <span className="mt-0.5 w-fit rounded-full bg-[#cb2f19] px-2 py-0.5 text-[5px] font-bold text-white">
              {t("اطلب الان")}
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex justify-between px-4">
          {["برجر", "بيتزا", "توست", "تشيكن"].map((label, index) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className={`relative size-8 overflow-hidden rounded-full border ${
                  index === 0 ? "border-brand" : "border-line"
                } bg-white`}
              >
                <Image
                  src={["/images/burger.webp", "/images/pizza.webp", "/images/tost.webp", "/images/chicken.webp"][index]}
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </span>
              <span className="text-[5px] font-semibold">{t(label)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 px-3.5">
          <p className="text-[7px] font-extrabold">{t("الأكثر طلباً")}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {[0, 1].map((item) => (
              <div key={item} className="rounded-lg bg-white p-1">
                <div className="relative h-[52px] overflow-hidden rounded-md bg-peach">
                  <Image src="/images/burger.webp" alt="" fill sizes="80px" className="object-cover" />
                </div>
                <p className="mt-1 text-[5px] font-bold">{t("برجر لحم")}</p>
                <p className="text-[5px] font-bold text-brand">120 {t("جنيه")}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-line bg-white py-2">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className={`size-2.5 rounded ${item === 0 ? "bg-brand" : "bg-[#c9beb3]"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeView() {
  const { t, loggedIn } = useApp();
  const [filter, setFilter] = useState("الكل");
  const [showActiveOrder, setShowActiveOrder] = useState(true);
  const menu = filterMenu(filter);
  const activeOrder = orders.find((order) => order.status === "preparing");

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

        <div className="hide-scrollbar -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:hidden">
          {homeCategoryOrder.map((id) => {
            const category = categoriesById[id];
            const active = id === "burger";
            return (
              <Link
                key={id}
                href="/categories"
                className="flex w-[60px] shrink-0 flex-col items-center gap-2 text-center"
              >
                <span
                  className={`grid size-[60px] place-items-center rounded-full border-2 bg-white transition ${
                    active ? "border-brand shadow-[0_10px_24px_-14px_rgba(232,69,44,0.7)]" : "border-[#ece0d4]"
                  }`}
                >
                  <span className="relative size-12 overflow-hidden rounded-full">
                    <Image src={category.image} alt={t(category.name)} fill sizes="48px" className="object-cover" />
                  </span>
                </span>
                <span className={`whitespace-nowrap text-[10px] font-bold ${active ? "text-brand" : "text-ink"}`}>{t(category.name)}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 hidden grid-cols-7 gap-3 lg:grid">
          {desktopCategoryOrder.map((id) => {
            const category = categoriesById[id];
            const active = id === "burger";
            return (
              <Link
                key={id}
                href="/categories"
                className={`flex flex-col items-center rounded-2xl border-2 bg-white px-2 py-4 text-center transition hover:-translate-y-1 hover:shadow-soft ${
                  active ? "border-brand" : "border-transparent"
                }`}
              >
                <span className="relative size-14 overflow-hidden rounded-full bg-cream-50">
                  <Image src={category.image} alt={t(category.name)} fill sizes="56px" className="object-cover" />
                </span>
                <span className={`mt-3 text-sm font-bold ${active ? "text-brand" : "text-ink"}`}>{t(category.name)}</span>
                <span className="mt-0.5 text-[10px] text-muted">{category.count} {t("صنف")}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="shell mt-7 lg:mt-10">
        <SectionTitle
          title="الأكثر طلباً"
          icon={<Flame className="size-5 fill-brand/20 text-brand lg:size-6" />}
          action={{ label: "عرض الكل", href: "/categories", icon: <LayoutGrid className="size-4" /> }}
        />
        <div className="mt-3 grid grid-cols-2 gap-3 lg:mt-5 lg:grid-cols-5 lg:gap-4">
          {products
            .filter((product) => product.category === "burger")
            .slice(0, 4)
            .map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}

          <div className="relative hidden overflow-hidden rounded-[26px] bg-[#e8452c] p-5 text-white shadow-soft lg:block">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-14 -left-8 size-40 rounded-full bg-[#f6a723]/25" />
            <div className="relative flex h-full flex-col justify-between">
              <span className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur">
                <Sparkles className="size-5" />
              </span>
              <div className="mt-10">
                <p className="text-[11px] font-semibold text-white/80">{t("عرض محدود")}</p>
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
            <MobileOrderTrackingBanner order={activeOrder} onClose={() => setShowActiveOrder(false)} />
            <DesktopOrderTrackingCard order={activeOrder} onClose={() => setShowActiveOrder(false)} />
          </>
        ) : null}
      </section>

      <section className="shell mt-8 lg:mt-11">
        <SectionTitle
          title="قائمة الطعام"
          icon={<ListFilter className="size-5 text-brand lg:size-6" />}
          action={{ label: "عرض الكل", href: "/categories" }}
        />

        <div className="mt-4 hidden lg:block">
          <MenuFilters filters={menuFilters} value={filter} onChange={setFilter} />
        </div>

        <div className="mt-3 grid gap-3 lg:mt-5 lg:grid-cols-2 lg:gap-4">
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

      <div className="shell mt-6 lg:mt-10">
        <CartBar />
      </div>

      <section className="shell mt-12 hidden lg:block">
        <div
          className="relative overflow-hidden rounded-[32px] p-10"
          style={{ backgroundImage: "linear-gradient(285deg, #fce2d8 0%, #f8cdbc 55%, #f4b19a 100%)" }}
        >
          <div className="absolute -right-16 -top-24 size-72 rounded-full bg-white/35 blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-[#e8452c]/10 blur-2xl" />
          <div className="relative grid grid-cols-[1fr_auto] items-center gap-10">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3.5 py-1.5 text-[11px] font-bold text-ink/70">
                <Smartphone className="size-3.5 text-brand" />
                {t("ناوي أوردرز")}
              </span>
              <h2 className="mt-4 text-[36px] font-extrabold leading-[1.3]">
                {t("احصل على طعامك")}
                <br />
                {t("المفضل بلمسة واحدة")}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-ink/60">
                {t("حمّل التطبيق عشان تحصل على عروض حصرية، وتتبع طلبك لحظة بلحظة، وتوصيل أسرع على مزاجك.")}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="flex h-12 items-center gap-3 rounded-xl bg-[#1f1a16] px-5 text-white transition hover:bg-black"
                >
                  <span className="text-lg leading-none"></span>
                  <span className="text-start leading-tight">
                    <span className="block text-[9px] text-white/70">{t("حمل من")}</span>
                    <span className="text-sm font-bold">{t("متجر آبل")}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="flex h-12 items-center gap-3 rounded-xl bg-[#1f1a16] px-5 text-white transition hover:bg-black"
                >
                  <Download className="size-5" />
                  <span className="text-start leading-tight">
                    <span className="block text-[9px] text-white/70">{t("حمل من")}</span>
                    <span className="text-sm font-bold">{t("جوجل بلاي")}</span>
                  </span>
                </button>
                <InstallButton />
              </div>
            </div>
            <PhoneMockup />
          </div>
        </div>
      </section>
    </div>
  );
}
