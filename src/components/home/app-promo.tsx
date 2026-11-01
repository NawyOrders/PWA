import Image from "next/image";
import { Apple, ArrowLeft, Play } from "lucide-react";

export function AppPromo() {
  return (
    <section
      aria-labelledby="app-promo-title"
      className="relative hidden overflow-hidden rounded-[2rem] bg-[linear-gradient(115deg,#f9b48d_0%,#fcd9c5_38%,#fdf3ea_72%,#fdf8f3_100%)] shadow-soft lg:block"
    >
      <div className="pointer-events-none absolute -start-16 -top-24 h-72 w-72 rounded-full bg-white/35 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 end-24 h-80 w-80 rounded-full bg-sun/20 blur-3xl" aria-hidden />

      <div className="relative grid grid-cols-[1.25fr_0.75fr] items-center gap-8 px-10 py-10 xl:px-14">
        <div className="text-start">
          <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-brand">
            ناوي أوردر
          </span>
          <h2 id="app-promo-title" className="mt-3 text-3xl font-extrabold leading-tight text-ink xl:text-4xl">
            احصل على طعامك
            <br />
            المفضل بلمسة واحدة
          </h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-ink-soft/80">
            حمل التطبيق عشان تحصل على عروض حصرية، وإتمام أسرع للطلب، وتتبع مباشر للطلب في
            الوقت الفعلي أينما كنت.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-start text-white transition hover:bg-ink-soft"
              aria-label="تحميل من متجر آبل — قريبًا"
            >
              <Apple className="h-6 w-6" aria-hidden />
              <span className="flex flex-col leading-none">
                <span className="text-[10px] opacity-70">حمل من</span>
                <span className="mt-1 text-sm font-bold">متجر آبل</span>
              </span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-start text-white transition hover:bg-ink-soft"
              aria-label="تحميل من متجر جوجل بلاي — قريبًا"
            >
              <Play className="h-6 w-6" aria-hidden />
              <span className="flex flex-col leading-none">
                <span className="text-[10px] opacity-70">حمل من</span>
                <span className="mt-1 text-sm font-bold">متجر جوجل بلاي</span>
              </span>
            </button>
          </div>
          <p className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-brand">
            اطلب دلوقتي من الموقع
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          </p>
        </div>

        <div className="relative mx-auto w-[210px] xl:w-[230px]">
          <div className="relative aspect-[9/18] w-full rotate-[-4deg] overflow-hidden rounded-[2.2rem] border-[7px] border-ink bg-ink shadow-2xl">
            <span className="absolute left-1/2 top-1.5 z-10 h-3.5 w-16 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
            <Image
              src="/images/brand/app-screen.jpg"
              alt="واجهة تطبيق ناوي أوردر على الهاتف"
              fill
              sizes="230px"
              className="object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
