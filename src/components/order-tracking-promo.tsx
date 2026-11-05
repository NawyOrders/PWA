import Link from "next/link";
import { Navigation, X } from "lucide-react";
import { useApp } from "@/components/providers";
import type { Order } from "@/lib/data";

function TrackingBannerContent({
  order,
  onClose,
  showMobileClose = false,
  mobileEnglish = false,
  mobileArabic = false,
}: {
  order: Order;
  onClose?: () => void;
  showMobileClose?: boolean;
  mobileEnglish?: boolean;
  mobileArabic?: boolean;
}) {
  const { t } = useApp();

  return (
    <>
      <div
        className={`min-w-0 text-white ${
          mobileEnglish ? "text-left lg:text-center" : "text-right lg:text-center"
        }`}
        dir={mobileArabic ? "rtl" : undefined}
      >
        <p className="text-xs font-medium text-white/90 lg:text-xs">
          {t(order.fulfilment === "pickup" ? "وقت الاستلام المتوقع" : "الوقت المتبقي للتوصيل")}
        </p>
        <p className="mt-0.5 text-base font-extrabold leading-tight lg:mt-1 lg:text-base">
          {order.eta ? t(order.eta) : t("خلال 30 - 45 دقيقة")}
        </p>
      </div>
      <Link
        href={`/orders/${order.id}`}
        dir={mobileArabic ? "rtl" : undefined}
        className={`motion-press inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-extrabold text-brand shadow-sm transition hover:scale-105 hover:bg-cream-50 active:scale-[0.98] lg:h-9 lg:gap-1.5 lg:px-3 lg:text-[11px] ${
          mobileEnglish
            ? "col-start-2 row-start-1"
            : mobileArabic
              ? "col-start-1 row-start-1"
              : ""
        }`}
      >
        <Navigation className="size-4 fill-brand lg:size-4" strokeWidth={1.8} />
        {t("تتبع الطلب")}
      </Link>
      {showMobileClose && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("إغلاق")}
          className={`grid shrink-0 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30 lg:hidden ${
            mobileEnglish
              ? "absolute right-2 top-2 size-5"
              : mobileArabic
                ? "absolute left-2 top-2 size-5"
                : "size-7"
          }`}
        >
          <X className={mobileEnglish || mobileArabic ? "size-3" : "size-4"} />
        </button>
      ) : null}
    </>
  );
}

export function MobileOrderTrackingBanner({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t, lang } = useApp();
  const isEnglish = lang === "en";

  return (
    <aside
      aria-label={t("تتبع الطلب")}
      dir="ltr"
      className={`motion-nav-in fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 min-h-[88px] rounded-t-[18px] bg-gradient-to-r from-[#f04b27] via-[#fa5c27] to-[#e9361d] px-4 py-3 shadow-[0_-12px_38px_-18px_rgba(232,69,44,0.65)] sm:px-6 md:px-8 lg:hidden ${
        isEnglish
          ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pr-9"
          : "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pl-9"
      }`}
    >
      <TrackingBannerContent
        order={order}
        onClose={onClose}
        showMobileClose
        mobileEnglish={isEnglish}
        mobileArabic={!isEnglish}
      />
    </aside>
  );
}

export function DesktopOrderTrackingCard({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useApp();

  return (
    <aside
      aria-label={t("تتبع الطلب")}
      className="motion-fade pointer-events-auto fixed right-5 top-1/2 z-50 hidden w-[220px] max-w-[calc(100vw-2.5rem)] -translate-y-1/2 flex-col items-center gap-3 rounded-[24px] bg-gradient-to-r from-[#f04b27] via-[#fa5c27] to-[#e9361d] px-4 pb-4 pt-9 text-white shadow-[0_18px_38px_-18px_rgba(232,69,44,0.65)] lg:flex"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("إغلاق")}
        className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
      >
        <X className="size-3.5" />
      </button>
      <div className="flex w-full flex-col items-center gap-3 text-center">
        <TrackingBannerContent order={order} />
      </div>
    </aside>
  );
}
