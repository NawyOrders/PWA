"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronDown,
  Home,
  LocateFixed,
  MapPin,
  MessageSquare,
  Search,
  Tag,
  User,
  type LucideProps,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { MobilePageHeader } from "@/components/ui";
import { productsById } from "@/lib/data";

type AddressType = "home" | "work" | "other";

const addressTypes: { id: AddressType; label: string; icon: ComponentType<LucideProps> }[] = [
  { id: "home", label: "المنزل", icon: Home },
  { id: "work", label: "العمل", icon: Briefcase },
  { id: "other", label: "أخرى", icon: MapPin },
];

const savedAddresses = [
  {
    title: "المنزل",
    address: "اسكندرية، سموحة، شارع محمد بهاء الدين الغوري",
    note: "آخر استخدام: اليوم",
    icon: Home,
  },
  {
    title: "العمل",
    address: "اسكندرية، سموحة، شارع الفريق محمد فوزي",
    note: "",
    icon: Briefcase,
  },
];

const fieldClass =
  "h-12 w-full rounded-xl bg-[#fbf4ec] text-sm font-semibold text-ink outline-none transition placeholder:font-normal placeholder:text-muted focus:bg-white focus:ring-2 focus:ring-brand/15";

export function AddressNewView() {
  const router = useRouter();
  const { toast, lines, count, t, lang } = useApp();
  const [type, setType] = useState<AddressType>("home");
  const [nickname, setNickname] = useState("");
  const [governorate, setGovernorate] = useState("الإسكندرية");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("سموحة");
  const [building, setBuilding] = useState("120");
  const [street, setStreet] = useState("شارع الشهيد احمد مصطفي");
  const [landmark, setLandmark] = useState("");
  const [instructions, setInstructions] = useState("");
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);

  const cityLabel = city === "سموحة" ? t("سموحة") : city;
  const streetLabel = street === "شارع الشهيد احمد مصطفي" ? t("شارع الشهيد احمد مصطفي") : street;

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast(t("متصفحك مش بيدعم تحديد الموقع"), "info");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
        toast(t("تم تحديد موقعك الحالي على الخريطة"), "info");
      },
      () => {
        setLocating(false);
        toast(t("مقدرناش نحدد موقعك، اكتب العنوان يدوي"), "info");
      },
      { timeout: 8000 },
    );
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!street.trim() || !city.trim() || !area.trim()) {
      toast(t("اكتب المحافظة والمنطقة والشارع الأول"), "info");
      return;
    }
    toast(t("تم حفظ العنوان بنجاح"), "info");
    router.push("/checkout/delivery");
  };

  return (
    <div className="pb-10">
      <MobilePageHeader title="إضافة عنوان جديد" backHref="/checkout/delivery" />

      <div className="shell">
        <div className="flex items-center justify-between gap-4 lg:pt-8">
          <button
            type="button"
            onClick={() => router.push("/checkout/delivery")}
            className="hidden items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark lg:flex"
          >
            {t("العودة إلى إتمام الطلب")}
            <ArrowRight className="size-4 ltr:rotate-180" />
          </button>
        </div>

        <div className="hidden text-start lg:mt-3 lg:block">
          <h1 className="text-[34px] font-extrabold leading-[1.3]">{t("إضافة عنوان جديد")}</h1>
          <p className="mt-2 text-sm text-muted">{t("أضف عنوان التوصيل وسنحفظه لطلباتك القادمة.")}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <form onSubmit={submit} className="card order-1 p-5 lg:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <MapPin className="size-5" strokeWidth={2} />
              </span>
              <h2 className="text-lg font-extrabold">{t("تفاصيل العنوان")}</h2>
            </div>

            <div className="mt-5">
              <span className="mb-2 block text-xs font-bold text-ink/75">{t("نوع العنوان")}</span>
              <div className="grid grid-cols-3 gap-2.5">
                {addressTypes.map((item) => {
                  const Icon = item.icon;
                  const active = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      aria-pressed={active}
                      className={`flex h-14 items-center justify-between gap-1 rounded-xl border px-3 transition ${
                        active
                          ? "border-brand bg-brand-soft/25 shadow-[0_0_0_3px_rgba(232,69,44,0.06)]"
                          : "border-line bg-white hover:border-brand/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`grid size-8 place-items-center rounded-lg ${
                            active ? "bg-brand text-white" : "bg-[#fbf4ec] text-ink/60"
                          }`}
                        >
                          <Icon className="size-4" strokeWidth={1.9} />
                        </span>
                        <span className={`text-sm font-bold ${active ? "text-brand" : "text-ink"}`}>
                          {t(item.label)}
                        </span>
                      </span>
                      <span
                        className={`grid size-[18px] shrink-0 place-items-center rounded-full border ${
                          active ? "border-brand" : "border-muted/50"
                        }`}
                      >
                        {active ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-1 text-xs font-bold text-ink/75">
                  {t("اسم مخصص للعنوان (اختياري)")}
                </span>
                <span className="relative block">
                  <User className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" />
                  <input
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder={t("مثال: منزل العائلة")}
                    className={`${fieldClass} ps-11 pe-4`}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink/75">{t("المحافظة")}</span>
                <span className="relative block">
                  <MapPin className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" />
                  <select
                    value={governorate}
                    onChange={(event) => setGovernorate(event.target.value)}
                    className={`${fieldClass} appearance-none pe-10 ps-11`}
                  >
                    <option value="الإسكندرية">{t("الإسكندرية")}</option>
                    <option value="القاهرة">{t("القاهرة")}</option>
                    <option value="الجيزة">{t("الجيزة")}</option>
                    <option value="المنصورة">{t("المنصورة")}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink/75">{t("المدينة")}</span>
                <span className="relative block">
                  <MapPin className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" />
                  <input
                    value={lang === "en" ? cityLabel : city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder={t("اكتب المدينة")}
                    className={`${fieldClass} ps-11 pe-4`}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink/75">{t("المنطقة / الحي")}</span>
                <span className="relative block">
                  <MapPin className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" />
                  <select
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                    className={`${fieldClass} appearance-none pe-10 ps-11 ${area ? "" : "text-muted"}`}
                  >
                    <option value="">{t("اختر الحي")}</option>
                    <option value="سموحة">{t("سموحة")}</option>
                    <option value="سيدي بشر">{t("سيدي بشر")}</option>
                    <option value="النخيل">{t("النخيل")}</option>
                    <option value="المعادي">{t("المعادي")}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink/75">{t("اسم الشارع")}</span>
                <input
                  value={lang === "en" ? streetLabel : street}
                  onChange={(event) => setStreet(event.target.value)}
                  placeholder={t("اكتب اسم الشارع")}
                  className={`${fieldClass} px-4`}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink/75">{t("رقم المبنى")}</span>
                <input
                  value={building}
                  onChange={(event) => setBuilding(event.target.value)}
                  inputMode="numeric"
                  placeholder={t("مثال: 120")}
                  className={`${fieldClass} px-4`}
                />
              </label>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-ink/75">{t("علامة مميزة قريبة")}</span>
                <span className="relative block">
                  <Tag className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-brand" />
                  <input
                    value={landmark}
                    onChange={(event) => setLandmark(event.target.value)}
                    placeholder={t("مثال: بجوار مقهى ...")}
                    className={`${fieldClass} ps-11 pe-4`}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-1 text-xs font-bold text-ink/75">
                  {t("تعليمات للمندوب (اختياري)")}
                  <MessageSquare className="size-3.5 text-muted" />
                </span>
                <textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value.slice(0, 250))}
                  rows={3}
                  placeholder={t("مثال: اترك الطلب عند الباب واطرق الجرس مرة واحدة.")}
                  className="w-full resize-none rounded-xl bg-[#fbf4ec] px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:font-normal placeholder:text-muted focus:bg-white focus:ring-2 focus:ring-brand/15"
                />
                <span className="mt-1 block text-end text-[10px] text-muted">{instructions.length} / 250</span>
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                className="flex h-13 flex-1 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white shadow-[0_18px_32px_-20px_rgba(232,69,44,0.95)] transition hover:bg-brand-dark"
              >
                {t("حفظ العنوان")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/checkout/delivery")}
                className="h-13 w-28 rounded-full border border-line bg-white text-sm font-bold text-ink transition hover:bg-cream-50"
              >
                {t("إلغاء")}
              </button>
            </div>
          </form>

          <aside className="order-2 space-y-4 lg:sticky lg:top-24">
            <div className="card overflow-hidden p-2.5">
              <div className="map-canvas relative h-[260px] overflow-hidden rounded-[20px] lg:h-[300px]">
                <div className="absolute inset-x-3 top-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          toast(t("تم تحديد الموقع على الخريطة"), "info");
                        }
                      }}
                      placeholder={t("ابحث عن عنوان أو موقع")}
                      aria-label={t("ابحث عن عنوان أو موقع")}
                      className="h-11 w-full rounded-xl border border-line bg-white/95 pe-10 ps-4 text-xs font-semibold shadow-soft outline-none backdrop-blur focus:border-brand/40"
                    />
                  </div>
                </div>

                <span className="absolute left-[22%] top-[30%] h-12 w-20 rounded-md bg-[#ece2d5] shadow-[0_6px_14px_-8px_rgba(90,60,30,0.5)]" />
                <span className="absolute left-[46%] top-[24%] h-16 w-16 rounded-md bg-[#e6dacb] shadow-[0_6px_14px_-8px_rgba(90,60,30,0.5)]" />
                <span className="absolute left-[12%] top-[55%] h-14 w-24 rounded-md bg-[#efe6da]" />
                <span className="absolute left-[54%] top-[50%] h-12 w-16 rounded-md bg-[#e8ddcc]" />
                <span className="absolute left-[36%] top-[44%] -translate-x-1/2 -translate-y-1/2">
                  <span className="relative block size-10 rounded-full border-4 border-white bg-brand shadow-[0_10px_22px_-8px_rgba(232,69,44,0.9)]">
                    <span className="absolute inset-0 m-auto size-2.5 rounded-full bg-white" />
                  </span>
                  <span className="absolute -inset-3 -z-10 rounded-full bg-brand/15" />
                </span>

                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="absolute bottom-[72px] start-3 flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[11px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(232,69,44,1)] transition hover:bg-brand-dark"
                >
                  <LocateFixed className={`size-4 ${locating ? "animate-pulse-soft" : ""}`} />
                  {t(locating ? "بنجيب موقعك..." : "استخدم موقعي الحالي")}
                </button>

                <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[11px] font-bold shadow-soft">
                  <MapPin className="size-4 shrink-0 text-brand" />
                  <span className="line-1 flex-1">
                    {t("اسكندرية، سموحة")}
                    {lang === "ar" ? "، " : ", "}
                    {lang === "en" ? streetLabel : street}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-center text-base font-extrabold">{t("عناوينك المحفوظة")}</h2>
              <div className="mt-4 space-y-3">
                {savedAddresses.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-xl border border-line bg-[#fdf8f3] p-3">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-ink/75 shadow-soft">
                          <Icon className="size-[18px]" strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold">{t(item.title)}</p>
                          <p className="mt-0.5 text-[11px] leading-5 text-muted">{t(item.address)}</p>
                          {item.note ? (
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted">
                              <CalendarDays className="size-3" />
                              {t(item.note)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-start">
                  <h2 className="text-base font-extrabold">{t("ملخص طلبك")}</h2>
                  <p className="mt-1 text-[11px] text-muted">{t("{count} عناصر في طلبك", { count })}</p>
                </div>
                <div className="flex -space-x-2">
                  {lines.slice(0, 3).map((line) => {
                    const product = productsById[line.productId];
                    if (!product) return null;
                    return (
                      <span
                        key={line.key}
                        className="relative size-11 overflow-hidden rounded-xl border-2 border-white bg-peach shadow-soft"
                      >
                        <Image src={product.image} alt={t(product.name)} fill sizes="44px" className="object-cover" />
                      </span>
                    );
                  })}
                </div>
              </div>
              {lines.length === 0 ? (
                <p className="mt-4 rounded-xl bg-[#fbf4ec] px-3 py-2.5 text-center text-[11px] text-muted">
                  {t("السلة فاضية، اختار أطباقك الأول.")}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
