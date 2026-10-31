import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isLocale } from "@/lib/i18n/config";

export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div className="max-w-md">
        <span className="text-6xl" role="img" aria-label="Offline">📡</span>
        <h1 className="mt-6 text-3xl font-black">{dictionary.offline.title}</h1>
        <p className="mt-3 leading-7 text-nawy-navy/60">{dictionary.offline.message}</p>
        <Link href={`/${locale}`} className="mt-7 inline-flex rounded-full bg-nawy-navy px-6 py-3 font-bold text-white">{dictionary.offline.backToMenu}</Link>
      </div>
    </main>
  );
}
