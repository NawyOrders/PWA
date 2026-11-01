"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Home,
  LocateFixed,
  MapPin,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";

const addressTypes = [
  { id: "home", label: "المنزل", icon: Home },
  { id: "work", label: "العمل", icon: Briefcase },
  { id: "other", label: "أخرى", icon: MapPin },
] as const;

const savedAddresses = [
  {
    id: "home",
    label: "المنزل",
    address: "اسكندرية، سموحة، شارع محمد بهاء الدين العوالي",
    meta: "آخر استخدام: اليوم",
    icon: Home,
  },
  {
    id: "work",
    label: "العمل",
    address: "اسكندرية، سموحة، شارع الفريق محمد فوزي",
    meta: "حي النخيل، الإسكندرية",
    icon: Briefcase,
  },
] as const;

export function AddressExperience() {
  const router = useRouter();
  const { lines, count } = useStore();
  const [type, setType] = useState("home");
  const [label, setLabel] = useState("");
  const [governorate, setGovernorate] = useState("الإسكندرية");
  const [city, setCity] = useState("سموحة");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("شارع الشهيد احمد مصطفي");
  const [building, setBuilding] = useState("120");
  const [landmark, setLandmark] = useState("");
  const [instructions, setInstructions] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!street.trim() || !city.trim() || !building.trim()) {
      setError("اكتب اسم الشارع والمدينة ورقم المبنى علشان نحفظ العنوان");
      return;
    }
    setError("");
    router.push("/cart/delivery");
  };

  const mapPanel = (
    <div className="card p-2.5">
      <div className="relative h-60 overflow-hidden rounded-2xl bg-[#f4efe2] sm:h-72">
        <svg
          viewBox="0 0 440 320"
          className="absolute inset-0 h-full w-full"
          aria-hidden
          preserveAspectRatio="xMidYMid slice"
        >
          <rect width="440" height="320" fill="#f4efe2" />
          <g fill="#e9dfc9" opacity="0.8">
            <rect x="18" y="28" width="92" height="54" rx="7" />
            <rect x="132" y="18" width="74" height="44" rx="6" />
            <rect x="224" y="38" width="96" height="52" rx="7" />
            <rect x="342" y="22" width="82" height="74" rx="8" />
            <rect x="26" y="128" width="74" height="58" rx="7" />
            <rect x="126" y="120" width="102" height="44" rx="7" />
            <rect x="252" y="136" width="70" height="62" rx="7" />
            <rect x="344" y="128" width="78" height="46" rx="7" />
            <rect x="44" y="228" width="102" height="66" rx="8" />
            <rect x="172" y="214" width="80" height="48" rx="7" />
            <rect x="276" y="236" width="76" height="52" rx="7" />
            <rect x="368" y="210" width="56" height="48" rx="7" />
          </g>
          <g stroke="#fffdf8" strokeLinecap="round">
            <path d="M-20 105 H460" strokeWidth="16" />
            <path d="M118 -10 V330" strokeWidth="13" />
            <path d="M238 -10 V330" strokeWidth="10" />
            <path d="M-20 200 H460" strokeWidth="13" />
            <path d="M330 -10 V330" strokeWidth="9" />
            <path d="M-20 296 H460" strokeWidth="10" />
          </g>
          <g fill="#cfe0c0">
            <circle cx="150" cy="90" r="9" />
            <circle cx="205" cy="86" r="7" />
            <circle cx="96" cy="210" r="8" />
            <circle cx="318" cy="208" r="7" />
          </g>
          <g fill="#d8c9ad">
            <circle cx="382" cy="62" r="5" />
            <circle cx="262" cy="268" r="5" />
          </g>
        </svg>

        <div className="absolute inset-x-2.5 top-2.5 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-soft">
          <Search className="h-4 w-4 flex-none text-muted" aria-hidden />
          <label htmlFor="map-search" className="sr-only">
            ابحث عن عنوان أو موقع
          </label>
          <input
            id="map-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن عنوان أو موقع"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#b7a79c]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="مسح البحث"
              className="grid h-5 w-5 flex-none place-items-center rounded-full text-muted hover:bg-cream"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-brand drop-shadow">
          <MapPin className="h-10 w-10 fill-brand/20" aria-hidden strokeWidth={2.2} />
        </span>

        <button
          type="button"
          onClick={() => setCity("سموحة")}
          className="absolute inset-x-0 bottom-4 mx-auto flex h-10 w-fit items-center gap-1.5 rounded-full bg-brand px-4 text-[11px] font-bold text-white shadow-pop transition hover:bg-brand-strong"
        >
          <LocateFixed className="h-4 w-4" aria-hidden />
          استخدم موقعي الحالي
        </button>
      </div>

      <p className="flex items-center gap-1.5 px-2 py-3 text-[11px] font-bold text-ink-soft">
        <MapPin className="h-4 w-4 flex-none text-brand" aria-hidden />
        اسكندرية، سموحة، شارع الشهيد احمد مصطفي
      </p>
    </div>
  );

  return (
    <>
      <MobilePageHeader title="إضافة عنوان جديد" backHref="/cart/delivery" />

      <div className="container-page pb-16 pt-4 lg:pb-24 lg:pt-6">
        <div className="hidden justify-end lg:flex">
          <Link
            href="/cart/delivery"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-strong"
          >
            العودة إلى إتمام الطلب
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="hidden text-end lg:block">
          <h1 className="mt-1 text-4xl font-extrabold">إضافة عنوان جديد</h1>
          <p className="mt-2 text-sm text-muted">أضف عنوان التوصيل وسنحفظه لطلباتك القادمة.</p>
        </div>

        <div className="mt-4 grid gap-4 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6">
          <form onSubmit={submit} className="card order-1 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">تفاصيل العنوان</h2>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
            </div>

            <p className="mt-5 text-xs font-bold text-ink-soft">نوع العنوان</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="نوع العنوان">
              {addressTypes.map((option) => {
                const Icon = option.icon;
                const active = type === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-1.5 rounded-2xl border p-2.5 transition sm:p-3",
                      active
                        ? "border-brand bg-brand-soft/20 shadow-soft"
                        : "border-line bg-white hover:border-brand-mist",
                    )}
                  >
                    <span className="flex items-center gap-2 text-xs font-bold sm:text-sm">
                      {option.label}
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-xl",
                          active ? "bg-brand text-white" : "bg-cream text-ink-soft",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="address-type"
                      value={option.id}
                      checked={active}
                      onChange={() => setType(option.id)}
                      className="h-4 w-4 flex-none accent-brand"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label htmlFor="address-label" className="mb-1.5 block text-[11px] font-semibold text-muted">
                  اسم مخصص للعنوان <span className="font-normal">(اختياري)</span>
                </label>
                <div className="relative">
                  <input
                    id="address-label"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="مثال: منزل العائلة"
                    className="field pe-10 placeholder:text-[#b7a79c]"
                  />
                  <UserRound
                    className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <label htmlFor="governorate" className="mb-1.5 block text-[11px] font-semibold text-muted">
                  المحافظة
                </label>
                <div className="relative">
                  <select
                    id="governorate"
                    value={governorate}
                    onChange={(event) => setGovernorate(event.target.value)}
                    className="field appearance-none pe-10"
                  >
                    <option value="الإسكندرية">الإسكندرية</option>
                    <option value="القاهرة">القاهرة</option>
                    <option value="الجيزة">الجيزة</option>
                  </select>
                  <MapPin
                    className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <label htmlFor="city" className="mb-1.5 block text-[11px] font-semibold text-muted">
                  المدينة
                </label>
                <div className="relative">
                  <input
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="field pe-10"
                  />
                  <MapPin
                    className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <label htmlFor="district" className="mb-1.5 block text-[11px] font-semibold text-muted">
                  المنطقة / الحي
                </label>
                <div className="relative">
                  <input
                    id="district"
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                    placeholder="اختر الحي"
                    className="field pe-10 placeholder:text-[#b7a79c]"
                  />
                  <MapPin
                    className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <label htmlFor="street" className="mb-1.5 block text-[11px] font-semibold text-muted">
                  اسم الشارع
                </label>
                <input
                  id="street"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="building" className="mb-1.5 block text-[11px] font-semibold text-muted">
                  رقم المبنى
                </label>
                <input
                  id="building"
                  value={building}
                  onChange={(event) => setBuilding(event.target.value)}
                  inputMode="numeric"
                  className="field"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="landmark" className="mb-1.5 block text-[11px] font-semibold text-muted">
                علامة مميزة قريبة
              </label>
              <div className="relative">
                <input
                  id="landmark"
                  value={landmark}
                  onChange={(event) => setLandmark(event.target.value)}
                  placeholder="مثال: بجوار مقهى ..."
                  className="field pe-10 placeholder:text-[#b7a79c]"
                />
                <Bookmark
                  className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="address-instructions" className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                تعليمات للمندوب (اختياري)
                <UserRound className="h-3.5 w-3.5" aria-hidden />
              </label>
              <textarea
                id="address-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value.slice(0, 250))}
                rows={3}
                placeholder="مثال: اترك الطلب عند الباب واطرق الجرس مرة واحدة."
                className="field mt-1.5 resize-none placeholder:text-[#b7a79c]"
              />
              <p className="mt-1 text-end text-[10px] text-muted">
                {instructions.length} / 250
              </p>
            </div>

            {error ? (
              <p className="mt-2 text-[11px] font-semibold text-brand" aria-live="polite">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse">
              <button type="submit" className="btn-brand h-12 flex-1 text-sm">
                حفظ العنوان
              </button>
              <Link
                href="/cart/delivery"
                className="btn-ghost h-12 justify-center px-8 text-sm sm:w-32"
              >
                إلغاء
              </Link>
            </div>
          </form>

          <div className="order-2 space-y-4">
            <div className="hidden lg:block">{mapPanel}</div>

            <div className="card p-4 sm:p-5">
              <h2 className="text-base font-extrabold">عناوينك المحفوظة</h2>
              <div className="mt-3 space-y-2.5">
                {savedAddresses.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-2xl border border-line bg-cream/50 p-3"
                    >
                      <div className="min-w-0 flex-1 text-start">
                        <p className="flex items-center gap-1.5 text-sm font-bold">
                          {item.label}
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-white text-brand">
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-muted">{item.address}</p>
                        <p className="mt-1 text-[10px] text-muted">{item.meta}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-extrabold">ملخص طلبك</h2>
                <span className="text-[11px] font-semibold text-muted">
                  {count} عناصر في طلبك
                </span>
              </div>
              <div className="mt-3 flex items-center">
                {lines.slice(0, 3).map((line, index) => (
                  <div
                    key={line.key}
                    className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-peach shadow-soft"
                    style={{ marginInlineStart: index === 0 ? 0 : -12, zIndex: 3 - index }}
                  >
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="56px"
                      className="object-cover object-center"
                    />
                  </div>
                ))}
                <Link
                  href="/cart"
                  className="ms-auto text-[11px] font-bold text-brand hover:underline"
                >
                  عرض السلة
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
