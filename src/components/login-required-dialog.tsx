"use client";

import Link from "next/link";
import { Clock3, Pencil, UserRound, X } from "lucide-react";
import { useApp } from "@/components/providers";

export function LoginRequiredDialog({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-5 py-8 backdrop-blur-[5px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        className="relative w-full max-w-[390px] rounded-[32px] bg-cream-50 px-6 pb-5 pt-12 text-center shadow-[0_30px_80px_-28px_rgba(32,26,22,0.6)] sm:px-9 sm:pb-7 sm:pt-14"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("إغلاق")}
          className="absolute end-4 top-4 grid size-9 place-items-center rounded-full bg-white text-brand shadow-soft transition hover:bg-brand-soft"
        >
          <X className="size-4" />
        </button>

        <div className="relative mx-auto grid size-[88px] place-items-center text-brand">
          <UserRound className="size-[74px] fill-brand/10" strokeWidth={1.9} />
          <span className="absolute bottom-2 end-0 grid size-8 place-items-center rounded-lg bg-brand text-white shadow-md">
            <Pencil className="size-4" strokeWidth={2.2} />
          </span>
        </div>

        <h2 id="login-required-title" className="mt-5 text-xl font-extrabold leading-8 text-ink">
          {t("سجل الدخول، علشان تكمل طلبك")}
        </h2>
        <p className="mx-auto mt-2 max-w-[290px] text-xs leading-6 text-muted">
          {t("سجل دخولك أو أنشئ حساب جديد في خطوة واحدة، علشان تقدر تضيف منتجات وتكمل طلبك بسهولة.")}
        </p>

        <Link
          href="/login?next=%2Fcart"
          onClick={onClose}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white shadow-[0_16px_32px_-18px_rgba(232,69,44,0.9)] transition hover:bg-brand-dark"
        >
          {t("سجل الآن")}
        </Link>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted">
          <Clock3 className="size-3" />
          {t("التسجيل بياخد أقل من 30 ثانية")}
        </p>
      </section>
    </div>
  );
}
