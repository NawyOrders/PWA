import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";
import { LoadingIndicator } from "@/components/loading-indicator";
import { sanitizeNextPath } from "@/lib/routes";
import type { OtpPurpose } from "@/lib/api";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

/**
 * `?mode=register` is the second entry point the flow needs — the account
 * screen links here for a customer who has no login yet. Anything else, and no
 * parameter at all, is the sign-in door.
 */
function requestedMode(value: string | string[] | undefined): OtpPurpose {
  return (Array.isArray(value) ? value[0] : value) === "register" ? "Registration" : "Login";
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string | string[] }>;
}) {
  const params = await searchParams;
  return <LoginView next={sanitizeNextPath(params.next)} mode={requestedMode(params.mode)} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string | string[] }>;
}) {
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
