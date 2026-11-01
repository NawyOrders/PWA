import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Flame, LayoutGrid } from "lucide-react";
import { MobileHomeHeader } from "@/components/home/mobile-home-header";
import { DesktopTopBar } from "@/components/home/desktop-top-bar";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { CategoryGrid, CategoryStrip } from "@/components/menu/category-views";
import { FoodCard } from "@/components/menu/food-card";
import { MenuExplorer } from "@/components/menu/menu-explorer";
import { CartTeaser } from "@/components/home/cart-teaser";
import { AppPromo } from "@/components/home/app-promo";
import { getPopularProducts } from "@/lib/data";
import { pageMetadata, restaurantSchema, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "اطلب ألذ البرجر والوجبات السريعة أونلاين",
  description:
    "اطلب من ناوي أوردر برجر وبيتزا وفرايد تشيكن طازة مع توصيل سريع في أسكندرية والقاهرة. عروض يومية، دفع عند الاستلام، وتتبع مباشر لطلبك.",
  path: "/",
});

export default function HomePage() {
  const popular = getPopularProducts(5);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([websiteSchema, restaurantSchema]),
        }}
      />

      <div className="pt-4 lg:pt-6">
        <MobileHomeHeader />

        <div className="container-page">
          <DesktopTopBar searchId="home-search" />

          <div className="mt-4 lg:mt-6">
            <HeroCarousel />
          </div>

          <section aria-labelledby="home-categories" className="mt-7 lg:mt-10">
            <div id="home-categories" className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold sm:text-2xl">الأقسام</h2>
                <LayoutGrid className="h-5 w-5 text-brand" aria-hidden />
              </div>
              <Link
                href="/categories"
                className="hidden text-sm font-bold text-brand transition hover:text-brand-strong sm:inline-flex"
              >
                عرض كل الأصناف (12)
              </Link>
            </div>

            <div className="mt-4 lg:hidden">
              <CategoryStrip active="burger" />
            </div>
            <div className="mt-5 hidden lg:block">
              <CategoryGrid active="burger" />
            </div>
          </section>

          <section aria-labelledby="home-popular" className="mt-8 lg:mt-12">
            <div id="home-popular" className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold sm:text-2xl">الأكثر طلبًا</h2>
              <Flame className="h-5 w-5 fill-brand text-brand" aria-hidden />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
              {popular.map((product, index) => (
                <div
                  key={product.slug}
                  className={index === 4 ? "hidden lg:block" : undefined}
                >
                  <FoodCard product={product} priority={index < 2} />
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="home-menu" className="mt-9 lg:mt-12">
            <div id="home-menu">
              <MenuExplorer limit={4} />
            </div>
            <div className="mt-6 flex justify-center">
              <Link href="/categories" className="btn-ghost text-sm">
                عرض جميع أصناف القائمة
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>

          <div className="mt-8 lg:mt-12">
            <CartTeaser />
          </div>

          <div className="mt-8 lg:mt-12">
            <AppPromo />
          </div>
        </div>
      </div>
    </>
  );
}
