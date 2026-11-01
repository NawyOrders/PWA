import type { MetadataRoute } from "next";
import { categories, products, site } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, lastModified, changeFrequency: "daily", priority: 1 },
    {
      url: `${site.url}/categories`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${site.url}/categories/${category.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${site.url}/product/${product.slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
