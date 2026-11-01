"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Check } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { cn } from "@/lib/format";

export function EditProfileExperience() {
  const router = useRouter();
  const [name, setName] = useState("جميل جمال");
  const [phone, setPhone] = useState("+20102136515");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("اختار صورة بصيغة JPG أو PNG");
      return;
    }
    setError("");
    setAvatar(URL.createObjectURL(file));
  };

  const submit = () => {
    if (!name.trim()) {
      setError("الاسم الكامل مطلوب");
      return;
    }
    setError("");
    setSaved(true);
    window.setTimeout(() => {
      setSaved(false);
      router.push("/profile");
    }, 900);
  };

  return (
    <>
      <MobilePageHeader title="تعديل الملف الشخصي" backHref="/profile" />

      <div className="container-page pb-16 pt-4 lg:pb-24 lg:pt-10">
        <div className="mx-auto max-w-xl">
          <h1 className="hidden text-4xl font-extrabold lg:block">تعديل الملف الشخصي</h1>
          <p className="hidden text-sm text-muted lg:mt-2 lg:block">
            حدّث بياناتك وصورتك الشخصية في أي وقت
          </p>

          <div className="card mt-4 p-5 sm:p-8 lg:mt-6">
            <div className="flex flex-col items-center">
              <div className="relative h-28 w-28 rounded-full border-[3px] border-brand bg-white p-1.5 shadow-soft">
                <div className="relative h-full w-full overflow-hidden rounded-full">
                  <Image
                    src={avatar ?? "/images/avatar.jpg"}
                    alt="الصورة الشخصية"
                    fill
                    unoptimized={Boolean(avatar)}
                    sizes="112px"
                    className="object-cover object-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="تغيير الصورة الشخصية"
                  className="absolute bottom-0.5 end-0.5 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-brand text-white shadow-pop transition hover:bg-brand-strong"
                >
                  <Camera className="h-4 w-4" aria-hidden />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={pickAvatar}
                />
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 text-sm font-bold text-brand transition hover:text-brand-strong"
              >
                تغيير الصورة الشخصية
              </button>
            </div>

            <div className="mt-7">
              <label htmlFor="full-name" className="mb-1.5 block text-[11px] font-semibold text-muted">
                الاسم الكامل
              </label>
              <input
                id="full-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="field"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="profile-phone" className="mb-1.5 block text-[11px] font-semibold text-muted">
                رقم الهاتف
              </label>
              <input
                id="profile-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/[^\d+]/g, ""))}
                dir="ltr"
                inputMode="tel"
                className="field"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="profile-email" className="mb-1.5 block text-[11px] font-semibold text-muted">
                البريد الإلكتروني <span className="font-normal">(اختياري)</span>
              </label>
              <input
                id="profile-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                dir="ltr"
                placeholder="أضف بريدك الإلكتروني"
                className="field placeholder:text-start"
              />
            </div>

            {error ? (
              <p className="mt-3 text-[11px] font-semibold text-brand" aria-live="polite">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={submit}
              className={cn(
                "mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-l from-sun via-brand to-brand-deep text-sm font-bold text-white shadow-pop transition hover:brightness-105",
                saved && "from-success to-success",
              )}
            >
              {saved ? (
                <>
                  <Check className="h-5 w-5" aria-hidden />
                  تم حفظ التغييرات
                </>
              ) : (
                "حفظ التغييرات"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-3 w-full py-2 text-center text-sm font-semibold text-muted transition hover:text-brand"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
