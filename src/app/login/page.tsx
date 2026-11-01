import type { Metadata } from "next";
import { LoginView } from "@/components/login-view";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/profile";
  return <LoginView next={next} />;
}
