"use client";

import { Check, Copy, LogIn, MessageSquareText, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { copyText } from "@/lib/clipboard";

/**
 * Shows the verification code the moment it is requested, so a customer testing
 * the app without an SMS gateway can read it, copy it and paste it into the
 * six boxes — or hand it straight to the form with `onUse` when the clipboard
 * is unavailable (an in-app web view, an insecure origin, a denied permission).
 *
 * The code is real text (selectable, and copyable through the clipboard API
 * with an execCommand fallback), not an image or a scrambled string. It is only
 * ever rendered with a code the backend explicitly returned for testing
 * (`devOtpCode`) or the local demo code — never with a customer's live SMS code.
 */
export function OtpCodeDialog({
  code,
  channel,
  expiresInSeconds = 0,
  onUse,
  onClose,
}: {
  code: string;
  channel: "sms" | "whatsapp";
  expiresInSeconds?: number;
  onUse?: () => void;
  onClose: () => void;
}) {
  const { t, toast } = useApp();
  const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(expiresInSeconds > 0 ? Math.floor(expiresInSeconds) : 0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const copy = async () => {
    const ok = await copyText(code);
    setCopied(ok);
    toast(ok ? t("تم نسخ كود التحقق") : t("نسخ الكود مش متاح، اكتبه بإيدك"), "info");
  };

  return (
    <div
      className="motion-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/45 px-5 py-8 backdrop-blur-[5px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-code-title"
        className="motion-pop relative w-full max-w-[380px] rounded-[28px] bg-cream-50 px-5 pb-6 pt-11 text-center shadow-[0_30px_80px_-28px_rgba(32,26,22,0.6)] sm:px-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("إغلاق")}
          className="motion-press absolute end-4 top-4 grid size-9 place-items-center rounded-full bg-white text-brand shadow-soft transition hover:rotate-90 hover:bg-brand-soft"
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <MessageSquareText className="size-7" />
        </div>

        <h2 id="otp-code-title" className="mt-4 text-lg font-extrabold leading-7 text-ink">
          {t("كود التحقق جاهز")}
        </h2>
        <p className="mx-auto mt-1.5 max-w-[280px] text-[11px] leading-5 text-muted">
          {t("اتُبعت عن طريق {channel}", { channel: channel === "whatsapp" ? t("واتساب") : t("رسالة SMS") })}
        </p>

        <p
          dir="ltr"
          lang="en"
          className="mx-auto mt-5 select-all rounded-2xl border-2 border-dashed border-brand/45 bg-white px-4 py-4 font-mono text-[30px] font-extrabold tracking-[0.35em] text-brand shadow-soft outline-none"
        >
          {code}
        </p>

        <button
          type="button"
          onClick={copy}
          className="motion-press mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-extrabold text-brand-contrast transition hover:bg-brand-dark"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("تم النسخ") : t("انسخ الكود")}
        </button>

        {onUse ? (
          <button
            type="button"
            onClick={onUse}
            className="motion-press mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-brand/30 bg-white text-sm font-extrabold text-brand transition hover:border-brand hover:bg-brand-soft"
          >
            <LogIn className="size-4" />
            {t("استخدم الكود")}
          </button>
        ) : null}

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted">
          <Timer className="size-3" />
          {remaining > 0
            ? t("الكود صالح {seconds} ثانية", { seconds: remaining })
            : t("لصقه في خانات الكود عشان تكمل تسجيل الدخول")}
        </p>
      </section>
    </div>
  );
}
