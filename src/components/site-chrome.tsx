"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { LoginRequiredDialog } from "@/components/login-required-dialog";
import { useApp } from "@/components/providers";

const noBottomNav = [
  "/login",
  "/checkout",
  "/addresses",
  "/offline",
  "/product",
  "/favorites",
  "/notifications",
  "/settings",
  "/orders",
  "/profile/edit",
  "/help",
  "/about",
];
const noFooter = ["/login", "/checkout", "/addresses", "/offline", "/help"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loggedIn, ready, loginPromptOpen, openLoginPrompt, closeLoginPrompt } = useApp();
  const restrictedProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const hideRestrictedProfile = ready && restrictedProfile && !loggedIn;
  const hideBottomNav = noBottomNav.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hideFooter = noFooter.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (ready && pathname === "/cart" && !loggedIn) openLoginPrompt();
  }, [loggedIn, openLoginPrompt, pathname, ready]);

  useEffect(() => {
    if (ready && restrictedProfile && !loggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loggedIn, pathname, ready, restrictedProfile, router]);

  return (
    <>
      <Navbar />
      <main className={hideBottomNav ? "" : "pb-24 lg:pb-0"}>{hideRestrictedProfile ? null : children}</main>
      {hideFooter ? null : <Footer />}
      {hideBottomNav ? null : <BottomNav />}
      {loginPromptOpen ? <LoginRequiredDialog onClose={closeLoginPrompt} /> : null}
    </>
  );
}
