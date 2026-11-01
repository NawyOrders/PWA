import Link from "next/link";
import { MapPin, Phone, Clock, ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { branches, categories, site } from "@/lib/data";

export function SiteFooter() {
  return (
    <footer className="mt-16 hidden border-t border-line/80 bg-white/60 lg:block">
      <div className="container-page grid gap-12 py-14 grid-cols-[1.35fr_1fr_1.1fr_1.2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5" aria-label="ناوي أوردر">
            <LogoMark className="h-11 w-11" />
            <span className="text-xl font-extrabold">ناوي أوردر</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-7 text-muted">
            متخصصين في توصيل الأكل السريع والوجبات الطازة بجودة عالية وأسعار مناسبة، مع
            خدمة عملاء على مدار الأسبوع.
          </p>
          <div className="mt-6 rounded-2xl border border-line bg-cream p-4">
            <p className="text-xs font-semibold text-muted">الخط الساخن المجاني</p>
            <a
              href={site.phoneHref}
              className="mt-1 inline-flex items-center gap-2 text-2xl font-extrabold text-brand"
            >
              <Phone className="h-5 w-5" aria-hidden />
              {site.phone}
            </a>
          </div>
        </div>

        <nav aria-label="روابط سريعة">
          <h2 className="text-sm font-extrabold">روابط سريعة</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li><Link className="transition hover:text-brand" href="/">الرئيسية</Link></li>
            <li><Link className="transition hover:text-brand" href="/categories">الأقسام</Link></li>
            <li><Link className="transition hover:text-brand" href="/favorites">المفضلة</Link></li>
            <li><Link className="transition hover:text-brand" href="/orders">سجل الطلبات</Link></li>
            <li><Link className="transition hover:text-brand" href="/settings">الإعدادات</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-extrabold">الأقسام</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            {categories.slice(0, 5).map((category) => (
              <li key={category.slug}>
                <Link
                  className="transition hover:text-brand"
                  href={`/categories/${category.slug}`}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold">فروعنا</h2>
          <ul className="mt-4 space-y-4 text-sm text-muted">
            {branches.slice(0, 2).map((branch) => (
              <li key={branch.id} className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-none text-brand" aria-hidden />
                <span>
                  <span className="block font-semibold text-ink-soft">{branch.name}</span>
                  {branch.address}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <Clock className="h-4 w-4 text-sun" aria-hidden />
            {site.openingHours}
          </p>
        </div>
      </div>

      <div className="border-t border-line/80">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-6 text-xs text-muted">
          <p>© 2026 ناوي أوردر. جميع الحقوق محفوظة.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/settings" className="transition hover:text-brand">
              سياسة الخصوصية
            </Link>
            <Link href="/settings" className="transition hover:text-brand">
              الشروط والأحكام
            </Link>
            <a href={site.phoneHref} className="inline-flex items-center gap-1 transition hover:text-brand">
              تواصل معنا
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
