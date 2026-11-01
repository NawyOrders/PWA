"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Banknote,
  Check,
  Copy,
  FileSearch,
  FileText,
  Info,
  ShieldCheck,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { CartSummary } from "@/components/cart-summary";
import { CheckoutShell, Button } from "@/components/ui";

type MethodId = "cash" | "instapay" | "wallet";
type Receipt = { name: string; size: number; url: string };

const methods: {
  id: MethodId;
  title: string;
  subtitle: string;
  tile: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "cash",
    title: "الدفع عند الاستلام",
    subtitle: "ادفع نقداً عند وصول الطلب",
    tile: "bg-success-soft text-success",
    icon: <Banknote className="size-5" />,
  },
  {
    id: "instapay",
    title: "انستا باي",
    subtitle: "تحويل فوري عبر انستا باي",
    tile: "bg-[#fbe7f0] text-[#b11b64]",
    icon: <span className="text-[11px] font-extrabold tracking-tight">IP</span>,
  },
  {
    id: "wallet",
    title: "محفظة إلكترونية",
    subtitle: "فودافون كاش وغيرها",
    tile: "bg-[#fff2d6] text-[#c98a04]",
    icon: <Wallet className="size-5" />,
  },
];

export function PaymentView() {
  const router = useRouter();
  const { toast, t, fulfilment, clearCart } = useApp();
  const [method, setMethod] = useState<MethodId>("instapay");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (receipt?.url) URL.revokeObjectURL(receipt.url);
    };
  }, [receipt]);

  const pickFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("ارفع صورة بصيغة JPG أو PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة أكبر من 5 ميجا، اختار صورة أصغر.");
      return;
    }
    setReceipt({ name: file.name || "إيصال الدفع.jpg", size: file.size, url: URL.createObjectURL(file) });
    setError("");
  };

  const finalize = () => {
    setShowModal(false);
    clearCart(true);
    toast(t("تم تأكيد طلبك بنجاح، جاري تحضيره الآن"), "info");
    router.push("/orders");
  };

  const confirm = () => {
    if (method === "instapay" && !receipt) {
      setError("ارفع صورة إثبات الدفع الأول قبل تأكيد الطلب.");
      return;
    }
    if (method === "instapay") {
      setShowModal(true);
      return;
    }
    finalize();
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText("01010010010");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("انسخ الرقم يدوياً: 01010010010");
    }
  };

  return (
    <>
      <CheckoutShell
        activeStep={2}
        title="اختار طريقة الدفع اللي تريحك"
        subtitle="كل طرق الدفع آمنة، اختار الأسهل ليك وأكد طلبك."
        backHref={fulfilment === "pickup" ? "/checkout/branch" : "/checkout/delivery"}
        backLabel={fulfilment === "pickup" ? "الرجوع للفرع" : "الرجوع للتوصيل"}
        breadcrumb={[
          { label: "الرئيسية", href: "/" },
          { label: "السلة", href: "/cart" },
          { label: "الدفع" },
        ]}
        mobileTitle="الدفع"
        main={
          <>
            <div className="card p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold lg:text-lg">{t("طريقة الدفع")}</h2>
                <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-semibold text-muted">
                  {t("عنوان أو فرع")}
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {methods.map((item) => {
                  const active = method === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMethod(item.id);
                        setError("");
                      }}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3.5 text-start transition ${
                        active ? "border-brand bg-brand-soft/20" : "border-line hover:border-brand/30"
                      }`}
                    >
                      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.tile}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-extrabold">{t(item.title)}</span>
                        <span className="mt-0.5 block text-[11px] text-muted">{t(item.subtitle)}</span>
                      </span>
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                          active ? "border-brand" : "border-[#d8c9bc]"
                        }`}
                      >
                        {active ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {method === "instapay" ? (
                <div className="mt-5 rounded-2xl border border-line bg-cream-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold">
                      <FileText className="size-4 text-brand" />
                      {t("إثبات الدفع")}
                    </h3>
                    <button
                      type="button"
                      onClick={copyNumber}
                      className="flex items-center gap-1 text-[10px] font-bold text-brand"
                    >
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copied ? t("تم النسخ") : t("نسخ الرقم")}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    {t("ادفع على رقم")} <span className="font-bold text-ink">01010010010</span> {t("وارفع صورة التحويل.")}
                  </p>

                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(event) => pickFile(event.target.files?.[0])}
                  />

                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={`mt-3 flex min-h-[190px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-brand-soft/20 px-4 py-6 transition ${
                      receipt ? "border-success/50" : "border-brand/40 hover:bg-brand-soft/35"
                    }`}
                  >
                    {receipt ? (
                      <>
                        <span className="relative h-24 w-20 overflow-hidden rounded-lg border border-line bg-white">
                          <Image src={receipt.url} alt={t("إيصال الدفع")} fill sizes="80px" className="object-cover" unoptimized />
                        </span>
                        <span className="line-1 max-w-[240px] text-xs font-bold">
                          {receipt.name === "إيصال الدفع.jpg" ? t(receipt.name) : receipt.name}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                          <Check className="size-3.5" />
                          {t("تم الرفع")} — {(receipt.size / 1024 / 1024).toFixed(1)} {t("ميجابايت")}
                        </span>
                        <span className="text-[10px] font-bold text-brand underline underline-offset-2">
                          {t("تغيير الصورة")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="grid size-14 place-items-center rounded-full bg-brand text-white shadow-[0_16px_30px_-16px_rgba(232,69,44,0.9)]">
                          <UploadCloud className="size-7" />
                        </span>
                        <span className="text-sm font-extrabold">{t("ارفع إيصال الدفع")}</span>
                        <span className="text-[10px] text-muted">{t("بحد أقصى 5 ميجا — JPG، PNG")}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              {method === "cash" ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-success-soft/60 px-3 py-2.5 text-[11px] leading-5 text-success">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                  {t("جهّز المبلغ المناسب لمندوب التوصيل عند استلام طلبك.")}
                </p>
              ) : null}

              {method === "wallet" ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff6e2] px-3 py-2.5 text-[11px] leading-5 text-[#a2700a]">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  {t("هيتواصل معاك مندوب الدفع لتأكيد تحويل المحفظة قبل تجهيز الطلب.")}
                </p>
              ) : null}

              {error ? (
                <p className="mt-3 rounded-xl bg-pink-soft px-3 py-2 text-[11px] font-semibold text-[#c92e4d]">
                  {t(error)}
                </p>
              ) : null}
            </div>

            <div className="card flex items-start gap-3 p-4 text-[11px] leading-6 text-muted">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream-100 text-brand">
                <ShieldCheck className="size-4" />
              </span>
              <p>
                {t("بياناتك ومدفوعاتك محمية. لو حصلت أي مشكلة في الدفع، فريق الدعم متاح على 19885 طول اليوم.")}
              </p>
            </div>
          </>
        }
        aside={
          <CartSummary
            showItems
            delivery={fulfilment === "delivery"}
            ctaLabel="تأكيد الطلب"
            onCta={confirm}
            note="بالضغط على تأكيد الطلب، أنت موافق على الشروط والأحكام."
          />
        }
      />

      {showModal ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowModal(false);
          }}
        >
          <div className="animate-float-in relative w-full max-w-md rounded-[28px] bg-cream p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              aria-label={t("إغلاق")}
              onClick={() => setShowModal(false)}
              className="absolute end-4 top-4 grid size-9 place-items-center rounded-full bg-white text-brand shadow-soft"
            >
              <X className="size-4" />
            </button>

            <div className="mx-auto mt-2 grid size-24 place-items-center rounded-3xl bg-brand-soft text-brand">
              <FileSearch className="size-12" strokeWidth={1.4} />
            </div>

            <h2 id="receipt-modal-title" className="mt-5 text-center text-xl font-extrabold">
              {t("تأكيد إيصال الدفع")}
            </h2>
            <p className="mt-1.5 text-center text-[11px] leading-6 text-muted">
              {t("اتأكد إن صورة الإيصال واضحة قبل تأكيد الطلب.")}
            </p>

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3">
              <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-cream-50">
                {receipt ? (
                  <Image src={receipt.url} alt={t("إيصال الدفع")} fill sizes="44px" className="object-cover" unoptimized />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-1 text-xs font-bold">
                  {(receipt?.name ?? "إيصال الدفع.jpg") === "إيصال الدفع.jpg"
                    ? t("إيصال الدفع.jpg")
                    : receipt?.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-success">
                  <Check className="size-3" />
                  {receipt
                    ? `${(receipt.size / 1024 / 1024).toFixed(1)} ${t("ميجابايت")} — ${t("تم الرفع")}`
                    : t("تم الرفع")}
                </p>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-100">
              <div className="h-full w-full rounded-full" style={{ backgroundImage: "linear-gradient(90deg,#f6a723,#38a475)" }} />
            </div>

            <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft/45 px-3 py-2.5 text-[10px] leading-5 text-ink/60">
              <Info className="mt-0.5 size-3.5 shrink-0 text-brand" />
              {t("سيتم مراجعة الإثبات من قبل المطعم خلال دقائق قليلة، وتم إشعارك عند تأكيد الطلب.")}
            </p>

            <Button block className="mt-5" onClick={finalize}>
              <Check className="size-4" />
              {t("تأكيد")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
