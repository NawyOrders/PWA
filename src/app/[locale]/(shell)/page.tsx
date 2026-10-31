import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isLocale } from "@/lib/i18n/config";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-black tracking-tight text-nawy-navy sm:text-6xl">
        {dictionary.home.welcomeMessage}
      </h1>
    </main>
  );
}
