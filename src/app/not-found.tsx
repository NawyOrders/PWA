"use client";

import Link from "next/link";
import { ArrowLeft, Home, LayoutGrid } from "lucide-react";
import { useApp } from "@/components/providers";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  const { t } = useApp();
  return (
    <div className="shell flex min-h-[72vh] items-center justify-center py-10">
      <div className="card w-full max-w-[460px] px-6 py-10 text-center">
        <div className="flex justify-center">
          <LogoMark className="size-16" />
        </div>
        <p className="mt-6 font-display text-5xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-xl font-extrabold">{t("الصفحة مش موجودة")}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-muted">
          {t("يمكن الرابط اتغير أو الصفحة اتمسحت. يلا نرجعك لحاجة لذيذة بدلها.")}
        </p>
        <Link href="/" className="btn-brand mt-6 h-12 w-full text-sm">
          <Home className="size-4" />
          {t("الرئيسية")}
        </Link>
        <Link
          href="/categories"
          className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-soft text-sm font-bold text-brand transition hover:bg-brand/15"
        >
          <LayoutGrid className="size-4" />
          {t("تصفح الأقسام")}
          <ArrowLeft className="size-4 ltr:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
