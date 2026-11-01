"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, Send, UploadCloud } from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs } from "@/components/ui";
import { reportProblemTypes } from "@/lib/account-data";

export function ReportView() {
  const { toast, t } = useApp();
  const [problem, setProblem] = useState(reportProblemTypes[0]);
  const [orderNumber, setOrderNumber] = useState("");
  const [detail, setDetail] = useState("");
  const [image, setImage] = useState<{ name: string; url: string } | null>(null);

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    if (image) URL.revokeObjectURL(image.url);
    setImage({ name: file.name, url: URL.createObjectURL(file) });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast(t("تم إرسال البلاغ، فريق الدعم سيتواصل معك"), "info");
    setProblem(reportProblemTypes[0]);
    setOrderNumber("");
    setDetail("");
    if (image) URL.revokeObjectURL(image.url);
    setImage(null);
  };

  return (
    <div className="pb-10">
      <div className="bg-gradient-to-b from-peach to-cream px-4 pb-2 pt-6 lg:hidden">
        <Link
          href="/help"
          aria-label={t("رجوع")}
          className="grid size-12 place-items-center rounded-full bg-white text-ink shadow-soft transition active:scale-95"
        >
          <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
        </Link>
        <h1 className="mt-10 text-start text-[40px] font-extrabold leading-[1.3]">
          {t("الابلاغ عن مشكلة")}
        </h1>
        <p className="mt-3 text-start text-sm font-semibold text-muted">
          {t("رأيك يصنع تجربة استثنائية")}
        </p>
      </div>

      <div className="shell">
        <div className="hidden pt-6 lg:block">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "الابلاغ عن مشكلة", href: "/help/report" },
            ]}
          />
        </div>

        <div className="mx-auto max-w-[640px] px-4 lg:max-w-3xl lg:px-0">
          <div className="relative lg:mt-6 lg:rounded-[28px] lg:bg-white lg:p-8 lg:shadow-soft">
            <Link
              href="/help"
              aria-label={t("رجوع")}
              className="absolute start-6 top-6 hidden size-12 place-items-center rounded-full border border-line bg-white text-ink transition hover:text-brand lg:grid"
            >
              <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
            </Link>

            <div className="hidden text-center lg:block">
              <h1 className="text-[34px] font-extrabold">{t("الابلاغ عن مشكلة")}</h1>
              <p className="mt-2 text-sm text-muted">{t("رأيك يصنع تجربة استثنائية")}</p>
            </div>

            <form onSubmit={submit}>
              <div className="card mt-6 p-5 lg:mt-10">
                <p className="text-sm font-extrabold lg:text-center lg:text-base">{t("نوع المشكلة")}</p>
                <div className="mt-4 flex flex-wrap gap-3 lg:justify-center">
                  {reportProblemTypes.map((type) => {
                    const selected = problem === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setProblem(type)}
                        className={`h-11 rounded-full px-5 text-sm font-extrabold transition ${
                          selected
                            ? "bg-brand text-white shadow-[0_14px_26px_-16px_rgba(232,69,44,0.9)]"
                            : "border border-line bg-white text-ink hover:border-brand/40"
                        }`}
                      >
                        {t(type)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card mt-4 p-5 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
                <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="report-order" className="block text-sm font-extrabold">
                        {t("رقم الطلب")}
                      </label>
                      <input
                        id="report-order"
                        value={orderNumber}
                        onChange={(event) => setOrderNumber(event.target.value)}
                        placeholder={t("مثال 165165#")}
                        inputMode="numeric"
                        className="field mt-2.5 border-[#8a7466] bg-white text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label htmlFor="report-detail" className="block text-sm font-extrabold">
                        {t("اشرح المشكلة بالتفصيل")}
                      </label>
                      <textarea
                        id="report-detail"
                        value={detail}
                        maxLength={500}
                        onChange={(event) => setDetail(event.target.value)}
                        placeholder={t("اكتب تفاصيل المشكلة هنا...")}
                        className="field mt-2.5 min-h-32 resize-none border-[#8a7466] bg-white text-sm leading-7"
                      />
                      <p className="mt-2 text-xs text-muted">{detail.length}/500</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-extrabold">{t("صورة توضيحية (اختياري)")}</p>
                    <label className="mt-2.5 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#8a7466]/60 bg-peach px-4 py-8 text-center transition hover:border-brand/50">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => pickImage(event.target.files?.[0])}
                      />
                      <span className="grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-[0_16px_28px_-16px_rgba(232,69,44,0.9)]">
                        <UploadCloud className="size-7" strokeWidth={1.9} />
                      </span>
                      {image ? (
                        <>
                          <img
                            src={image.url}
                            alt={image.name}
                            className="h-24 w-24 rounded-xl border border-line object-cover"
                          />
                          <span className="line-1 max-w-full text-xs font-bold text-ink">{image.name}</span>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-muted">{t("اضغط لرفع الملف")}</span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-brand mt-6 flex h-16 w-full rounded-[24px] text-base lg:mt-8">
                {t("ارسال ابلاغ")}
                <Send className="size-5 shrink-0 rtl:rotate-180" strokeWidth={2.1} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
