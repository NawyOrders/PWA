import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginExperience } from "@/components/auth/login-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "تسجيل الدخول",
  description: "سجل دخولك إلى ناوي أوردر برقم موبايلك وكمّل طلبك في ثواني.",
  path: "/login",
  noIndex: true,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = params.next;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const nextHref = candidate && candidate.startsWith("/") ? candidate : "/cart";

  return <LoginExperience nextHref={nextHref} />;
}

function LoginFallback() {
  return (
    <div className="container-page pt-6">
      <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-white/80 lg:mx-0" />
      <div className="mt-4 h-8 w-56 animate-pulse rounded-full bg-white/80" />
      <div className="card mt-6 h-96 animate-pulse bg-white/70" />
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
