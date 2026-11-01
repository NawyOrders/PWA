"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";

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
  const hideBottomNav = noBottomNav.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hideFooter = noFooter.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Navbar />
      <main className={hideBottomNav ? "" : "pb-24 lg:pb-0"}>{children}</main>
      {hideFooter ? null : <Footer />}
      {hideBottomNav ? null : <BottomNav />}
    </>
  );
}
