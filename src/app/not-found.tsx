import Link from "next/link";
import { ArrowLeft, Home, LayoutGrid } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-md px-6 py-12 text-center">
        <LogoMark className="mx-auto h-16 w-16" />
        <p className="mt-6 text-sm font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">الصفحة مش موجودة</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-muted">
          يمكن الرابط قديم أو اتكتب غلط. تعال نرجعك لقائمة الأطباق وهنلاقي حاجة تعجبك.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-brand h-12 px-6 text-sm">
            <Home className="h-4 w-4" aria-hidden />
            الرئيسية
          </Link>
          <Link href="/categories" className="btn-ghost h-12 px-6 text-sm">
            <LayoutGrid className="h-4 w-4" aria-hidden />
            تصفح الأقسام
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
