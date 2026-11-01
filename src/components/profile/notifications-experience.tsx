"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, CheckCheck, ChevronLeft, ChevronRight, Ticket, Truck } from "lucide-react";
import { notifications } from "@/lib/data";
import { cn, formatNumber } from "@/lib/format";

export function NotificationsExperience() {
  const [readIds, setReadIds] = useState<string[]>(
    notifications.filter((item) => !item.unread).map((item) => item.id),
  );

  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;
  const today = notifications.slice(0, 2);
  const earlier = notifications.slice(2);

  const markAllRead = () => setReadIds(notifications.map((item) => item.id));

  const renderGroup = (title: string, items: typeof notifications) => (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-bold text-muted">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => {
          const unread = !readIds.includes(item.id);
          return (
            <article
              key={item.id}
              className={cn(
                "rounded-3xl border p-4 transition",
                unread
                  ? "border-brand-mist/70 bg-brand-soft/40"
                  : "border-line bg-white",
              )}
            >
              <div className="flex gap-3">
                <div className="min-w-0 flex-1 text-start">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-extrabold leading-6 sm:text-base">
                      {item.title}
                    </h3>
                    {unread ? (
                      <span
                        className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-brand"
                        aria-label="غير مقروء"
                      />
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-6 text-muted sm:text-xs">
                    {item.body}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Link
                      href={item.href}
                      onClick={() =>
                        setReadIds((current) =>
                          current.includes(item.id) ? current : [...current, item.id],
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand transition hover:text-brand-strong"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      {item.action}
                    </Link>
                    <span className="text-[10px] text-muted">{item.time}</span>
                  </div>
                </div>

                {item.image ? (
                  <div className="relative h-12 w-12 flex-none overflow-hidden rounded-2xl bg-peach sm:h-14 sm:w-14">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <span
                    className={cn(
                      "grid h-12 w-12 flex-none place-items-center rounded-2xl sm:h-14 sm:w-14",
                      item.tone === "success"
                        ? "bg-white text-success"
                        : "bg-white text-brand",
                    )}
                  >
                    {item.tone === "success" ? (
                      <Check className="h-6 w-6" aria-hidden />
                    ) : item.tone === "sun" ? (
                      <Ticket className="h-6 w-6" aria-hidden />
                    ) : (
                      <Truck className="h-6 w-6" aria-hidden />
                    )}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pt-5 lg:hidden">
        <Link
          href="/profile"
          aria-label="رجوع"
          className="icon-btn h-11 w-11 flex-none rounded-2xl bg-white shadow-soft"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
        <h1 className="flex-1 text-center text-xl font-extrabold">الإشعارات</h1>
        <span className="flex-none rounded-full bg-brand-soft px-3 py-1.5 text-[10px] font-bold text-brand">
          {unreadCount > 0 ? `${formatNumber(unreadCount)} جديدة` : "كلها مقروءة"}
        </span>
      </div>

      <div className="container-page pb-16 pt-4 lg:pb-24 lg:pt-8">
        <div className="hidden items-center justify-between gap-3 lg:flex">
          <div>
            <h1 className="text-4xl font-extrabold">الإشعارات</h1>
            <p className="mt-2 text-sm text-muted">
              تابع طلباتك، واعرف آخر عروض ناوي يا أحمد
            </p>
          </div>
          <span className="rounded-full bg-brand-soft px-4 py-2 text-xs font-bold text-brand">
            {unreadCount > 0 ? `${formatNumber(unreadCount)} جديدة` : "كلها مقروءة"}
          </span>
        </div>

        <p className="text-sm text-muted lg:hidden">
          تابع طلباتك، واعرف آخر عروض ناوي يا أحمد
        </p>

        <div className="lg:mx-auto lg:max-w-3xl">
          <div className="mt-5 flex items-center justify-between gap-3">
            <Link href="/notifications" className="btn-brand h-10 px-5 text-xs">
              كل الإشعارات
            </Link>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="text-xs font-bold text-brand transition hover:text-brand-strong disabled:cursor-default disabled:text-muted"
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCheck className="h-4 w-4" aria-hidden />
                تحديد الكل كمقروء
              </span>
            </button>
          </div>

          {renderGroup("اليوم", today)}
          {renderGroup("أمس", earlier)}
        </div>
      </div>
    </>
  );
}
