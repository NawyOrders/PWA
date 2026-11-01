"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft } from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs, MobilePageHeader } from "@/components/ui";

export function EditProfileView() {
  const router = useRouter();
  const { toast, t, profile, ready, updateProfile } = useApp();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setName(profile.name);
    setPhone(profile.phone);
    setEmail(profile.email);
  }, [ready, profile.name, profile.phone, profile.email]);

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("الملف لازم يكون صورة"), "info");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast(t("حجم الصورة أكبر من 5 ميجا، اختار صورة أصغر."), "info");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast(t("الملف لازم يكون صورة"), "info");
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new window.Image();
      image.onerror = () => toast(t("الملف لازم يكون صورة"), "info");
      image.onload = () => {
        const size = 320;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context || !image.naturalWidth || !image.naturalHeight) {
          setPreview(reader.result as string);
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size, size);
        const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        setPreview(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
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
    updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      avatar: preview ?? profile.avatar,
    });
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
                src={preview ?? profile.avatar}
                alt={t(profile.name)}
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
                value={name}
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
