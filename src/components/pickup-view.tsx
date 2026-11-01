"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, MapPin, PackageCheck } from "lucide-react";
import { useApp } from "@/components/providers";
import { CheckoutShell } from "@/components/ui";
import { branches, deliveryFee, formatPrice, user } from "@/lib/data";

export function PickupView() {
  const router = useRouter();
  const { fulfilment, setFulfilment, subtotal, count, t, lang, addresses, selectedAddressId, coupon } = useApp();
  const branch = branches[0];
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
  const deliveryAddress = selectedAddress
    ? `${t(selectedAddress.area)}${lang === "ar" ? "، " : ", "}${t(selectedAddress.detail)}`
    : t(user.fullAddress);
  const fee = fulfilment === "delivery" && subtotal > 0 ? deliveryFee : 0;
  const discount = coupon ? Math.min(Math.round(subtotal * 0.2), 50) : 0;
  const total = Math.max(0, subtotal - discount + fee);

  function confirmFulfilment() {
    router.push(fulfilment === "delivery" ? "/checkout/delivery" : "/checkout/branch");
  }

  const options = [
    {
      id: "delivery" as const,
      title: "التوصيل",
      icon: Bike,
      badge: "بوجود رسوم توصيل",
      badgeTone: "bg-brand-soft text-brand",
      description: "سيصلك الطلب حتى باب المنزل، وتُضاف رسوم التوصيل إلى إجمالي الطلب",
    },
    {
      id: "pickup" as const,
      title: "الاستلام",
      icon: PackageCheck,
      badge: "بدون رسوم توصيل",
      badgeTone: "bg-success-soft text-success",
      description: branch.address,
    },
  ];

  return (
    <CheckoutShell
      activeStep={1}
      title="طريقة الاستلام"
      subtitle="اختار بين التوصيل لعنوانك أو الاستلام من أقرب فرع."
      backHref="/cart"
      backLabel="الرجوع للسلة"
      breadcrumb={[
        { label: "الرئيسية", href: "/" },
        { label: "السلة", href: "/cart" },
        { label: "طريقة الاستلام" },
      ]}
      mobileTitle="طريقة الاستلام"
      main={
        <div className="space-y-4 pb-28 lg:pb-0">
          <section className="card p-4 sm:p-5 lg:p-6">
            <h2 className="text-base font-extrabold lg:text-lg">{t("اختر طريقة استلام الطلب")}</h2>
            <p className="mt-2 text-[11px] leading-6 text-muted sm:text-xs">
              {t("يرجى اختيار طريقة الاستلام سواء التوصيل حتى باب المنزل أو العمل أو الاستلام من أحد فروعنا")}
            </p>

            <div className="mt-5 space-y-3 sm:space-y-4" role="radiogroup" aria-label={t("اختر طريقة استلام الطلب")}>
              {options.map((option) => {
                const active = fulfilment === option.id;
                const Icon = option.icon;

                return (
                  <div
                    key={option.id}
                    className={`rounded-[20px] border-2 p-3 transition sm:p-4 ${
                      active
                        ? "border-brand shadow-[0_0_0_4px_rgba(232,69,44,0.06)]"
                        : "border-line hover:border-brand/30"
                    }`}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFulfilment(option.id)}
                      className="flex w-full items-start gap-3 text-start sm:gap-4"
                    >
                      <span
                        className={`mt-1.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                          active ? "border-brand" : "border-[#9b8d82]"
                        }`}
                      >
                        {active ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold sm:text-base">{t(option.title)}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold sm:text-[10px] ${option.badgeTone}`}>
                            {t(option.badge)}
                          </span>
                        </span>
                        <span className="mt-2 block text-[11px] leading-6 text-muted sm:text-xs">
                          {t(option.description)}
                        </span>
                        {option.id === "delivery" ? (
                          <span className="mt-1 block text-[10px] font-semibold leading-5 text-ink/70 sm:text-[11px]">
                            {deliveryAddress}
                          </span>
                        ) : null}
                      </span>

                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-2xl sm:size-11 ${
                          active ? "bg-brand text-white" : "bg-cream text-ink/70"
                        }`}
                      >
                        <Icon className="size-5" strokeWidth={1.8} />
                      </span>
                    </button>

                    {option.id === "pickup" ? (
                      <Link
                        href="/checkout/branch"
                        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-brand hover:text-brand-dark"
                      >
                        <MapPin className="size-3.5" />
                        {t("تغيير الفرع")}
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold sm:text-base">{t("ملخص الطلب")}</h2>
              <span className="text-[11px] text-muted">{count} {t("أصناف")}</span>
            </div>
            <dl className="mt-4 space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">{t("المجموع الفرعي")}</dt>
                <dd className="font-bold">{formatPrice(subtotal)} {t("جنيه")}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">{t("رسوم التوصيل")}</dt>
                <dd className="font-bold">{formatPrice(fee)} {t("جنيه")}</dd>
              </div>
              {discount > 0 ? (
                <div className="flex items-center justify-between gap-4 text-success">
                  <dt>{t("الخصم (NAWY20)")}</dt>
                  <dd className="font-bold">- {formatPrice(discount)} {t("جنيه")}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
                <dt className="text-sm font-extrabold sm:text-base">{t("الإجمالي")}</dt>
                <dd className="text-lg font-extrabold text-brand sm:text-xl">{formatPrice(total)} {t("جنيه")}</dd>
              </div>
            </dl>
          </section>
        </div>
      }
      aside={
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-pop backdrop-blur lg:static lg:rounded-2xl lg:border-0 lg:bg-white lg:p-4 lg:shadow-soft">
          <button type="button" onClick={confirmFulfilment} className="btn-brand h-14 w-full text-sm sm:text-base">
            {t("تأكيد طريقة الاستلام")}
          </button>
          <p className="mt-2 hidden text-center text-[10px] leading-5 text-muted lg:block">
            {t("هتختار طريقة الدفع في الخطوة الجاية.")}
          </p>
        </div>
      }
    />
  );
}
