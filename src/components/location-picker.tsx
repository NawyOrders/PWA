"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Home,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { LeafletMap } from "@/components/leaflet-map";
import { useApp } from "@/components/providers";
import { Chip } from "@/components/ui";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useMapPlaces, useReversePlaceName } from "@/hooks/use-map-places";
import type { AddressKind } from "@/lib/account-data";
import { areaName } from "@/lib/geo";

const ALEXANDRIA: [number, number] = [31.1861, 29.9336];

type Stage = "sheet" | "map" | "form";

const placeTypes = [
  { id: "apartment", label: "شقة", kind: "home" as AddressKind, icon: Building2 },
  { id: "villa", label: "فيلا", kind: "family" as AddressKind, icon: Home },
  { id: "office", label: "مكتب", kind: "work" as AddressKind, icon: Briefcase },
];

type Draft = {
  typeId: string;
  building: string;
  floor: string;
  apartment: string;
  street: string;
  landmark: string;
  label: string;
};

const emptyDraft: Draft = {
  typeId: "apartment",
  building: "",
  floor: "",
  apartment: "",
  street: "",
  landmark: "",
  label: "",
};

/** Labelled input with the filled/empty tick badge shown in the address form. */
function DetailsField({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <label className={`block ${className}`.trim()}>
      <span className="mb-1.5 block text-[11px] font-semibold text-muted lg:text-ink/70">{label}</span>
      <span className="relative block">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="field h-12 pe-11 text-sm font-bold"
        />
        <span
          aria-hidden="true"
          className={`absolute end-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full transition ${
            filled ? "bg-ink text-white" : "border border-line bg-cream-50 text-transparent"
          }`}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      </span>
    </label>
  );
}

/**
 * Delivery-location picker: bottom sheet with saved addresses on mobile and a
 * centered dialog on desktop. Stages: pick from saved list, drop a pin on the
 * map, then fill address details before saving.
 */
export function LocationPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, addresses, selectedAddressId, selectAddress, addAddress, toast } = useApp();
  const [stage, setStage] = useState<Stage>("sheet");
  const [center, setCenter] = useState<[number, number]>(ALEXANDRIA);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const rootRef = useDialogFocus<HTMLDivElement>(open, onClose);

  const selected = addresses.find((item) => item.id === selectedAddressId) ?? null;
  const regionLabel = useReversePlaceName(
    { lat: center[0], lng: center[1] },
    lang,
    areaName({ lat: center[0], lng: center[1] }, lang),
    open && stage !== "sheet",
  );

  useEffect(() => {
    if (!open) return;
    setStage("sheet");
    setQuery("");
    setDraft(emptyDraft);
    const base = selected ?? addresses[0];
    setCenter(base ? [base.lat, base.lng] : ALEXANDRIA);
    // Only reset when the picker opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { places: suggestions, searchNow, searching } = useMapPlaces(query, addresses, lang, t);

  const close = () => {
    setStage("sheet");
    onClose();
  };

  const pickSaved = (id: string) => {
    const item = addresses.find((address) => address.id === id);
    selectAddress(id);
    if (item) toast(t("تم اختيار {name} لعنوان التوصيل", { name: t(item.title) }), "info");
    close();
  };

  const locate = (next: (lat: number, lng: number) => void) => {
    if (!navigator.geolocation) {
      toast(t("متصفحك مش بيدعم تحديد الموقع"), "info");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        next(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        toast(t("مقدرناش نحدد موقعك، حرك الخريطة بنفسك"), "info");
      },
      { timeout: 8000 },
    );
  };

  const openMap = () => setStage("map");

  const useCurrentLocation = () => {
    locate((lat, lng) => {
      setCenter([lat, lng]);
      setStage("map");
      toast(t("تم تحديد موقعك الحالي على الخريطة"), "info");
    });
  };

  const runSearch = async () => {
    const match = suggestions[0] ?? (await searchNow(query))[0];
    if (match) {
      setCenter([match.lat, match.lng]);
      setQuery("");
      return;
    }
    if (query.trim()) toast(t("مفيش نتيجة مطابقة، جرّب اسم منطقة تاني"), "info");
  };

  const confirmMap = () => {
    setDraft((current) => ({ ...current, label: current.label || "" }));
    setStage("form");
  };

  const discardForm = () => {
    setDraft(emptyDraft);
    setStage("sheet");
  };

  const save = () => {
    const type = placeTypes.find((item) => item.id === draft.typeId) ?? placeTypes[0];
    const title = draft.label.trim() || t(type.label);
    const parts = [
      draft.street.trim(),
      draft.building.trim() ? `${t("عمارة")} ${draft.building.trim()}` : "",
      draft.floor.trim() ? `${t("الدور")} ${draft.floor.trim()}` : "",
      draft.apartment.trim() ? `${t("شقة")} ${draft.apartment.trim()}` : "",
      draft.landmark.trim(),
    ].filter(Boolean);
    const point = { lat: center[0], lng: center[1] };
    const id = `addr-${Date.now()}`;
    addAddress({
      id,
      title,
      detail: parts.join(" - ") || regionLabel,
      area: regionLabel,
      kind: type.kind,
      lat: point.lat,
      lng: point.lng,
    });
    selectAddress(id);
    close();
  };

  if (!open) return null;

  const updateDraft = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <div ref={rootRef} className="fixed inset-0 z-[120]">
      {/* Sheet stage */}
      {stage === "sheet" ? (
        <div
          className="motion-overlay absolute inset-0 flex items-end justify-center bg-ink/55 backdrop-blur-sm lg:items-center lg:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-picker-title"
            className="motion-pop max-h-[86dvh] w-full overflow-y-auto overscroll-contain rounded-t-[32px] bg-white px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 shadow-pop lg:max-w-[440px] lg:rounded-[28px] lg:px-6 lg:pt-5"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-line lg:hidden" aria-hidden="true" />

            <div className="mt-4 flex items-center justify-between gap-3">
              <h2 id="location-picker-title" className="text-lg font-extrabold text-ink lg:text-xl">
                {t("اختر مكان التوصيل")}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={t("إغلاق")}
                className="motion-press grid size-10 place-items-center rounded-full border border-line bg-white text-ink shadow-soft transition hover:rotate-90 hover:border-brand/40 hover:text-brand"
              >
                <X className="size-4" strokeWidth={2.4} />
              </button>
            </div>

            {addresses.length > 0 ? (
              <>
                <p className="mt-1 text-xs font-semibold text-muted">{t("العنواين المحفوظة")}</p>
                <ul className="motion-stagger mt-2">
                  {addresses.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => pickSaved(item.id)}
                        aria-pressed={item.id === selectedAddressId}
                        className="flex w-full items-center gap-3 border-b border-line/70 py-3.5 text-start transition last:border-b-0 hover:bg-cream-50/60"
                      >
                        <MapPin className="size-[18px] shrink-0 text-ink/70" strokeWidth={1.9} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold text-ink">{t(item.title)}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted">
                            {t(item.area)}
                            {lang === "ar" ? "، " : ", "}
                            {t(item.detail)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="my-4 border-t border-line" aria-hidden="true" />
              </>
            ) : null}

            <div className="space-y-3">
              <button
                type="button"
                onClick={openMap}
                className="motion-press flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-start shadow-soft transition hover:border-brand/40"
              >
                <MapPin className="size-[18px] shrink-0 text-ink/70" strokeWidth={1.9} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-ink">{t("التوصيل لمكان اخر")}</span>
                  <span className="mt-0.5 block text-[11px] text-muted">{t("حدد المكان علي الخريطة")}</span>
                </span>
                <ChevronLeft className="size-[18px] shrink-0 text-ink/60 ltr:rotate-180" strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={useCurrentLocation}
                className="motion-press flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-start shadow-soft transition hover:border-brand/40"
              >
                <Crosshair className={`size-[18px] shrink-0 text-ink/70 ${locating ? "animate-pulse-soft" : ""}`} strokeWidth={1.9} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-ink">{t("التوصيل لمكانك الحالي")}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{regionLabel}</span>
                </span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Map stage */}
      {stage === "map" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("حدد مكان التوصيل على الخريطة")}
          className="absolute inset-0 bg-white lg:flex lg:items-center lg:justify-center lg:bg-ink/55 lg:p-6 lg:backdrop-blur-sm"
        >
          <div className="relative h-full w-full overflow-hidden lg:h-[600px] lg:max-w-3xl lg:rounded-[28px] lg:shadow-pop">
            <LeafletMap
              ariaLabel={t("خريطة تحديد مكان التوصيل")}
              center={center}
              zoom={15}
              theme="light"
              className="absolute inset-0"
              onPick={(point) => setCenter([point.lat, point.lng])}
            />

            <span className="nawy-center-pin" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v6a2 2 0 0 0 4 0V2M6 2v20M14 2c-1.7 0-3 2-3 5s1.3 4 3 4v11" />
              </svg>
            </span>
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 z-[500] whitespace-nowrap rounded-xl bg-[#201713] px-3.5 py-2 text-xs font-bold text-white shadow-pop"
              style={{ transform: "translate(-50%, calc(-100% - 34px))" }}
            >
              {t("طلبك هيوصل هنا")}
              <span className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-[#201713]" aria-hidden="true" />
            </span>

            <div className="absolute inset-x-0 top-0 z-[600] flex items-center gap-3 p-4">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ink/60" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      runSearch();
                    }
                  }}
                  placeholder={t("ابحث عن موقع")}
                  aria-label={t("ابحث عن موقع")}
                  className="h-12 w-full rounded-full border-0 bg-white/95 pe-4 ps-11 text-sm font-semibold text-ink shadow-pop outline-none backdrop-blur placeholder:text-muted focus:ring-2 focus:ring-brand/20"
                />
                {query.trim() ? (
                  <ul className="mt-2 max-h-60 overflow-y-auto rounded-2xl bg-white shadow-pop">
                    {suggestions.map((item) => {
                      const Icon = item.saved ? Building2 : MapPin;
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            onClick={() => {
                              setCenter([item.lat, item.lng]);
                              setQuery("");
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-cream-50"
                          >
                            <Icon className="size-4 shrink-0 text-brand" strokeWidth={1.9} />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold">{t(item.title)}</span>
                              <span className="block truncate text-[10px] text-muted">{t(item.subtitle)}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                    {suggestions.length === 0 ? (
                      <li className="flex justify-center px-4 py-3 text-[11px] font-semibold text-muted">
                        {searching ? <LoaderCircle className="size-4 animate-spin" aria-label={t("البحث")} /> : t("مفيش نتيجة مطابقة")}
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setStage("sheet")}
                aria-label={t("إغلاق")}
                className="motion-press grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-pop transition hover:rotate-90 hover:text-brand"
              >
                <X className="size-4" strokeWidth={2.4} />
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-[600] rounded-t-[28px] bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-pop lg:rounded-b-[28px] lg:p-5">
              <div className="flex items-center gap-2.5">
                <MapPin className="size-5 shrink-0 text-brand" strokeWidth={2} />
                <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">{regionLabel}</span>
              </div>
              <button
                type="button"
                onClick={confirmMap}
                className="btn-gradient motion-press mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-[0_18px_34px_-18px_rgba(232,69,44,0.95)]"
              >
                {t("تأكيد العنوان")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Form stage */}
      {stage === "form" ? (
        <div className="absolute inset-0 overflow-y-auto overscroll-contain bg-cream-50 lg:flex lg:items-center lg:justify-center lg:overflow-hidden lg:bg-ink/55 lg:backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-details-title"
            className="min-h-full w-full pb-8 lg:flex lg:max-h-[90dvh] lg:min-h-0 lg:max-w-xl lg:flex-col lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-line lg:bg-cream-50 lg:shadow-pop"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between bg-cream-50/95 px-4 pb-3 pt-5 backdrop-blur lg:static lg:shrink-0 lg:border-b lg:border-line lg:bg-white lg:px-6 lg:py-4 lg:backdrop-blur-none">
              <button
                type="button"
                onClick={() => setStage("map")}
                aria-label={t("رجوع")}
                className="motion-press grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-soft transition hover:text-brand"
              >
                <ChevronRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
              </button>
              <h2 id="address-details-title" className="text-lg font-extrabold text-ink">
                {t("تفاصيل العنوان")}
              </h2>
              <button
                type="button"
                onClick={discardForm}
                className="motion-press shrink-0 rounded-full border border-brand/40 bg-white px-4 py-2 text-xs font-bold text-brand transition hover:bg-brand-soft"
              >
                {t("ازالة")}
              </button>
            </header>

            <div className="px-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:pb-8 location-picker-scrollbar">
              <div className="relative h-44 overflow-hidden rounded-2xl border border-line shadow-soft">
                <LeafletMap
                  ariaLabel={t("معاينة موقع العنوان")}
                  center={center}
                  zoom={15}
                  theme="light"
                  interactive={false}
                  className="absolute inset-0"
                />
                <span className="nawy-center-pin" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 2v6a2 2 0 0 0 4 0V2M6 2v20M14 2c-1.7 0-3 2-3 5s1.3 4 3 4v11" />
                  </svg>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
                <MapPin className="size-[18px] shrink-0 text-ink/70" strokeWidth={1.9} />
                <span className="min-w-0 flex-1 text-start">
                  <span className="block text-[11px] font-semibold text-muted">{t("المنطقة")}</span>
                  <span className="mt-0.5 block truncate text-sm font-extrabold text-ink">{regionLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setStage("map")}
                  className="shrink-0 text-xs font-bold text-brand transition hover:text-brand-dark"
                >
                  {t("تغيير")}
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                {placeTypes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Chip
                      key={item.id}
                      selected={draft.typeId === item.id}
                      onClick={() => updateDraft({ typeId: item.id })}
                      className="flex-1"
                      aria-label={t(item.label)}
                    >
                      <Icon className="size-4" strokeWidth={1.9} />
                      {t(item.label)}
                    </Chip>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                <DetailsField
                  label={t("اسم العقار")}
                  value={draft.building}
                  onChange={(value) => updateDraft({ building: value })}
                  placeholder={t("مثال: 12331")}
                />

                <div className="grid grid-cols-2 gap-3">
                  <DetailsField
                    label={t("الدور")}
                    value={draft.floor}
                    onChange={(value) => updateDraft({ floor: value })}
                  />
                  <DetailsField
                    label={t("رقم الشقة")}
                    value={draft.apartment}
                    onChange={(value) => updateDraft({ apartment: value })}
                  />
                </div>

                <DetailsField
                  label={t("الشارع")}
                  value={draft.street}
                  onChange={(value) => updateDraft({ street: value })}
                />

                <DetailsField
                  label={t("علامة مميزة")}
                  value={draft.landmark}
                  onChange={(value) => updateDraft({ landmark: value })}
                  placeholder={t("مثال: كلب بلدي تحت العمارة")}
                />

                <DetailsField
                  label={t("اسم العنوان")}
                  value={draft.label}
                  onChange={(value) => updateDraft({ label: value.slice(0, 24) })}
                  placeholder={t("مثال: البيت")}
                />
              </div>

              <p className="mt-3 text-[10px] leading-5 text-muted">
                {t("اختار اسم العنوان لحفظه لكي يختار بينهم بسهولة مثل (المنزل , المكتب)")}
              </p>

              <button
                type="button"
                onClick={save}
                className="btn-gradient motion-press mt-5 flex h-14 w-full items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-[0_18px_34px_-18px_rgba(232,69,44,0.95)]"
              >
                {t("حفظ العنوان")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
