"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { useApp } from "@/components/providers";

export function SearchField({
  defaultValue = "",
  placeholder = "ابحث عن أي طبق تريده...",
  className = "",
  inputClassName = "h-12",
  autoFocus = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const { t } = useApp();
  const [value, setValue] = useState(defaultValue);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim() || t("برجر");
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={submit} role="search" className={`relative ${className}`}>
      <button
        type="submit"
        aria-label={t("بحث")}
        className="absolute start-4 top-1/2 z-10 -translate-y-1/2 text-muted transition hover:text-brand"
      >
        <Search className="size-5" />
      </button>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t(placeholder)}
        aria-label={t("البحث في المنيو")}
        autoFocus={autoFocus}
        className={`w-full rounded-full border border-line bg-white pe-11 ps-12 text-sm font-medium shadow-soft outline-none transition placeholder:text-muted/90 focus:border-brand/40 focus:ring-4 focus:ring-brand/5 ${inputClassName}`}
      />
      {value ? (
        <button
          type="button"
          aria-label={t("مسح البحث")}
          onClick={() => setValue("")}
          className="absolute end-4 top-1/2 -translate-y-1/2 text-muted transition hover:text-brand"
        >
          <X className="size-4.5" />
        </button>
      ) : null}
    </form>
  );
}
