import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2, Cairo } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers";
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
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
      <body>
        <AppProvider>
          <SiteChrome>{children}</SiteChrome>
        </AppProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
