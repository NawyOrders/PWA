"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/data";

export type Fulfillment = "delivery" | "pickup";

export type Locale = "ar" | "en";

export interface CartLine {
  key: string;
  slug: string;
  name: string;
  image: string;
  unitPrice: number;
  qty: number;
  extras: string[];
  notes?: string;
}

interface AddOptions {
  qty?: number;
  extras?: string[];
  notes?: string;
  unitPrice?: number;
}

interface StoreValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  fulfillment: Fulfillment;
  setFulfillment: (value: Fulfillment) => void;
  promo: string | null;
  applyPromo: (code: string) => boolean;
  clearPromo: () => void;
  addItem: (product: Product, options?: AddOptions) => void;
  removeLine: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
  favorites: string[];
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
  branchId: string;
  setBranchId: (id: string) => void;
  loggedIn: boolean;
  login: () => void;
  logout: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const CartContext = createContext<StoreValue | null>(null);

const STORAGE_KEY = "nawy-order-store-v1";
const FREE_DELIVERY_OVER = 999;

const seedLines: CartLine[] = [
  {
    key: "seed-samak",
    slug: "burger-samak",
    name: "برجر سمك",
    image: "/images/products/burger.jpg",
    unitPrice: 125,
    qty: 1,
    extras: [],
  },
  {
    key: "seed-lahm",
    slug: "burger-lahm",
    name: "برجر لحم",
    image: "/images/products/burger.jpg",
    unitPrice: 120,
    qty: 1,
    extras: [],
  },
  {
    key: "seed-dajaj",
    slug: "burger-dajaj",
    name: "برجر دجاج",
    image: "/images/products/burger.jpg",
    unitPrice: 100,
    qty: 1,
    extras: [],
  },
];

const seedFavorites = [
  "burger-samak",
  "burger-lahm",
  "burger-dajaj",
  "burger-nabati",
  "pizza-pepperoni",
  "pizza-margherita",
  "fried-chicken-meal",
  "chicken-strips",
  "toast-chicken",
  "lemon-mint",
];

interface PersistedState {
  lines: CartLine[];
  favorites: string[];
  fulfillment: Fulfillment;
  branchId: string;
  loggedIn: boolean;
  promo: string | null;
  locale: Locale;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(seedLines);
  const [favorites, setFavorites] = useState<string[]>(seedFavorites);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [branchId, setBranchId] = useState("nakhil");
  const [loggedIn, setLoggedIn] = useState(true);
  const [promo, setPromo] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("ar");
  const [hydrated, setHydrated] = useState(false);
  const promoRate = promo === "NAWY10" ? 0.1 : 0;

  // State must load after mount so the first client render matches the server.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        if (Array.isArray(saved.lines)) setLines(saved.lines);
        if (Array.isArray(saved.favorites)) setFavorites(saved.favorites);
        if (saved.fulfillment === "pickup" || saved.fulfillment === "delivery") {
          setFulfillment(saved.fulfillment);
        }
        if (typeof saved.branchId === "string") setBranchId(saved.branchId);
        if (typeof saved.loggedIn === "boolean") setLoggedIn(saved.loggedIn);
        if (typeof saved.promo === "string" || saved.promo === null) {
          setPromo(saved.promo ?? null);
        }
        if (saved.locale === "ar" || saved.locale === "en") setLocale(saved.locale);
      }
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = {
      lines,
      favorites,
      fulfillment,
      branchId,
      loggedIn,
      promo,
      locale,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage might be unavailable */
    }
  }, [hydrated, lines, favorites, fulfillment, branchId, loggedIn, promo, locale]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const addItem = useCallback((product: Product, options: AddOptions = {}) => {
    const qty = Math.max(1, options.qty ?? 1);
    const extras = options.extras ?? [];
    const unitPrice = options.unitPrice ?? product.price;
    setLines((current) => {
      const match = current.find(
        (line) =>
          line.slug === product.slug &&
          line.unitPrice === unitPrice &&
          line.extras.join("|") === extras.join("|") &&
          (line.notes ?? "") === (options.notes ?? ""),
      );
      if (match) {
        return current.map((line) =>
          line.key === match.key ? { ...line, qty: line.qty + qty } : line,
        );
      }
      return [
        ...current,
        {
          key: `${product.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          slug: product.slug,
          name: product.name,
          image: product.image,
          unitPrice,
          qty,
          extras,
          notes: options.notes,
        },
      ];
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((current) =>
      current
        .map((line) => (line.key === key ? { ...line, qty: Math.max(0, qty) } : line))
        .filter((line) => line.qty > 0),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }, []);

  const applyPromo = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (normalized === "NAWY10") {
      setPromo(normalized);
      return true;
    }
    return false;
  }, []);

  const value = useMemo<StoreValue>(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
    const deliveryFee =
      fulfillment === "pickup" || subtotal === 0 || subtotal >= FREE_DELIVERY_OVER ? 0 : 30;
    const discount = Math.round(subtotal * promoRate);
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      subtotal,
      deliveryFee,
      discount,
      total: Math.max(0, subtotal + deliveryFee - discount),
      fulfillment,
      setFulfillment,
      promo,
      applyPromo,
      clearPromo: () => setPromo(null),
      addItem,
      removeLine,
      setQty,
      clearCart,
      favorites,
      isFavorite: (slug: string) => favorites.includes(slug),
      toggleFavorite,
      branchId,
      setBranchId,
      loggedIn,
      login: () => setLoggedIn(true),
      logout: () => setLoggedIn(false),
      locale,
      setLocale,
    };
  }, [
    lines,
    fulfillment,
    promo,
    promoRate,
    applyPromo,
    addItem,
    removeLine,
    setQty,
    clearCart,
    favorites,
    toggleFavorite,
    branchId,
    loggedIn,
    locale,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useStore() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useStore must be used inside StoreProvider");
  }
  return context;
}
