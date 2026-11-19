import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2, Cairo } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/components/tenant-provider";
import { SiteChrome } from "@/components/site-chrome";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { storageKeys } from "@/lib/storage";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const baloo = Baloo_Bhaijaan_2({
  subsets: ["arabic", "latin"],
  variable: "--font-baloo",
  display: "swap",
});

/*
 * Tenant resolution reads the request host, so every storefront route is
 * dynamic by definition. Blocking the prerender is intentional: the alternative
 * is a static shell that streams the wrong store's branding first.
 */
export const instant = false;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ناوي أوردرز | Nawy Orders",
    template: "%s | ناوي أوردرز",
  },
  description:
    "ناوي أوردرز — اطلب برجر وبيتزا وفرايد تشيكن على مزاجك، توصيل سريع وعروض حصرية. Nawy Orders food delivery PWA.",
  applicationName: "ناوي أوردرز",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ناوي أوردرز",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/logo.svg", type: "image/svg+xml" }],
  },
  keywords: ["ناوي أوردرز", "برجر", "توصيل", "Nawy Orders", "food delivery", "PWA"],
  openGraph: {
    title: "ناوي أوردرز | Nawy Orders",
    description: "اطلب أكلك المفضل من ناوي أوردرز — توصيل سريع وعروض على البرجر والبيتزا.",
    type: "website",
    locale: "ar_EG",
    images: [{ url: "/og/cover.jpg", width: 1200, height: 630, alt: "ناوي أوردرز" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#E8452C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${cairo.variable} ${baloo.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var v=localStorage.getItem(${JSON.stringify(storageKeys.lang)});if(v==='"en"'||v==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <TenantProvider>
          <SiteChrome>{children}</SiteChrome>
        </TenantProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
