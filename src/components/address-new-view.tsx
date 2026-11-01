"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  ChevronLeft,
  Crosshair,
  Home,
  MapPin,
  MapPinOff,
  Navigation,
  Pencil,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react";
import { LeafletMap, type MapMarker } from "@/components/leaflet-map";
import { useApp } from "@/components/providers";
import { Breadcrumbs } from "@/components/ui";
import { addressKinds, savedAddresses, type AddressKind, type SavedAddress } from "@/lib/account-data";
import { areaName, distanceKm, formatCoords, type LatLng } from "@/lib/geo";

const ALEXANDRIA: [number, number] = [31.1861, 29.9336];

const kindIcon: Record<AddressKind, typeof Home> = {
  home: Home,
  work: Briefcase,
  family: Store,
  cafe: Store,
  other: MapPin,
};

export function AddressNewView() {
  const router = useRouter();
  const { addresses, selectedAddressId, selectAddress, addAddress, toast, t, lang } = useApp();

  const [center, setCenter] = useState<[number, number]>(ALEXANDRIA);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [kind, setKind] = useState<AddressKind>("home");
  const [customLabel, setCustomLabel] = useState("");
  const [detail, setDetail] = useState("");
  const skipNextPick = useRef(false);

  const selected = addresses.find((item) => item.id === selectedAddressId) ?? null;
  const pinLabel = pin ? areaName(pin, lang) : "";

  useEffect(() => {
    if (!selected) return;
    const locationChanged = selected.lat !== center[0] || selected.lng !== center[1];
    if (locationChanged) {
      skipNextPick.current = true;
      setCenter([selected.lat, selected.lng]);
    }
    setPin((current) =>
      current?.lat === selected.lat && current.lng === selected.lng
        ? current
        : { lat: selected.lat, lng: selected.lng },
    );
  }, [selected, center]);

  useEffect(() => {
    if (mode !== "form") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMode("list");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);
  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return savedAddresses.filter(
      (item) =>
        [item.title, item.area, item.detail].some(
          (value) => value.toLowerCase().includes(term) || t(value).toLowerCase().includes(term),
        ),
    );
  }, [query, lang, t]);

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

  const handlePick = (point: LatLng) => {
    if (skipNextPick.current) {
      skipNextPick.current = false;
      return;
    }
    setPin(point);
    setCenter([point.lat, point.lng]);
    if (selected && distanceKm(selected, point) > 0.03) selectAddress(null);
  };

  const pickAddress = (item: SavedAddress) => {
    skipNextPick.current = true;
    setPin({ lat: item.lat, lng: item.lng });
    selectAddress(item.id);
    setMode("list");
    setCenter([item.lat, item.lng]);
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
        skipNextPick.current = true;
        selectAddress(null);
        setPin({ lat: position.coords.latitude, lng: position.coords.longitude });
        setCenter([position.coords.latitude, position.coords.longitude]);
        toast(t("تم تحديد موقعك الحالي على الخريطة"), "info");
      },
      () => {
        setLocating(false);
        toast(t("مقدرناش نحدد موقعك، حرك الخريطة بنفسك"), "info");
      },
      { timeout: 8000 },
    );
  };

  const runSearch = () => {
    const term = query.trim().toLowerCase();
    if (!term) return;
    const match = suggestions[0];
    if (match) {
      pickAddress(match);
      toast(t("تم تحديد الموقع على الخريطة"), "info");
      return;
    }
    toast(t("مفيش نتيجة مطابقة، جرّب اسم منطقة تاني"), "info");
  };

  const openForm = () => {
    setKind("home");
    setCustomLabel("");
    setDetail("");
    setMode("form");
    if (!pin) {
      skipNextPick.current = false;
      setPin({ lat: center[0], lng: center[1] });
    }
  };

  const confirmPickedAddress = () => {
    const customTitle = customLabel.trim();
    if (kind === "other" && !customTitle) {
      toast(t("اكتب اسم العنوان أولاً"), "info");
      return;
    }
    const label = kind === "other" ? customTitle : t(addressKinds.find((item) => item.id === kind)!.label);
    const point = pin ?? { lat: center[0], lng: center[1] };
    addAddress({
      id: `addr-${Date.now()}`,
      title: label,
      detail: detail.trim() || areaName(point, lang),
      area: areaName(point, lang),
      kind,
      lat: point.lat,
      lng: point.lng,
    });
    setMode("list");
    router.push("/checkout/delivery");
  };

  const confirmSelected = () => {
    if (!selected) {
      openForm();
      return;
    }
    toast(t("تم اختيار {name} لعنوان التوصيل", { name: t(selected.title) }), "info");
    router.push("/checkout/delivery");
  };

  const listCta =
    addresses.length === 0
      ? pin
        ? { label: "اضف عنوان جديد", onClick: openForm, icon: Plus }
        : { label: "حدد موقعك", onClick: useMyLocation, icon: MapPin }
      : selected
        ? { label: "تأكيد العنوان", onClick: confirmSelected, icon: undefined }
        : { label: "اضف عنوان جديد", onClick: openForm, icon: Plus };

  const CtaIcon = listCta.icon;

  return (
    <div className="lg:pb-10">
      <div className="relative lg:shell lg:pt-8">
        <div className="hidden items-center justify-between lg:flex">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "السلة", href: "/cart" },
              { label: "اختيار الموقع" },
            ]}
          />
          <Link
            href="/checkout/delivery"
            className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
          >
            {t("العودة لبيانات التوصيل")}
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        </div>

        <div className="hidden pt-4 text-start lg:block">
          <h1 className="text-[32px] font-extrabold">{t("اختيار الموقع")}</h1>
          <p className="mt-2 text-sm text-muted">{t("حرك الخريطة أو ابحث عن عنوانك، ثم أكّد موقع التوصيل.")}</p>
        </div>

        <div className="relative grid gap-0 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-5">
          {/* Map */}
          <div className="relative h-[100dvh] overflow-hidden lg:static lg:h-[560px] lg:overflow-hidden lg:rounded-[28px] lg:shadow-pop">
            <LeafletMap
              ariaLabel={t("خريطة اختيار موقع التوصيل")}
              center={center}
              zoom={13}
              theme="light"
              markers={markers}
              className="absolute inset-0"
              onPick={handlePick}
              onMarkerClick={(id) => {
                const item = addresses.find((address) => address.id === id);
                if (item) pickAddress(item);
              }}
            />

            {pin && mode === "list" ? (
              <span className="nawy-center-pin" aria-hidden>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 2v6a2 2 0 0 0 4 0V2M6 2v20M14 2c-1.7 0-3 2-3 5s1.3 4 3 4v11" />
                </svg>
              </span>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] px-4 pt-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={useMyLocation}
                  aria-label={t("استخدم موقعي الحالي")}
                  className="pointer-events-auto grid size-12 shrink-0 place-items-center rounded-full bg-cream text-ink shadow-pop transition active:scale-95"
                >
                  <Crosshair className={`size-5 ${locating ? "animate-pulse-soft" : ""}`} strokeWidth={1.9} />
                </button>

                <div className="pointer-events-auto relative flex-1 max-w-sm">
                  <div className="relative">
                    <Search className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-ink/60" />
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
                      className="h-12 w-full rounded-full border-0 bg-cream/95 pe-11 ps-4 text-sm font-semibold text-ink shadow-pop outline-none backdrop-blur placeholder:text-muted"
                    />
                  </div>
                  {suggestions.length > 0 ? (
                    <ul className="mt-2 overflow-hidden rounded-2xl bg-white shadow-pop">
                      {suggestions.map((item) => {
                        const Icon = kindIcon[item.kind];
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => pickAddress(item)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-cream-50"
                            >
                              <Icon className="size-4 shrink-0 text-brand" strokeWidth={1.9} />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold">{t(item.title)}</span>
                                <span className="block truncate text-[10px] text-muted">{t(item.area)}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={confirmSelected}
                  aria-label={t("متابعة")}
                  className="pointer-events-auto grid size-12 shrink-0 place-items-center rounded-full bg-cream text-ink shadow-pop transition active:scale-95"
                >
                  <ArrowLeft className="size-5 rtl:rotate-180" strokeWidth={2.1} />
                </button>
              </div>
            </div>
          </div>

          {/* Sheet */}
          <div
            className={
              mode === "form"
                ? "fixed inset-0 z-[900] flex items-end justify-center bg-ink/55 backdrop-blur-sm lg:items-center lg:p-6"
                : "absolute inset-x-0 bottom-0 z-[700] lg:relative lg:inset-auto lg:z-auto"
            }
            onMouseDown={(event) => {
              if (mode === "form" && event.target === event.currentTarget) setMode("list");
            }}
          >
            {pin && mode === "list" ? (
              <div className="mx-auto mb-[-18px] w-fit max-w-[92%] px-2 text-center">
                <span className="inline-flex items-center gap-2.5 rounded-2xl bg-cream px-4 py-3 shadow-pop">
                  <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
                    <Navigation className="size-4" strokeWidth={2} />
                  </span>
                  <span className="text-sm font-extrabold text-ink">{pinLabel}</span>
                </span>
              </div>
            ) : null}

            <div
              role={mode === "form" ? "dialog" : undefined}
              aria-modal={mode === "form" ? true : undefined}
              aria-labelledby={mode === "form" ? "address-form-title" : undefined}
              className={
                mode === "form"
                  ? "max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-[36px] bg-white px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6 shadow-pop lg:max-w-[480px] lg:rounded-[28px] lg:px-7"
                  : "max-h-[50dvh] overflow-y-auto overscroll-contain rounded-t-[36px] bg-white px-5 pb-6 pt-6 shadow-pop lg:max-h-[68dvh] lg:rounded-[28px] lg:px-6"
              }
            >
              {mode === "list" ? (
                <>
                  <h2 className="text-center text-lg font-extrabold lg:text-start">{t("اختار عنوان التوصيل")}</h2>

                  {addresses.length === 0 ? (
                    <div className="flex flex-col items-center px-2 py-8 text-center">
                      <MapPinOff className="size-24 text-[#c2b4a9]" strokeWidth={1.2} />
                      <p className="mt-4 text-xl font-extrabold text-ink/80">{t("لا يوجد عناوين سابقة")}</p>
                      <p className="mt-1 text-sm text-muted">{t("اضف الان")}</p>
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {addresses.map((item) => {
                        const Icon = kindIcon[item.kind];
                        const active = item.id === selectedAddressId;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => pickAddress(item)}
                              aria-pressed={active}
                              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-start transition ${
                                active
                                  ? "border-transparent bg-brand-soft/60"
                                  : "border-line bg-white hover:border-brand/30"
                              }`}
                            >
                              <span
                                className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                                  active ? "border-brand" : "border-[#c9b8a9]"
                                }`}
                              >
                                {active ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className={`block text-sm font-extrabold ${active ? "text-ink" : "text-ink/80"}`}>
                                  {t(item.title)}
                                </span>
                                <span className={`mt-0.5 block truncate text-[11px] ${active ? "text-ink/70" : "text-muted"}`}>
                                  {t(item.area)}
                                  {lang === "ar" ? "، " : ", "}
                                  {t(item.detail)}
                                </span>
                              </span>
                              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-brand">
                                <Icon className="size-5" strokeWidth={1.8} />
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={listCta.onClick}
                    className="btn-gradient mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold text-white shadow-[0_18px_34px_-18px_rgba(232,69,44,0.95)]"
                  >
                    {CtaIcon ? <CtaIcon className="size-5" strokeWidth={2.3} /> : null}
                    {t(listCta.label)}
                  </button>

                  {addresses.length > 0 ? (
                    <Link
                      href="/addresses"
                      className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted transition hover:text-brand"
                    >
                      <Pencil className="size-3.5" />
                      {t("ادارة العناوين المحفوظة")}
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="address-form-title" className="text-base font-extrabold">{t("العنوان المختار")}</h2>
                    <button
                      type="button"
                      onClick={() => setMode("list")}
                      aria-label={t("إغلاق")}
                      className="grid size-9 place-items-center rounded-full bg-cream text-ink transition hover:bg-brand-soft hover:text-brand"
                    >
                      <X className="size-4" strokeWidth={2.4} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-cream px-4 py-3.5">
                    <span className="min-w-0 flex-1 text-end">
                      <span className="block truncate text-sm font-extrabold">{pinLabel || t("موقع الخريطة")}</span>
                      <span className="mt-0.5 block text-[11px] text-muted" dir="ltr">
                        {pin ? formatCoords(pin) : formatCoords({ lat: center[0], lng: center[1] })}
                      </span>
                    </span>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white">
                      <Navigation className="size-5" strokeWidth={2} />
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {addressKinds.map((item) => {
                      const Icon = item.icon === "home" ? Home : item.icon === "work" ? Briefcase : item.icon === "family" ? Store : MapPin;
                      const active = kind === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border-2 bg-white transition ${
                            active ? "border-brand shadow-[0_0_0_4px_rgba(232,69,44,0.07)]" : "border-line hover:border-brand/30"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setKind(item.id)}
                            aria-pressed={active}
                            className="flex w-full flex-col items-center gap-3 px-3 py-4"
                          >
                            <span
                              className={`grid size-11 place-items-center rounded-2xl ${
                                active ? "bg-brand text-white" : "bg-cream text-ink/70"
                              }`}
                            >
                              <Icon className="size-5" strokeWidth={1.8} />
                            </span>
                            <span className={`text-sm font-extrabold ${active ? "text-brand" : "text-ink/80"}`}>
                              {t(item.label)}
                            </span>
                            {item.id !== "other" ? (
                              <span
                                className={`grid size-6 place-items-center rounded-full border-2 ${
                                  active ? "border-brand" : "border-[#c9b8a9]"
                                }`}
                                aria-hidden="true"
                              >
                                {active ? <span className="size-3 rounded-full bg-brand" /> : null}
                              </span>
                            ) : null}
                          </button>
                          {item.id === "other" ? (
                            <input
                              value={customLabel}
                              onChange={(event) => setCustomLabel(event.target.value.slice(0, 24))}
                              aria-label={t("اسم العنوان")}
                              placeholder={t("اكتب اسم العنوان")}
                              className="mb-3 mx-3 h-8 w-[calc(100%-1.5rem)] rounded-full border border-line bg-cream-50 px-3 text-center text-[11px] outline-none focus:border-brand/50"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-extrabold">{t("العنوان بالتفصيل")}</span>
                    <input
                      value={detail}
                      onChange={(event) => setDetail(event.target.value)}
                      placeholder={t("مثال : وسط البلد, جرينفل, شارع المحمدي")}
                      className="field h-12 text-sm"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={confirmPickedAddress}
                    className="btn-gradient mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-extrabold text-white shadow-[0_18px_34px_-18px_rgba(232,69,44,0.95)]"
                  >
                    <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.3} />
                    {t("تأكيد العنوان")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
