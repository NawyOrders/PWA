import Link from "next/link";
import { Navigation, X } from "lucide-react";
import { useApp } from "@/components/providers";
import type { Order } from "@/lib/data";

function TrackingBannerContent({
  order,
  onClose,
  showMobileClose = false,
}: {
  order: Order;
  onClose?: () => void;
  showMobileClose?: boolean;
}) {
  const { t } = useApp();

  return (
    <>
      <div className="min-w-0 text-end text-white lg:text-center">
        <p className="text-xs font-medium text-white/90 lg:text-xs">
          {t("الوقت المتبقي للتوصيل")}
        </p>
        <p className="mt-0.5 text-base font-extrabold leading-tight lg:mt-1 lg:text-base">
          {t("خلال 30 - 45 دقيقة")}
        </p>
      </div>
      <Link
        href={`/orders/${order.id}`}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-extrabold text-brand shadow-sm transition hover:bg-cream-50 active:scale-[0.98] lg:h-9 lg:gap-1.5 lg:px-3 lg:text-[11px]"
      >
        <Navigation className="size-4 fill-brand lg:size-4" strokeWidth={1.8} />
        {t("تتبع الطلب")}
      </Link>
      {showMobileClose && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("إغلاق")}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30 lg:hidden"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </>
  );
}

export function MobileOrderTrackingBanner({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useApp();

  return (
    <aside
      aria-label={t("تتبع الطلب")}
      className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex min-h-[88px] items-center justify-between gap-2 rounded-t-[28px] bg-gradient-to-r from-[#f04b27] via-[#fa5c27] to-[#e9361d] px-4 py-3 shadow-[0_-12px_38px_-18px_rgba(232,69,44,0.65)] lg:hidden"
    >
      <TrackingBannerContent order={order} onClose={onClose} showMobileClose />
    </aside>
  );
}

export function DesktopOrderTrackingCard({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useApp();

  return (
    <aside
      aria-label={t("تتبع الطلب")}
      className="pointer-events-auto fixed right-5 top-1/2 z-50 hidden w-[220px] max-w-[calc(100vw-2.5rem)] -translate-y-1/2 flex-col items-center gap-3 rounded-[24px] bg-gradient-to-r from-[#f04b27] via-[#fa5c27] to-[#e9361d] px-4 pb-4 pt-9 text-white shadow-[0_18px_38px_-18px_rgba(232,69,44,0.65)] lg:flex"
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

