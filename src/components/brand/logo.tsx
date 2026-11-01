import Link from "next/link";
import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-10 w-10", className)}
      role="img"
      aria-label="شعار ناوي أوردر"
    >
      <rect width="64" height="64" rx="18" fill="#ed4227" />
      <path
        d="M17 27.5c1.7 10.8 7.9 17.5 15 17.5s13.3-6.7 15-17.5"
        fill="none"
        stroke="#fff"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="19" r="2.9" fill="#fff" />
    </svg>
  );
}

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5"
      aria-label="ناوي أوردر — الصفحة الرئيسية"
    >
      <LogoMark className="h-11 w-11" />
      {withWordmark ? (
        <span className="hidden flex-col leading-none sm:flex">
          <span className="text-xl font-extrabold tracking-tight">ناوي أوردر</span>
          <span className="mt-1 text-[11px] font-medium text-muted">
            أكل يوصلك لحد البيت
          </span>
        </span>
      ) : null}
    </Link>
  );
}
