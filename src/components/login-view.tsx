"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, Phone, Send, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs, buttonStyles } from "@/components/ui";
import { LogoMark } from "@/components/logo";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;
/**
 * Demo builds have no SMS gateway yet. The code is shown to the customer so
 * the journey stays testable end to end; swap this for the server challenge
 * when the OTP API is wired up.
 */
const DEMO_CODE = "123456";

export function LoginView({ next = "/profile" }: { next?: string }) {
  const router = useRouter();
  const { login, toast, t, loggedIn, ready } = useApp();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Navigation happens only after auth has committed, so the route guard
  // cannot bounce a freshly signed-in customer back to /login.
  useEffect(() => {
    if (ready && loggedIn) router.replace(next);
  }, [loggedIn, next, ready, router]);

  useEffect(() => {
    if (!sent || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds, sent]);

  const code = otp.join("");
  const canSubmit = sent && code.length === OTP_LENGTH;
  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const sendCode = () => {
    if (phone.replace(/\D/g, "").length < 10) {
      setError(t("اكتب رقم موبايل صحيح الأول"));
      toast(t("اكتب رقم موبايل صحيح الأول"), "info");
      return;
    }
    setSent(true);
    setSeconds(RESEND_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(""));
    setError("");
    toast(t("تم إرسال كود التحقق على موبايلك — كود التجربة {code}", { code: DEMO_CODE }), "info");
    setTimeout(() => inputs.current[0]?.focus(), 120);
  };

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setError("");
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    event.preventDefault();
    setError("");
    const next = Array(OTP_LENGTH)
      .fill("")
      .map((_, index) => text[index] ?? "");
    setOtp(next);
    inputs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sent) {
      setError(t("اطلب كود التحقق الأول"));
      return;
    }
    if (!canSubmit) {
      setError(t("اكتب كود التحقق كامل"));
      return;
    }
    if (code !== DEMO_CODE) {
      setError(t("الكود غير صحيح، جرب تاني"));
      toast(t("الكود غير صحيح، جرب تاني"), "info");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
      return;
    }
    setError("");
    login();
  };

  const card = (
    <div className="flex min-h-[calc(100dvh-186px)] flex-col rounded-card bg-white px-4 pb-8 pt-9 shadow-soft lg:min-h-0 lg:rounded-[30px] lg:p-8">
      <div className="flex justify-end" dir="ltr">
        <span className="grid size-14 place-items-center rounded-[18px] bg-brand-soft text-brand lg:size-14">
          <Phone className="size-5 lg:size-6" />
        </span>
      </div>

      <h2 className="mt-3 text-[20px] font-extrabold lg:text-[28px]">{t("تسجيل الدخول")}</h2>
      <p className="mt-2 max-w-md text-[11px] leading-6 text-muted lg:text-sm lg:leading-7">
        {t("ادخل رقم موبايلك، وهنبعتلك كود تحقق برسالة SMS عشان تسجل دخولك وتكمل طلبك.")}
      </p>

      <form onSubmit={submit} noValidate>
        <div className="mt-5">
          <label htmlFor="phone" className="text-xs font-extrabold">
            {t("رقم الموبايل")}
          </label>
          <div className="mt-2 flex h-14 items-center rounded-xl border border-line bg-white px-1.5 transition focus-within:border-brand/45">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t("ادخل رقم موبايلك")}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none"
            />
            <span className="mx-1 flex shrink-0 items-center gap-1.5 border-e border-line pe-3 text-xs font-bold">
              {t("مصر")}
              <span className="text-muted" dir="ltr">
                +20
              </span>
            </span>
            <button
              type="button"
              onClick={sendCode}
              className={buttonStyles({ variant: "brand", size: "xs", className: "ms-1.5" })}
            >
              <Send className="size-3.5" />
              {t("إرسال")}
            </button>
          </div>
          <p className="mt-2 text-end text-[10px] text-muted">{t("استخدم رقم موبايل مصري لاستلام كود التحقق")}</p>
        </div>

        <div className="mt-5">
          <label className="text-xs font-extrabold">{t("كود التحقق")}</label>
          <div className="mt-2.5 flex items-center justify-center gap-1 lg:gap-2" dir="ltr">
            {otp.map((digit, index) => (
              <div key={index} className="flex items-center gap-1.5 lg:gap-2">
                <input
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event)}
                  onPaste={onPaste}
                  disabled={!sent}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  aria-label={t("خانة الكود {n}", { n: index + 1 })}
                  className={`h-[42px] w-[42px] rounded-xl border-2 text-center text-lg font-extrabold outline-none transition disabled:cursor-not-allowed disabled:bg-cream-100 disabled:text-muted lg:h-14 lg:w-12 lg:text-xl ${
                    digit
                      ? "border-brand/60 bg-brand-soft/25 text-brand"
                      : index === 0
                        ? "border-brand bg-white"
                        : "border-line bg-white"
                  } focus:border-brand focus:ring-4 focus:ring-brand/5`}
                />
                {index === 2 ? <span className="mx-0.5 h-7 w-px bg-line lg:mx-1" /> : null}
              </div>
            ))}
          </div>
          <p className="mt-2 text-end text-[10px] text-muted">
            {sent
              ? t("استخدم كود التجربة {code} لإكمال تسجيل الدخول.", { code: DEMO_CODE })
              : t("اكتب الكود اللي وصل في الرسالة")}
          </p>
          {error ? (
            <p role="alert" className="mt-1.5 text-end text-[11px] font-semibold text-brand">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted">
          <span>{t("موصلش الكود؟")}</span>
          {!sent ? (
            <span className="font-bold text-ink">{t("اطلب الكود من زر إرسال")}</span>
          ) : seconds > 0 ? (
            <span>
              {t("إعادة الإرسال بعد")}{" "}
              <span className="font-bold text-ink" dir="ltr">
                {timer}
              </span>
            </span>
          ) : (
            <button type="button" onClick={sendCode} className="font-bold text-brand hover:text-brand-dark">
              {t("إعادة إرسال الكود")}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={buttonStyles({
            variant: "brand",
            size: "lg",
            block: true,
            className: "mt-5",
          })}
        >
          {canSubmit ? <Check className="size-4" /> : null}
          {t("تأكيد الكود والمتابعة")}
          <ArrowLeft className="size-4 ltr:rotate-180" />
        </button>
      </form>

      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-4 lg:mt-7">
        <div className="flex-1">
          <p className="text-[11px] font-extrabold">{t("طلبك محفوظ، ولسه فاضل تأكيده")}</p>
          <p className="mt-1 text-[10px] leading-5 text-muted">
            {t("بعد تسجيل الدخول هتأكد بيانات التوصيل وتختار طريقة الدفع.")}
          </p>
        </div>
        <ShieldCheck className="size-6 shrink-0 text-brand" strokeWidth={1.6} />
      </div>

      <p className="mt-4 hidden text-center text-[10px] text-muted lg:block">
        {sent ? t("تم إرسال الكود — ") : ""}
        {t("بالدخول أنت موافق على")}{" "}
        <Link href="/settings" className="font-bold text-brand">
          {t("الشروط والأحكام")}
        </Link>
      </p>
    </div>
  );

  return (
    <div className="pb-10">
      <div className="mx-auto mt-[68px] flex h-14 max-w-[343px] items-center justify-center lg:hidden">
        <LogoMark className="size-14" />
      </div>

      <div className="hidden lg:block lg:pt-8">
        <div className="shell">
          <div className="flex items-center justify-between">
            <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "تسجيل الدخول" }]} />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
            >
              {t("الرجوع للرئيسية")}
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="mt-4 flex items-end justify-start gap-8">
            <div className="max-w-xl text-start">
              <h1 className="text-[34px] font-extrabold leading-[1.3]">{t("سجّل دخولك وكمل طلبك")}</h1>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t("خطوة بسيطة قبل ما تأكد عنوانك وتختار طريقة الدفع.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shell mt-1 lg:mt-7">
        <div className="mx-auto grid w-full max-w-[480px] gap-5 lg:max-w-[720px]">
          <div>{card}</div>
        </div>
      </div>
    </div>
  );
}
