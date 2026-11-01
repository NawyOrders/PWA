"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { MenuRow } from "@/components/menu/menu-row";
import { menuFilters, products, type MenuFilter } from "@/lib/data";
import { cn } from "@/lib/format";

export function MenuExplorer({ limit = 4 }: { limit?: number }) {
  const [filter, setFilter] = useState<MenuFilter>("all");

  const filtered =
    filter === "all"
      ? products
      : products.filter((product) => product.tags.includes(filter));

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-extrabold sm:text-2xl">قائمة الطعام</h2>
          <Menu className="h-5 w-5 text-brand" aria-hidden />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:justify-end lg:px-0">
          {menuFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={cn("chip", filter === item.id && "chip-active")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        تعلّم وجبات المطعم كاملة وأضفها بضغطة واحدة.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.slice(0, limit).map((product) => (
          <MenuRow key={product.slug} product={product} />
        ))}
      </div>
    </div>
  );
}
