import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ناوي أوردرز | Nawy Orders",
    short_name: "ناوي أوردرز",
    description:
      "اطلب برجر وبيتزا وفرايد تشيكن على مزاجك مع توصيل سريع وعروض حصرية من ناوي أوردرز.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FBF3EA",
    theme_color: "#E8452C",
    lang: "ar",
    dir: "rtl",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "سلتي",
        short_name: "السلة",
        url: "/cart",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "الأقسام",
        short_name: "الأقسام",
        url: "/categories",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "طلباتي",
        short_name: "طلباتي",
        url: "/orders",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
