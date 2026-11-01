"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Banknote,
  CheckCircle2,
  CloudUpload,
  Copy,
  FileSearch,
  ImageIcon,
  Info,
  Landmark,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { BranchCard } from "@/components/cart/branch-card";
import { CartToolbar } from "@/components/cart/cart-toolbar";
import { CheckoutHeader } from "@/components/cart/checkout-header";
import { FulfillmentToggle } from "@/components/cart/fulfillment-toggle";
import { SummaryCard } from "@/components/cart/summary-card";
import { paymentMethods } from "@/lib/data";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";

const PAY_NUMBER = "01010010010";
const MAX_FILE = 5 * 1024 * 1024;

const methodIcons = {
  cash: Banknote,
  instapay: Landmark,
  wallet: WalletCards,
} as const;

const methodTones = {
  cash: "bg-success-soft text-success",
  instapay: "bg-brand-soft text-brand",
  wallet: "bg-sun-soft text-[#c47a05]",
} as const;

export function PaymentExperience() {
  const router = useRouter();
  const { clearCart } = useStore();
  const [method, setMethod] = useState("instapay");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [confirmOpen]);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(PAY_NUMBER);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const acceptFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("الملف لازم يكون صورة JPG أو PNG");
      return;
    }
    if (file.size > MAX_FILE) {
      setError("حجم الملف أكبر من 5 ميجا، جرب صورة أصغر");
      return;
    }
    setReceipt(file);
    setError("");
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const submit = () => {
    if (method === "instapay" && !receipt) {
      setError("ارفع إيصال الدفع الأول علشان تأكد الطلب");
      return;
    }
    if (method === "instapay") {
      setConfirmOpen(true);
      return;
    }
    finishOrder();
  };

  const finishOrder = () => {
    if (submitted) return;
    setSubmitted(true);
    clearCart();
    setConfirmOpen(false);
    router.push("/orders?placed=1");
  };

  const fileSize = receipt ? `${(receipt.size / (1024 * 1024)).toFixed(1)} ميجا` : "";

  return (
    <>
      <MobilePageHeader title="الدفع" backHref="/cart/delivery" />

      <div className="container-page pb-16 pt-3 lg:pb-24 lg:pt-6">
        <CartToolbar crumbs={[{ label: "الدفع" }]} />

        <CheckoutHeader
          title="اختار طريقة الدفع"
          subtitle="اختار الطريقة الأنسب ليك وأكد طلبك"
          step="payment"
        />

        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <section className="space-y-4">
            <div className="card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold">طريقة الدفع</h2>
                <span className="text-[11px] text-muted">عنوان أو فرع</span>
              </div>

              <div className="mt-4 space-y-3" role="radiogroup" aria-label="طريقة الدفع">
                {paymentMethods.map((option) => {
                  const Icon = methodIcons[option.id as keyof typeof methodIcons] ?? Banknote;
                  const tone = methodTones[option.id as keyof typeof methodTones] ?? methodTones.cash;
                  const active = method === option.id;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition",
                        active
                          ? "border-brand bg-white shadow-soft"
                          : "border-line bg-white hover:border-brand-mist",
                      )}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={option.id}
                        checked={active}
                        onChange={() => {
                          setMethod(option.id);
                          setError("");
                        }}
                        className="h-5 w-5 flex-none accent-brand"
                      />
                      <span className="min-w-0 flex-1 text-start">
                        <span className="block text-sm font-extrabold sm:text-base">
                          {option.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {option.description}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid h-10 w-10 flex-none place-items-center rounded-xl",
                          tone,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {method === "instapay" ? (
              <div className="card p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-extrabold">اثبات الدفع</h2>
                  <button
                    type="button"
                    onClick={copyNumber}
                    aria-label="نسخ رقم الدفع"
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold text-brand transition hover:bg-brand-soft"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    {copied ? "تم النسخ" : "نسخ"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  ادفع على رقم{" "}
                  <span dir="ltr" className="font-bold text-ink">
                    {PAY_NUMBER}
                  </span>
                </p>

                {receipt ? (
                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-success/30 bg-success-soft/50 p-3">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white text-success">
                      <ImageIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{receipt.name}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        تم رفع الإيصال · {fileSize}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceipt(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      aria-label="حذف الإيصال"
                      className="grid h-8 w-8 flex-none place-items-center rounded-full text-muted transition hover:bg-white hover:text-brand"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="receipt"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                      "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-9 text-center transition",
                      dragging
                        ? "border-brand bg-brand-soft/70"
                        : "border-brand-mist bg-brand-soft/30 hover:bg-brand-soft/50",
                    )}
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-pop">
                      <CloudUpload className="h-7 w-7" aria-hidden />
                    </span>
                    <span className="mt-3 text-sm font-extrabold">ارفع إيصال الدفع</span>
                    <span className="mt-1 text-[10px] text-muted">بحد أقصى 5 ميجا JPG, PNG</span>
                    <input
                      ref={inputRef}
                      id="receipt"
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      onChange={(event) => acceptFile(event.target.files?.[0])}
                    />
                  </label>
                )}

                {error ? (
                  <p className="mt-2 text-[11px] font-semibold text-brand" aria-live="polite">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={submit}
              className="btn-brand h-14 w-full text-base"
            >
              تأكيد الطلب
            </button>
            <p className="text-center text-[10px] text-muted">
              بالضغط على تأكيد الطلب أنت موافق على شروط الاستخدام وسياسة الاسترجاع
            </p>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <SummaryCard
              showItems
              hideCta
              topAction={
                <Link
                  href="/cart"
                  className="text-[11px] font-bold text-brand transition hover:text-brand-strong"
                >
                  تعديل السلة
                </Link>
              }
            />
            <div className="flex justify-center">
              <FulfillmentToggle />
            </div>
            <BranchCard />
          </aside>
        </div>
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/45 p-4 backdrop-blur-sm"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-confirm-title"
            className="relative w-full max-w-sm rounded-[2rem] border border-line/70 bg-cream p-6 shadow-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              aria-label="إغلاق"
              className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-brand shadow-soft transition hover:bg-brand-soft"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            <span className="mx-auto mt-2 grid h-20 w-20 place-items-center rounded-3xl bg-brand-soft text-brand">
              <FileSearch className="h-11 w-11" aria-hidden strokeWidth={1.6} />
            </span>

            <h2
              id="payment-confirm-title"
              className="mt-4 text-center text-lg font-extrabold"
            >
              إيصال الدفع
            </h2>

            <div className="mt-4 rounded-2xl border border-line bg-white p-3">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                <span className="truncate">{receipt?.name ?? "إيصال الدفع"}</span>
                <span className="flex-none text-muted">{fileSize}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-soft">
                <div className="h-full w-full rounded-full bg-gradient-to-l from-brand to-sun" />
              </div>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                تم الرفع
              </p>
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-brand-soft/60 px-3 py-2.5 text-[11px] leading-5 text-ink-soft">
              <Info className="mt-0.5 h-4 w-4 flex-none text-brand" aria-hidden />
              سيتم مراجعة إثبات الدفع من قبل المطعم خلال دقائق قليلة، وسيتم إشعارك عند تأكيد
              الطلب
            </p>

            <button
              type="button"
              onClick={finishOrder}
              className="btn-brand mt-4 h-12 w-full text-sm"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              تأكيد
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
