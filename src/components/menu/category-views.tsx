import Image from "next/image";
import Link from "next/link";
import { categories, categoriesBySlug, homeCategorySlugs, type CategorySlug } from "@/lib/data";
import { cn } from "@/lib/format";

export function CategoryStrip({
  active,
  slugs = homeCategorySlugs,
  className,
}: {
  active?: CategorySlug;
  slugs?: CategorySlug[];
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0", className)}>
      {slugs.map((slug) => {
        const category = categoriesBySlug[slug];
        const isActive = active === slug;
        return (
          <Link
            key={slug}
            href={`/categories/${slug}`}
            aria-current={isActive ? "page" : undefined}
            className="flex w-[64px] flex-none flex-col items-center gap-2 sm:w-[72px]"
          >
            <span
              className={cn(
                "grid h-[62px] w-[62px] place-items-center rounded-full border-2 bg-white p-1.5 transition sm:h-[70px] sm:w-[70px]",
                isActive
                  ? "border-sun shadow-float"
                  : "border-line hover:border-brand-mist",
              )}
            >
              <Image
                src={category.icon}
                alt={category.name}
                width={56}
                height={56}
                className="h-full w-full rounded-full object-cover"
              />
            </span>
            <span
              className={cn(
                "text-xs font-bold transition",
                isActive ? "text-brand" : "text-ink-soft",
              )}
            >
              {category.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function CategoryGrid({
  active,
  className,
}: {
  active?: CategorySlug;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-4 gap-4 xl:grid-cols-7", className)}>
      {categories.map((category) => {
        const isActive = active === category.slug;
        return (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex flex-col items-center gap-2.5 rounded-2xl border bg-white px-3 py-5 text-center shadow-soft transition hover:-translate-y-0.5 hover:border-brand-mist",
              isActive ? "border-brand ring-1 ring-brand/20" : "border-line/80",
            )}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-cream p-2 transition group-hover:bg-brand-soft">
              <Image
                src={category.icon}
                alt={category.name}
                width={56}
                height={56}
                className="h-full w-full rounded-full object-cover"
              />
            </span>
            <span className="text-sm font-bold">{category.name}</span>
            <span className="text-[11px] font-medium text-muted">{category.count} صنف</span>
          </Link>
        );
      })}
    </div>
  );
}
