import { notFound } from "next/navigation";
import { ServiceWorkerRegistration } from "@/app/ServiceWorkerRegistration";
import { DictionaryProvider } from "@/lib/i18n/DictionaryProvider";
import { getDirection, isLocale, locales } from "@/lib/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <DictionaryProvider locale={locale}>
      <div lang={locale} dir={getDirection(locale)}>
        <ServiceWorkerRegistration />
        {children}
      </div>
    </DictionaryProvider>
  );
}
