import { ar } from "./ar";
import { en } from "./en";
import type { Dictionary, Locale } from "./types";

export const dictionaries = { ar, en } satisfies Record<Locale, Dictionary>;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
