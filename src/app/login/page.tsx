import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/profile";
  return <LoginView next={next} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="shell flex min-h-[60vh] items-center justify-center py-8" aria-hidden="true">
          <div className="h-[440px] w-full max-w-[540px] animate-pulse rounded-[30px] bg-white/70" />
        </div>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
