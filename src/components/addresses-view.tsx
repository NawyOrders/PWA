"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  Crosshair,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AccountSidebar } from "@/components/account-sidebar";
import { AddressKindIcon } from "@/components/address-icon";
import { LeafletMap, type MapMarker } from "@/components/leaflet-map";
import { useApp } from "@/components/providers";
import { Breadcrumbs, DisplayPageHeader } from "@/components/ui";
import { areaName, type LatLng } from "@/lib/geo";

const ALEXANDRIA: [number, number] = [31.1861, 29.9336];

export function AddressesView() {
  const router = useRouter();
  const { addresses, removeAddress, selectedAddressId, selectAddress, toast, t, lang } = useApp();
  const [center, setCenter] = useState<[number, number]>(ALEXANDRIA);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);

  const selected = addresses.find((item) => item.id === selectedAddressId) ?? null;

  const markers = useMemo<MapMarker[]>(
    () =>
      addresses.map((item) => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        variant: "drop",
        glyph: item.kind === "home" || item.kind === "family" ? "home" : item.kind === "work" ? "store" : "fork",
        active: item.id === selectedAddressId,
      })),
    [addresses, selectedAddressId],
  );

  const focus = (point: LatLng) => setCenter([point.lat, point.lng]);

  const runSearch = () => {
    const term = query.trim().toLowerCase();
    if (!term) return;
    const match = addresses.find(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.area.toLowerCase().includes(term) ||
        item.detail.toLowerCase().includes(term),
    );
    if (match) {
      selectAddress(match.id);
      focus(match);
      toast(t("تم تحديد الموقع على الخريطة"), "info");
      return;
    }
    toast(t("مفيش نتيجة مطابقة، جرّب اسم منطقة تاني"), "info");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast(t("متصفحك مش بيدعم تحديد الموقع"), "info");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        focus({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast(t("تم تحديد موقعك الحالي على الخريطة"), "info");
      },
      () => {
        setLocating(false);
        toast(t("مقدرناش نحدد موقعك، حرك الخريطة بنفسك"), "info");
      },
      { timeout: 8000 },
    );
  };

  const saveChanges = () => {
    toast(t("تم حفظ التغييرات"), "info");
    router.push("/checkout/delivery");
  };

  return (
    <div className="pb-10">
      <DisplayPageHeader title="العناوين الخاصة بك" subtitle="ادارة عناوين التواصل الخاصة بك" backHref="/profile" />

      <div className="shell">
        <div className="hidden items-center justify-between lg:flex lg:pt-8">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "العناوين المحفوظة" },
            ]}
          />
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
          >
            {t("العودة لحسابي")}
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        </div>

        <div className="hidden pt-4 lg:block">
          <h1 className="text-[32px] font-extrabold">{t("حسابي")}</h1>
          <p className="mt-2 text-sm text-muted">{t("كل تفاصيلك في مكان واحد، لطلب أسهل كل مرة.")}</p>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-5 lg:mt-7 lg:flex-row lg:items-start lg:justify-end">
          <AccountSidebar active="/addresses" />

          <div className="min-w-0 flex-1 space-y-4">
            <div className="card hidden p-5 lg:block">
              <h2 className="text-center text-lg font-extrabold">{t("عناوينك المحفوظة")}</h2>
              <div className="mt-5 space-y-3">
                {addresses.map((item) => {
                  const active = item.id === selectedAddressId;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-4 transition ${
                        active ? "border-brand/60 bg-brand-soft/25" : "border-line hover:border-brand/30"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => removeAddress(item.id)}
                        aria-label={t("حذف {name}", { name: t(item.title) })}
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-brand transition hover:bg-brand-soft"
                      >
                        <Trash2 className="size-[17px]" strokeWidth={1.9} />
                      </button>
                      <button
                        type="button"
                        onClick={() => focus(item)}
                        className="min-w-0 flex-1 text-start"
                      >
                        <span className="block text-sm font-extrabold">{t(item.title)}</span>
                        <span className="mt-1 block truncate text-[11px] text-muted">
                          {t(item.area)}
                          {lang === "ar" ? "، " : ", "}
                          {t(item.detail)}
                        </span>
                        {item.lastUsed ? (
                          <span className="mt-1.5 flex items-center gap-1 text-[10px] text-muted">
                            <CalendarDays className="size-3" />
                            {t(item.lastUsed)}
                          </span>
                        ) : null}
                      </button>
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                          active ? "bg-brand text-white" : "bg-cream text-ink/70"
                        }`}
                      >
                        <AddressKindIcon kind={item.kind} />
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/addresses/new"
                className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d9c8b8] text-sm font-extrabold text-ink/80 transition hover:border-brand/60 hover:text-brand"
              >
                <Plus className="size-5" strokeWidth={2.3} />
                {t("اضافة عنوان جديد")}
              </Link>
            </div>

            <div className="card overflow-hidden p-3 lg:hidden">
              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted">{t("لا يوجد عناوين سابقة")}</p>
                ) : (
                  addresses.map((item) => {
                    const active = item.id === selectedAddressId;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-2xl border-2 p-4 transition ${
                          active ? "border-brand/50 bg-brand-soft/25" : "border-line bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => removeAddress(item.id)}
                          aria-label={t("حذف {name}", { name: t(item.title) })}
                          className="grid size-10 shrink-0 place-items-center rounded-xl text-brand transition hover:bg-brand-soft"
                        >
                          <Trash2 className="size-[18px]" strokeWidth={1.9} />
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAddress(item.id)}
                          className="min-w-0 flex-1 text-start"
                        >
                          <span className="block text-sm font-extrabold">{t(item.title)}</span>
                          <span className="mt-1 block truncate text-[11px] text-muted">
                            {t(item.area)}
                            {lang === "ar" ? "، " : ", "}
                            {t(item.detail)}
                          </span>
                        </button>
                        <span
                          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                            active ? "bg-brand text-white" : "bg-brand-soft text-brand"
                          }`}
                        >
                          <AddressKindIcon kind={item.kind} />
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <Link
                href="/addresses/new"
                className="mt-3 flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand/60 bg-brand-soft/20 text-base font-extrabold text-brand"
              >
                <Plus className="size-5" strokeWidth={2.4} />
                {t("اضف عنوان جديد")}
              </Link>

              <button
                type="button"
                onClick={saveChanges}
                className="btn-gradient mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-[0_18px_34px_-18px_rgba(232,69,44,0.95)]"
              >
                {t("حفظ التغييرات")}
              </button>
            </div>

            <div className="card hidden overflow-hidden p-3 lg:block">
              <div className="relative h-[420px] overflow-hidden rounded-[22px]">
                <LeafletMap
                  ariaLabel={t("خريطة العناوين المحفوظة")}
                  center={center}
                  zoom={13}
                  theme="light"
                  markers={markers}
                  className="absolute inset-0"
                  onPick={(point) => setCenter([point.lat, point.lng])}
                  onMarkerClick={(id) => {
                    const item = addresses.find((address) => address.id === id);
                    if (item) focus(item);
                  }}
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] p-3">
                  <div className="pointer-events-auto relative">
                    <Search className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          runSearch();
                        }
                      }}
                      placeholder={t("ابحث عن عنوان أو موقع")}
                      aria-label={t("ابحث عن عنوان أو موقع")}
                      className="h-12 w-full rounded-2xl border-0 bg-white pe-11 ps-4 text-xs font-semibold shadow-pop outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/20"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label={t("إلغاء")}
                        className="absolute start-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-cream hover:text-brand"
                      >
                        <X className="size-4" strokeWidth={2.4} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={useMyLocation}
                  className="absolute bottom-[74px] start-3 z-[600] flex h-11 items-center gap-2 rounded-full bg-brand px-4 text-[11px] font-bold text-white shadow-[0_14px_26px_-14px_rgba(232,69,44,1)] transition hover:bg-brand-dark"
                >
                  <Crosshair className={`size-4 ${locating ? "animate-pulse-soft" : ""}`} />
                  {t("استخدم موقعي الحالي")}
                </button>

                <div className="absolute inset-x-3 bottom-3 z-[600] flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 text-[11px] font-bold shadow-pop">
                  <MapPin className="size-4 shrink-0 text-brand" />
                  <span className="line-1 flex-1">
                    {selected
                      ? `${t(selected.area)}${lang === "ar" ? "، " : ", "}${t(selected.detail)}`
                      : areaName({ lat: center[0], lng: center[1] }, lang)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {addresses.length === 0 ? (
          <p className="mt-6 text-center text-[11px] text-muted">
            {t("مفيش عناوين محفوظة، ")}
            <Link href="/addresses/new" className="font-bold text-brand">
              {t("اضف عنوان جديد")}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
