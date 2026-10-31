"use client";

import { createContext, useContext, useMemo } from "react";
import { getDictionary } from "./dictionary";
import type { DictionaryContextValue, Locale } from "./types";

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  locale,
  children,
}: Readonly<{ locale: Locale; children: React.ReactNode }>) {
  const value = useMemo(() => ({ locale, dictionary: getDictionary(locale) }), [locale]);

  return <DictionaryContext.Provider value={value}>{children}</DictionaryContext.Provider>;
}

export function useDictionary(): DictionaryContextValue {
  const context = useContext(DictionaryContext);
  if (!context) throw new Error("useDictionary must be used inside DictionaryProvider");
  return context;
}
