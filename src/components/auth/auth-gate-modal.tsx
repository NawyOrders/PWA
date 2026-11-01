"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Clock3, UserRoundPen, X } from "lucide-react";

export function AuthGateModal({
  open,
  onClose,
  nextHref = "/cart/delivery",
}: {
  open: boolean;
  onClose: () => void;
  nextHref?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-ink/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
        className="relative w-full max-w-sm rounded-[2rem] border border-line/70 bg-cream p-6 text-center shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-brand shadow-soft transition hover:bg-brand-soft"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <span className="mx-auto mt-4 grid h-24 w-24 place-items-center rounded-full bg-white/60 text-brand">
          <UserRoundPen className="h-14 w-14" aria-hidden strokeWidth={1.7} />
        </span>

        <h2 id="auth-gate-title" className="mt-5 text-2xl font-extrabold leading-snug">
          سجل الدخول، علشان
          <br />
          تكمل طلبك
        </h2>
        <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-7 text-muted">
          سجل دخولك أو أنشئ حساب جديد في خطوة واحدة، علشان تقدر تضيف منتجات وتكمل طلبك
          بسهولة
        </p>

        <Link
          href={`/login?next=${encodeURIComponent(nextHref)}`}
          className="btn-brand mt-6 h-14 w-full text-base"
        >
          سجل الان
        </Link>

        <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          التسجيل بياخد أقل من 30 ثانية
        </p>
      </div>
    </div>
  );
}
