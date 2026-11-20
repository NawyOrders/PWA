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
        src: "/icons/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "سلتي",
        short_name: "السلة",
        url: "/cart",
        icons: [{ src: "/icons/logo.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "الأقسام",
        short_name: "الأقسام",
        url: "/categories",
        icons: [{ src: "/icons/logo.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "طلباتي",
        short_name: "طلباتي",
        url: "/orders",
        icons: [{ src: "/icons/logo.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
  };
}
