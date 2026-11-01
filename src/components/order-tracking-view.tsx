"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Bike,
  Check,
  ChevronLeft,
  Clock3,
  Home,
  MapPin,
  Phone,
  Star,
  Store,
  type LucideProps,
} from "lucide-react";
import { LeafletMap, type MapMarker } from "@/components/leaflet-map";
import { useApp } from "@/components/providers";
import { Breadcrumbs } from "@/components/ui";
import {
  courier,
  courierPosition,
  destinationPosition,
  kitchenPosition,
  trackingEta,
  trackingRoute,
  trackingSteps,
} from "@/lib/account-data";
import { formatPrice, user, type Order } from "@/lib/data";

const stepIcons: Record<string, React.ComponentType<LucideProps>> = {
  check: Check,
  store: Store,
  bike: Bike,
  home: Home,
};

const COMPLETED_STEPS = 2;
const TRACK_INSET = 12.5;
const TRACK_SPAN = 100 - TRACK_INSET * 2;

export function OrderTrackingView({ order }: { order: Order }) {
  const { t, lang } = useApp();
  const [liveEta, setLiveEta] = useState(12);

  const markers: MapMarker[] = [
    { id: "kitchen", lat: kitchenPosition.lat, lng: kitchenPosition.lng, variant: "pin", glyph: "fork" },
    {
      id: "courier",
      lat: courierPosition.lat,
      lng: courierPosition.lng,
      variant: "courier",
      label:
        lang === "ar"
          ? `على الوصول ${liveEta} دقيقة`
          : `Arriving in ${liveEta} min`,
      active: true,
    },
    { id: "home", lat: destinationPosition.lat, lng: destinationPosition.lng, variant: "pin", glyph: "home" },
  ];

  const progress = (COMPLETED_STEPS / (trackingSteps.length - 1)) * TRACK_SPAN;

  return (
    <div className="pb-10">
      <div className="shell lg:pt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "طلباتي", href: "/orders" },
            ]}
          />
          <Link
            href="/orders"
            className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
          >
            {t("العودة لطلباتي")}
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        </div>

        <div className="mt-4 lg:mt-3">
          <h1 className="text-[26px] font-extrabold lg:text-[32px]">{t("تتبع الطلب")}</h1>
          <p className="mt-2 text-sm text-muted">{t("تابع طلبك الحالي وارجع لكل طلباتك السابقة في مكان واحد.")}</p>
        </div>

        <div className="mt-5 space-y-4 lg:mt-7 lg:space-y-5">
          <div className="card flex items-center justify-between gap-3 px-5 py-4">
            <span className="text-sm font-bold text-ink lg:text-base">{t("وقت الوصول المتوقع")}</span>
            <span className="text-xl font-extrabold text-brand lg:text-2xl">{t(trackingEta)}</span>
          </div>

          <div className="card overflow-hidden p-2.5 lg:p-3">
            <div className="relative h-[240px] overflow-hidden rounded-[22px] lg:h-[320px]">
              <LeafletMap
                ariaLabel={t("خريطة تتبع مسار الطلب")}
                center={[courierPosition.lat, courierPosition.lng]}
                zoom={14}
                theme="light"
                markers={markers}
                routes={[{ id: "route", positions: trackingRoute, width: 6 }]}
                fitToContent
                className="absolute inset-0"
                onMarkerClick={(id) => {
                  if (id === "courier") setLiveEta((value) => (value > 1 ? value - 1 : 12));
                }}
              />
            </div>
          </div>

          <div className="card p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-peach ring-2 ring-brand/25">
                <Image src="/images/avatar.webp" alt={t(courier.name)} fill sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold lg:text-base">{t(courier.name)}</p>
                <p className="mt-0.5 text-[11px] text-muted">{t(courier.role)}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                  <Star className="size-3.5 fill-gold text-gold" />
                  {courier.rating}
                  <span className="font-normal text-muted">({courier.ratingCount})</span>
                </p>
              </div>
              <a
                href="tel:19885"
                aria-label={t("اتصل بالمندوب")}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-brand/30 text-brand transition hover:bg-brand-soft"
              >
                <Phone className="size-[18px]" strokeWidth={1.9} />
              </a>
            </div>

            <div className="relative mt-7">
              <span
                className="absolute top-5 h-[3px] rounded-full bg-line lg:top-[22px]"
                style={{ insetInlineStart: `${TRACK_INSET}%`, width: `${TRACK_SPAN}%` }}
              />
              <span
                className="absolute top-5 h-[3px] rounded-full bg-brand transition-[width] duration-500 lg:top-[22px]"
                style={{ insetInlineStart: `${TRACK_INSET}%`, width: `${progress}%` }}
              />
              <ol className="relative flex">
                {trackingSteps.map((step, index) => {
                  const Icon = stepIcons[step.icon];
                  const done = index < COMPLETED_STEPS;
                  const next = index === COMPLETED_STEPS;
                  return (
                    <li key={step.id} className="flex flex-1 flex-col items-center gap-2 text-center">
                      <span
                        className={`grid size-10 place-items-center rounded-full border-2 bg-white transition lg:size-11 ${
                          done
                            ? "border-brand bg-brand text-white"
                            : next
                              ? "border-brand text-brand"
                              : "border-[#d8c9bc] text-muted"
                        }`}
                      >
                        <Icon className="size-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className={`text-[11px] font-bold ${done || next ? "text-ink" : "text-muted"}`}>
                        {t(step.label)}
                      </span>
                      <span className="text-[10px] text-muted" dir="ltr">
                        {step.time}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="card p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-extrabold lg:text-base">
                {t("طلب رقم")} {order.id}
              </span>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold text-brand">
                {t("قيد التحضير")}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-peach">
                <Image src={order.image} alt={t(order.title)} fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{t(order.title)}</p>
                <p className="mt-0.5 text-[11px] text-muted">{t(order.description)}</p>
                <p className="mt-1 text-[10px] text-muted">{t(order.date)}</p>
              </div>
              <span className="whitespace-nowrap text-sm font-extrabold text-brand">
                {formatPrice(order.total)} <span className="text-[10px]">{t("جنيه")}</span>
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-xs text-muted">{t("إجمالي الطلب")}</span>
              <span className="text-lg font-extrabold">
                {formatPrice(order.total)} <span className="text-[11px] font-bold">{t("ج.م")}</span>
              </span>
            </div>
          </div>

          <div className="card flex items-center gap-3 p-4 lg:p-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold lg:text-base">{t("التوصيل لعنوانك المحدد")}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">{t(user.fullAddress)}</p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-brand">
              <MapPin className="size-5" strokeWidth={1.9} />
            </span>
          </div>

          <div className="card flex items-center gap-2 px-4 py-3.5 text-[11px] font-semibold text-muted">
            <Clock3 className="size-4 text-brand" />
            {t("لو الطلب اتأخر أكتر من 15 دقيقة، كلمنا على 19885 وهنتدخل فوراً.")}
          </div>

          <a
            href="tel:19885"
            className="btn-gradient flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold text-white shadow-[0_18px_34px_-18px_rgba(232,69,44,0.95)]"
          >
            <Phone className="size-5" strokeWidth={2.1} />
            {t("اتصل بالمطعم")}
          </a>
        </div>
      </div>
    </div>
  );
}
