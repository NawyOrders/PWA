import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NawyOrders",
    short_name: "NawyOrders",
    description: "اطلب وجبتك المفضلة من NawyOrders",
    start_url: "/ar",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf2",
    theme_color: "#17243b",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
