import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { site } from "@/lib/data";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "ناوي أوردر | اطلب البرجر والوجبات السريعة أونلاين",
    template: "%s | ناوي أوردر",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "ناوي أوردر",
    "توصيل طعام",
    "طلب برجر أونلاين",
    "وجبات سريعة",
    "بيتزا",
    "فرايد تشيكن",
    "توصيل أسكندرية",
    "مطعم أونلاين",
  ],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  category: "food",
  alternates: {
    canonical: "/",
    languages: { "ar-EG": "/" },
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: site.name,
    title: "ناوي أوردر | اطلب البرجر والوجبات السريعة أونلاين",
    description: site.description,
    url: "/",
    images: [
      {
        url: "/images/brand/hero.jpg",
        width: 1600,
        height: 914,
        alt: "برجر طازج مع بطاطس ومشروب من ناوي أوردر",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ناوي أوردر | اطلب البرجر والوجبات السريعة أونلاين",
    description: site.description,
    images: ["/images/brand/hero.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: site.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ed4227",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={cairo.variable}>
      <head>
        <script
          // Apply the saved reading direction before first paint to avoid an RTL flash.
          dangerouslySetInnerHTML={{
            __html:
              'try{var s=JSON.parse(localStorage.getItem("nawy-order-store-v1"));var e=s&&s.locale==="en";document.documentElement.lang=e?"en":"ar";document.documentElement.dir=e?"ltr":"rtl"}catch(_){}',
          }}
        />
      </head>
      <body className="min-h-screen bg-cream text-ink antialiased">
        <StoreProvider>
          <a href="#main" className="skip-link">
            تجاوز إلى المحتوى
          </a>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main id="main" className="flex-1 pb-24 lg:pb-0">
              {children}
            </main>
            <SiteFooter />
            <BottomTabBar />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
