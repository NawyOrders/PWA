import Link from "next/link";
import { LogoMark } from "@/components/logo";

/**
 * Friendly 404 for a host that does not map to a tenant.
 *
 * This is rendered both for a reserved/unknown slug and for a `404 Tenant Not
 * Found` answer from the tenant API during the server-side branding fetch. It
 * is deliberately provider-free: when the tenant provider itself calls
 * `notFound()`, there is no `AppProvider` above this page to read from.
 */
export default function NotFound() {
  return (
    <div className="shell flex min-h-[72vh] items-center justify-center py-10">
      <div className="card w-full max-w-[460px] px-6 py-10 text-center">
        <div className="flex justify-center">
          <LogoMark className="motion-float size-16" />
        </div>
        <p className="mt-6 font-display text-5xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-xl font-extrabold">المتجر غير موجود</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-muted">
          العنوان ده مش مرتبط بمتجر نشط على ناوي أوردرز. تأكد من الرابط أو تواصل مع المطعم.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-muted" dir="ltr">
          This address doesn&apos;t point to an active Nawy Orders store. Check the link or contact the
          restaurant.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-white shadow-[0_14px_26px_-16px_rgba(232,69,44,0.9)] transition hover:bg-brand-dark"
        >
          ناوي أوردرز · Nawy Orders
        </Link>
      </div>
    </div>
  );
}
