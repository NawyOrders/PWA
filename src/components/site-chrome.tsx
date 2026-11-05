"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { CartBar } from "@/components/cart-bar";
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
  "/categories",
  "/profile/edit",
  "/help",
  "/about",
];
const noFooter = ["/login", "/checkout", "/addresses", "/offline", "/help"];
// Screens that already own a cart call-to-action would only double it up.
const noCartBar = ["/cart", "/checkout", "/product", "/login", "/offline"];

/**
 * Keeps the pinned cart bar from covering the last row of desktop content.
 * On mobile, only the bottom navigation needs clearance. The desktop footer
 * already sits below the content and gets its own clearance.
 */
function cartBarSpacing(options: {
  hasBottomNav: boolean;
  hasCartBar: boolean;
  hasFooter: boolean;
}): string {
  const { hasBottomNav, hasCartBar, hasFooter } = options;
  if (!hasCartBar) return hasBottomNav ? "pb-24 lg:pb-0" : "";
  const mobile = hasBottomNav ? "pb-24" : "";
  return `${mobile} ${hasFooter ? "lg:pb-0" : "lg:pb-32"}`.trim();
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    count,
    loggedIn,
    ready,
    loginPromptOpen,
    openLoginPrompt,
    closeLoginPrompt,
  } = useApp();
  const protectedPath = isProtectedPath(pathname);
  // Never paint account/checkout content before the session has been restored:
  // a signed-out visitor would otherwise see private UI for one frame.
  const hideProtectedPage = protectedPath && (!ready || !loggedIn);
  const hideBottomNav =
    noBottomNav.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/orders/");
  const hideFooter = noFooter.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const showCartBar =
    count > 0 && !noCartBar.some((path) => pathname === path || pathname.startsWith(`${path}/`));

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
      <main
        className={cartBarSpacing({
          hasBottomNav: !hideBottomNav,
          hasCartBar: showCartBar,
          hasFooter: !hideFooter,
        })}
      >
        <div
          key={pathname}
          className={`motion-page${hideProtectedPage ? " invisible" : ""}`}
          aria-hidden={hideProtectedPage}
          inert={hideProtectedPage}
        >
          {children}
        </div>
      </main>
      {showCartBar ? <CartBar aboveBottomNav={!hideBottomNav} /> : null}
      {hideFooter ? null : <Footer />}
      {/* The bar floats over the page edge on desktop, so give the footer room. */}
      {showCartBar ? <div aria-hidden className="hidden h-28 lg:block" /> : null}
      {hideBottomNav ? null : <BottomNav />}
      {loginPromptOpen ? <LoginRequiredDialog onClose={closeLoginPrompt} /> : null}
    </>
  );
}
