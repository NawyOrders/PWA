import type { Metadata } from "next";
import { categories, products, site } from "@/lib/data";

const OG_IMAGE = {
  url: "/images/brand/hero.jpg",
  width: 1600,
  height: 914,
  alt: "برجر طازج مع بطاطس ومشروب من ناوي أوردر",
};

export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; width: number; height: number; alt: string };
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: path,
      siteName: site.name,
      locale: "ar_EG",
      type: "website",
      images: [image ?? OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [(image ?? OG_IMAGE).url],
    },
  };
}

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  alternateName: site.nameEn,
  url: site.url,
  inLanguage: "ar",
  description: site.description,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${site.url}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: site.name,
  alternateName: site.nameEn,
  url: site.url,
  image: `${site.url}/images/brand/hero.jpg`,
  logo: `${site.url}/icon.svg`,
  description: site.description,
  servesCuisine: ["برجر", "بيتزا", "فرايد تشيكن", "وجبات سريعة"],
  priceRange: "25 - 210 EGP",
  currenciesAccepted: "EGP",
  paymentAccepted: "Cash, Credit Card, InstaPay",
  telephone: site.phone,
  areaServed: site.areaServed,
  address: {
    "@type": "PostalAddress",
    streetAddress: "زهراء المعادي، المعراج العلوي",
    addressLocality: "القاهرة",
    addressCountry: "EG",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "11:00",
      closes: "01:30",
    },
  ],
  hasMenu: {
    "@type": "Menu",
    name: "قائمة الطعام",
    hasMenuSection: categories.map((category) => ({
      "@type": "MenuSection",
      name: category.name,
      numberOfItems: category.count,
      url: `${site.url}/categories/${category.slug}`,
    })),
  },
  hasDeliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"],
  sameAs: [],
};

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}

export function productSchema(slug: string) {
  const product = products.find((item) => item.slug === slug);
  if (!product) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `${site.url}${product.image}`,
    sku: product.slug,
    category: "Food & Beverage",
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: `${site.url}/product/${product.slug}`,
      priceCurrency: "EGP",
      price: product.price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    nutrition: product.calories
      ? {
          "@type": "NutritionInformation",
          calories: `${product.calories} kcal`,
        }
      : undefined,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "1240",
    },
  };
}

export function itemListSchema(
  items: Array<{ name: string; path: string }>,
  name: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${site.url}${item.path}`,
    })),
  };
}
