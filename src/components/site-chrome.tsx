"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { LoginRequiredDialog } from "@/components/login-required-dialog";
import { useApp } from "@/components/providers";
import { isProtectedPath, loginHref } from "@/lib/routes";

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
  const protectedPath = isProtectedPath(pathname);
  const hideProtectedPage = ready && protectedPath && !loggedIn;
  const hideBottomNav = noBottomNav.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hideFooter = noFooter.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (ready && pathname === "/cart" && !loggedIn) openLoginPrompt(pathname);
  }, [loggedIn, openLoginPrompt, pathname, ready]);

  useEffect(() => {
    if (ready && protectedPath && !loggedIn) {
      router.replace(loginHref(pathname));
    }
  }, [loggedIn, pathname, protectedPath, ready, router]);

  return (
    <>
      <Navbar />
      <main className={hideBottomNav ? "" : "pb-24 lg:pb-0"}>{hideProtectedPage ? null : children}</main>
      {hideFooter ? null : <Footer />}
      {hideBottomNav ? null : <BottomNav />}
      {loginPromptOpen ? <LoginRequiredDialog onClose={closeLoginPrompt} /> : null}
    </>
  );
}
