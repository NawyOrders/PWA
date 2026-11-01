import type { MetadataRoute } from "next";
import { site } from "@/lib/data";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdf8f3",
    theme_color: "#ed4227",
    lang: "ar",
    dir: "rtl",
    orientation: "portrait",
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
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "الأقسام", url: "/categories" },
      { name: "السلة", url: "/cart" },
      { name: "طلباتي", url: "/orders" },
    ],
  };
}
