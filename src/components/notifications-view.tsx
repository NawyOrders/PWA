"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, CircleCheck, MailCheck, Truck } from "lucide-react";
import { useApp } from "@/components/providers";
import { MobilePageHeader } from "@/components/ui";
import { notifications } from "@/lib/data";

const iconMeta = {
  delivery: { icon: Truck, tile: "bg-[#f8e8da] text-ink" },
  free: { icon: MailCheck, tile: "bg-cream-100 text-ink" },
  done: { icon: CircleCheck, tile: "bg-success-soft text-success" },
  offer: { icon: null, tile: "" },
} as const;

export function NotificationsView() {
  const { toast, t } = useApp();
  const [readIds, setReadIds] = useState<string[]>(
    notifications.filter((notification) => !notification.unread).map((notification) => notification.id),
  );
  const [onlyUnread, setOnlyUnread] = useState(false);

  const unreadCount = notifications.filter((notification) => !readIds.includes(notification.id)).length;
  const visible = notifications.filter((notification) => !onlyUnread || !readIds.includes(notification.id));
  const groups: { key: "today" | "yesterday"; label: string }[] = [
    { key: "today", label: "اليوم" },
    { key: "yesterday", label: "أمس" },
  ];

  const markRead = (id: string) => {
    setReadIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const markAllRead = () => {
    setReadIds(notifications.map((notification) => notification.id));
    setOnlyUnread(false);
    toast(t("تم تحديد كل الإشعارات كمقروءة"), "info");
  };

  return (
    <div className="pb-10">
      <MobilePageHeader
        title="الإشعارات"
        backHref="/"
        action={
          unreadCount > 0 ? (
            <span className="whitespace-nowrap rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold text-brand">
              {t("{count} جديدة", { count: unreadCount })}
            </span>
          ) : null
        }
      />

      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <div className="hidden items-center justify-between lg:flex lg:pt-8">
            <div className="text-start">
              <h1 className="text-[32px] font-extrabold">{t("الإشعارات")}</h1>
              <p className="mt-2 text-sm text-muted">{t("تابع طلباتك، وتمتع بعروض ناوي يا أحمد")}</p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
            >
              {t("العودة للرئيسية")}
              <ChevronLeft className="size-4 ltr:rotate-180" />
            </Link>
          </div>

          <p className="px-4 pt-1 text-end text-xs leading-6 text-muted lg:hidden">
            {t("تابع طلباتك، وتمتع بعروض ناوي يا أحمد")}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3 px-4 lg:mt-6 lg:px-0">
            <button
              type="button"
              onClick={() => setOnlyUnread((value) => !value)}
              aria-pressed={onlyUnread}
              className={`h-10 rounded-full px-5 text-xs font-bold transition ${
                onlyUnread
                  ? "bg-brand-soft text-brand hover:bg-brand/15"
                  : "bg-brand text-white shadow-[0_14px_26px_-16px_rgba(232,69,44,0.9)] hover:bg-brand-dark"
              }`}
            >
              {t(onlyUnread ? "عرض كل الإشعارات" : "كل الإشعارات")}
            </button>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-bold text-brand transition hover:text-brand-dark disabled:opacity-40"
              disabled={unreadCount === 0}
            >
              {t("تحديد الكل كمقروء")}
            </button>
          </div>

          <div className="mt-6 space-y-6 px-4 lg:px-0">
            {groups.map((group) => {
              const items = visible.filter((notification) => notification.group === group.key);
              if (items.length === 0) return null;
              return (
                <section key={group.key}>
                  <h2 className="mb-3 text-sm font-bold text-muted">{t(group.label)}</h2>
                  <div className="space-y-3">
                    {items.map((notification) => {
                      const unread = !readIds.includes(notification.id);
                      const meta = iconMeta[notification.icon];
                      const Icon = meta.icon;
                      return (
                        <article
                          key={notification.id}
                          className={`relative rounded-[24px] px-4 py-4 shadow-soft transition lg:px-5 ${
                            unread ? "bg-[#fdf1e9]" : "bg-white"
                          }`}
                        >
                          {unread ? (
                            <span
                              className="absolute end-4 top-5 size-2 rounded-full bg-brand"
                              aria-label={t("غير مقروء")}
                            />
                          ) : null}

                          <div className="flex items-start gap-3.5">
                            {notification.image ? (
                              <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-peach">
                                <Image
                                  src={notification.image}
                                  alt=""
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              </span>
                            ) : (
                              <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${meta.tile}`}>
                                {Icon ? <Icon className="size-6" strokeWidth={1.6} /> : null}
                              </span>
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="text-[15px] font-extrabold leading-6">{t(notification.title)}</h3>
                              <p className="mt-1 text-[11px] leading-6 text-muted lg:text-xs">
                                {t(notification.body)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-[11px] text-muted">{t(notification.time)}</span>
                            {notification.action ? (
                              <ActionLink
                                label={notification.action}
                                notificationId={notification.id}
                                onRead={() => markRead(notification.id)}
                                onToast={() => {
                                  markRead(notification.id);
                                  toast(t("شكراً لتقييمك، رأيك يهمنا"), "info");
                                }}
                              />
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {visible.length === 0 ? (
              <div className="card px-6 py-12 text-center">
                <p className="text-sm font-bold">{t("مفيش إشعارات جديدة")}</p>
                <p className="mt-2 text-xs text-muted">{t("هنبلغك أول ما يوصلك عرض أو تحديث على طلبك.")}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionLink({
  label,
  notificationId,
  onRead,
  onToast,
}: {
  label: string;
  notificationId: string;
  onRead: () => void;
  onToast: () => void;
}) {
  const { t } = useApp();
  const className = "flex items-center gap-1 text-xs font-bold text-brand transition hover:text-brand-dark";

  if (label === "تتبع طلبك") {
    return (
      <Link href="/orders" onClick={onRead} className={className} aria-label={`${t(label)} ${notificationId}`}>
        {t(label)}
        <ChevronLeft className="size-4 ltr:rotate-180" />
      </Link>
    );
  }

  if (label === "اطلب دلوقتي") {
    return (
      <Link href="/product/beef-burger" onClick={onRead} className={className}>
        {t(label)}
        <ChevronLeft className="size-4 ltr:rotate-180" />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onToast} className={className}>
      {t(label)}
      <ChevronLeft className="size-4 ltr:rotate-180" />
    </button>
  );
}
