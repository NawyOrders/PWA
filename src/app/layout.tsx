import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic } from "next/font/google";
import "./globals.css";

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic", "latin"],
  variable: "--font-noto-kufi",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NawyOrders | طلبك على مزاجك",
    template: "%s | NawyOrders",
  },
  description: "اطلب وجبتك المفضلة بسهولة مع NawyOrders.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "NawyOrders", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#17243b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${notoKufi.variable} antialiased`}>{children}</body>
    </html>
  );
}
