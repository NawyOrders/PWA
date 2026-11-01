import { Search } from "lucide-react";
import { cn } from "@/lib/format";

export function SearchField({
  defaultValue = "",
  id = "site-search",
  className,
  compact = false,
}: {
  defaultValue?: string;
  id?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={cn("relative", className)}
    >
      <label htmlFor={id} className="sr-only">
        ابحث عن أي طبق تريده
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="ابحث عن أي طبق تريده..."
        autoComplete="off"
        className={cn(
          "w-full rounded-2xl border border-line bg-white pe-4 ps-12 text-sm shadow-soft transition placeholder:text-[#b7a79c] focus:border-brand-mist focus:outline-none focus:ring-4 focus:ring-brand/10",
          compact ? "h-11" : "h-12",
        )}
      />
      <button
        type="submit"
        aria-label="بحث"
        className="absolute inset-y-0 start-2 my-auto grid h-9 w-9 place-items-center rounded-full text-brand transition hover:bg-brand-soft"
      >
        <Search className="h-5 w-5" aria-hidden />
      </button>
    </form>
  );
}
