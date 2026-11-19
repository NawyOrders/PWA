"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { readStorage, writeStorage } from "@/lib/storage";

type Decoder<T> = (stored: unknown, fallback: T) => T;

/**
 * useState backed by localStorage.
 *
 * Rendering starts from `initial` (safe on the server), hydrates once after
 * mount, and only writes after hydration so seed data cannot overwrite a
 * returning customer's saved state.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  decode: Decoder<T>,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStorage<unknown>(key, undefined);
    setValue(stored === undefined ? initial : decode(stored, initial));
    setHydrated(true);
    // `key`, `initial` and `decode` are module constants at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (hydrated) writeStorage(key, value);
  }, [hydrated, key, value]);

  return [value, setValue, hydrated];
}
