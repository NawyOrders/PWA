import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";
import { LoadingIndicator } from "@/components/loading-indicator";
import { sanitizeNextPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return <LoginView next={sanitizeNextPath(params.next)} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="shell flex min-h-[60vh] items-center justify-center py-8">
          <LoadingIndicator className="size-16" />
        </div>
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
