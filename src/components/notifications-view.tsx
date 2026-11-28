"use client";

import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import { useApp } from "@/components/providers";
import { MobilePageHeader } from "@/components/ui";

/*
 * The tenant API has no notifications feed yet, so this screen has nothing real
 * to list. It shows an honest empty state instead of sample notifications. When
 * the backend ships a feed, list it here.
 */
export function NotificationsView() {
  const { t } = useApp();

  return (
    <div className="pb-10">
      <MobilePageHeader title="الإشعارات" backHref="/" />

      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <div className="hidden items-center justify-between lg:flex lg:pt-8">
            <h1 className="text-start text-[32px] font-extrabold">{t("الإشعارات")}</h1>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
            >
              {t("العودة للرئيسية")}
              <ChevronLeft className="size-4 ltr:rotate-180" />
            </Link>
          </div>

          <div className="mt-6 px-4 lg:px-0">
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Bell className="size-6" strokeWidth={1.6} />
              </span>
              <p className="mt-4 text-sm font-bold">{t("مفيش إشعارات جديدة")}</p>
              <p className="mt-2 text-xs text-muted">{t("هنبلغك أول ما يوصلك عرض أو تحديث على طلبك.")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
