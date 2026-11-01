"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft } from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs, MobilePageHeader } from "@/components/ui";
import { user } from "@/lib/data";

export function EditProfileView() {
  const router = useRouter();
  const { toast, t, lang } = useApp();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("الملف لازم يكون صورة"), "info");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    toast(t("تم تحديث الصورة الشخصية"), "info");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 3) {
      toast(t("اكتب الاسم الكامل من فضلك"), "info");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      toast(t("رقم الهاتف غير صحيح"), "info");
      return;
    }
    toast(t("تم حفظ التغييرات بنجاح"), "info");
    router.push("/profile");
  };

  return (
    <div className="pb-10">
      <MobilePageHeader title="تعديل الملف الشخصي" backHref="/profile" />

      <div className="shell">
        <div className="hidden items-center justify-between lg:flex">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "تعديل الملف الشخصي" },
            ]}
          />
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
          >
            {t("العودة للملف الشخصي")}
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        </div>

        <div className="mt-5 hidden text-start lg:block">
          <h1 className="text-[32px] font-extrabold">{t("تعديل الملف الشخصي")}</h1>
          <p className="mt-2 text-sm text-muted">{t("حدّث بياناتك وصورتك الشخصية عشان تجربتك تبقى أسهل.")}</p>
        </div>

        <form
          onSubmit={submit}
          className="card mx-auto mt-5 max-w-[640px] px-5 py-7 lg:mt-7 lg:px-10 lg:py-9"
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <Image
                src={preview ?? user.avatar}
                alt={t(user.name)}
                width={144}
                height={144}
                unoptimized={preview !== null}
                className="size-[112px] rounded-full object-cover ring-[5px] ring-brand/85 ring-offset-4 ring-offset-white lg:size-[128px]"
              />
              <button
                type="button"
                aria-label={t("تغيير الصورة الشخصية")}
                onClick={() => fileInput.current?.click()}
                className="absolute -bottom-0.5 start-0 grid size-10 place-items-center rounded-full bg-[#f0683f] text-white ring-4 ring-white transition hover:bg-brand-dark active:scale-95"
              >
                <Camera className="size-[18px]" strokeWidth={2} />
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                pickImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="mt-5 text-sm font-bold text-brand transition hover:text-brand-dark"
            >
              {t("تغيير الصورة الشخصية")}
            </button>
          </div>

          <div className="mt-7 space-y-5">
            <div>
              <label htmlFor="full-name" className="text-sm font-bold text-ink/75">
                {t("الاسم الكامل")}
              </label>
              <input
                id="full-name"
                value={name === user.name ? t(user.name) : name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("اكتب اسمك الكامل")}
                className="field mt-2 h-14 text-sm font-semibold"
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className="text-sm font-bold text-ink/75">
                {t("رقم الهاتف")}
              </label>
              <input
                id="profile-phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+201000000000"
                className="field mt-2 h-14 text-start text-sm font-semibold"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="text-sm font-bold text-ink/75">
                {t("البريد الإلكتروني (اختياري)")}
              </label>
              <input
                id="profile-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("أضف بريدك الإلكتروني")}
                className="field mt-2 h-14 text-start text-sm font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-gradient mt-6 flex h-14 w-full items-center justify-center rounded-full text-sm font-extrabold text-white shadow-[0_20px_36px_-20px_rgba(232,69,44,0.95)] transition hover:brightness-105"
          >
            {t("حفظ التغييرات")}
          </button>

          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="mt-4 block w-full text-center text-sm font-semibold text-muted transition hover:text-ink"
          >
            {t("إلغاء")}
          </button>
        </form>
      </div>
    </div>
  );
}
