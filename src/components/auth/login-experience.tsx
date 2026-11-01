"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { ArrowLeft, ChevronRight, PhoneCall, Send, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { CartToolbar } from "@/components/cart/cart-toolbar";
import { CheckoutHeader } from "@/components/cart/checkout-header";
import { SummaryCard } from "@/components/cart/summary-card";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";

const OTP_LENGTH = 6;

export function LoginExperience({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const { login } = useStore();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [seconds, setSeconds] = useState(45);
  const [sending, setSending] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sendCode = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("اكتب رقم موبايل مصري صحيح علشان نبعت الكود");
      return;
    }
    setError("");
    setSeconds(45);
    setSending(true);
    setNotice("تم إرسال كود التحقق على رقمك، اكتبه في الخانات اللي تحت");
    inputs.current[0]?.focus();
    window.setTimeout(() => setSending(false), 800);
  };

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setCode((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (event.key === "ArrowRight" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!digits) return;
    event.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setCode(next);
    inputs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const complete = code.every((digit) => digit !== "");
  const formattedSeconds = `00:${String(seconds).padStart(2, "0")}`;

  const submit = () => {
    if (!complete) {
      setError("اكتب كود التحقق كامل (6 أرقام)");
      return;
    }
    setError("");
    login();
    router.push(nextHref);
  };

  return (
    <>
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <Link
            href="/cart"
            aria-label="رجوع"
            className="icon-btn h-11 w-11 flex-none rounded-2xl bg-white shadow-soft"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
          <LogoMark className="h-16 w-16" />
          <span className="h-11 w-11 flex-none" aria-hidden />
        </div>
      </div>

      <div className="container-page pb-16 pt-4 lg:pb-24 lg:pt-6">
        <CartToolbar
          crumbs={[{ label: "تسجيل الدخول" }]}
          backHref="/cart"
          backLabel="الرجوع للسلة"
        />

        <div className="hidden lg:block">
          <CheckoutHeader
            title="سجل دخولك وكمّل طلبك"
            subtitle="خطوة بسيطة قبل ما تأكد عنوانك وتختار طريقة الدفع"
            step="review"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <section className="card min-w-0 p-5 sm:p-8">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <PhoneCall className="h-6 w-6" aria-hidden />
            </span>

            <h1 className="mt-4 text-2xl font-extrabold lg:text-3xl">تسجيل الدخول</h1>
            <p className="mt-2 max-w-md text-sm leading-7 text-muted">
              ادخل رقم موبايلك، وهنبعنالك كود تحقق برسالة SMS علشان تسجل دخولك وتكمل طلبك.
            </p>

            <div className="mt-6">
              <label htmlFor="login-phone" className="text-sm font-bold">
                رقم الموبايل
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-white p-1.5 focus-within:border-brand/50 focus-within:shadow-[0_0_0_4px_rgba(237,66,39,0.1)]">
                <input
                  id="login-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/[^\d\s+]/g, ""))}
                  inputMode="tel"
                  dir="ltr"
                  placeholder="ادخل رقم موبايلك"
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-end text-sm outline-none placeholder:text-start placeholder:text-[#b7a79c]"
                />
                <span className="h-6 w-px flex-none bg-line" aria-hidden />
                <span className="flex flex-none items-center gap-1.5 px-2 text-sm font-bold">
                  مصر
                  <span dir="ltr">+20</span>
                </span>
                <button
                  type="button"
                  onClick={sendCode}
                  className="btn-brand h-10 flex-none px-4 text-xs"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  {sending ? "جاري الإرسال" : "ارسال"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                استخدم رقم موبايل مصري لاستلام كود التحقق
              </p>
              {notice ? (
                <p className="mt-2 text-[11px] font-semibold text-success" aria-live="polite">
                  {notice}
                </p>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold">كود التحقق</p>
              <div className="mt-3 flex items-center gap-2 sm:gap-3" dir="ltr">
                {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                  <Fragment key={index}>
                    {index === 3 ? (
                      <span className="h-8 w-px flex-none bg-line" aria-hidden />
                    ) : null}
                    <input
                      ref={(element) => {
                        inputs.current[index] = element;
                      }}
                      value={code[index]}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setDigit(index, event.target.value)
                      }
                      onKeyDown={(event) => onKeyDown(index, event)}
                      onPaste={onPaste}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      aria-label={`رقم ${index + 1} من كود التحقق`}
                      className={cn(
                        "h-12 w-full min-w-0 flex-1 rounded-xl border bg-white text-center text-lg font-extrabold outline-none transition sm:h-14",
                        code[index]
                          ? "border-brand text-brand shadow-[0_0_0_3px_rgba(237,66,39,0.08)]"
                          : "border-line focus:border-brand focus:shadow-[0_0_0_3px_rgba(237,66,39,0.1)]",
                      )}
                    />
                  </Fragment>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">اكتب كود التحقق اللي وصل في الرسائل</p>
            </div>

            <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted">
              موصلكش الكود؟
              {seconds > 0 ? (
                <span>
                  إعادة إرسال الكود بعد{" "}
                  <span className="font-extrabold text-ink-soft">{formattedSeconds}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSeconds(45);
                    setNotice("تم إرسال كود جديد على نفس الرقم");
                  }}
                  className="font-bold text-brand underline-offset-4 hover:underline"
                >
                  إعادة إرسال الكود
                </button>
              )}
            </p>

            {error ? (
              <p className="mt-3 text-[11px] font-semibold text-brand" aria-live="polite">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={!complete}
              className={cn(
                "btn-brand mt-5 h-14 w-full justify-between px-5 text-sm transition",
                !complete &&
                  "cursor-not-allowed bg-[#d9d6d3] text-white shadow-none hover:bg-[#d9d6d3]",
              )}
            >
              <span>المتابعة</span>
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-brand-soft/50 p-4">
              <div className="flex-1">
                <p className="text-sm font-extrabold">طلبك محفوظ، ولسه فاضل تأكيده</p>
                <p className="mt-1 text-[11px] leading-6 text-muted">
                  بعد تسجيل الدخول هتأكد بيانات التوصيل وتختار طريقة الدفع
                </p>
              </div>
              <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-white text-brand">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
            </div>
          </section>

          <aside className="hidden lg:sticky lg:top-24 lg:block">
            <SummaryCard
              showItems
              showPromo={false}
              hideCta
              caption="هتراجع بيانات التوصيل والدفع قبل تأكيد الطلب"
            />
          </aside>
        </div>
      </div>
    </>
  );
}
