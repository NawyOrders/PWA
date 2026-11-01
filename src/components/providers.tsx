"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { productsById, seedCart, seedFavorites } from "@/lib/data";
import { translate, type Lang, type Vars } from "@/lib/i18n";

export type CartLine = {
  key: string;
  productId: string;
  qty: number;
  price: number;
  size?: string;
  extras?: string[];
  note?: string;
};

type AddOptions = {
  qty?: number;
  size?: string;
  extras?: string[];
  note?: string;
  price: number;
};

type AppContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (productId: string, options: AddOptions) => void;
  quickAdd: (productId: string) => void;
  changeQty: (key: string, delta: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  loggedIn: boolean;
  login: () => void;
  logout: () => void;
  toast: (message: string, kind?: ToastKind) => void;
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  t: (text: string, vars?: Vars) => string;
};

type ToastKind = "cart" | "info";

type ToastState = { id: number; message: string; kind: ToastKind } | null;

const AppContext = createContext<AppContextValue | null>(null);

const CART_KEY = "nawy-cart-v1";
const FAVORITES_KEY = "nawy-favorites-v1";
const AUTH_KEY = "nawy-auth-v1";
const LANG_KEY = "nawy-lang-v1";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(seedCart);
  const [favorites, setFavorites] = useState<string[]>(seedFavorites);
  const [loggedIn, setLoggedIn] = useState(true);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [lang, setLang] = useState<Lang>("ar");
  const [ready, setReady] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);

  useEffect(() => {
    setLines(readStorage<CartLine[]>(CART_KEY, seedCart));
    setFavorites(readStorage<string[]>(FAVORITES_KEY, seedFavorites));
    setLoggedIn(readStorage<boolean>(AUTH_KEY, true));
    setLang(readStorage<Lang>(LANG_KEY, "ar") === "en" ? "en" : "ar");
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    if (ready) window.localStorage.setItem(LANG_KEY, JSON.stringify(lang));
  }, [lang, dir, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(AUTH_KEY, JSON.stringify(loggedIn));
  }, [loggedIn, ready]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = "cart") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastState({ id: Date.now(), message, kind });
    toastTimer.current = setTimeout(() => setToastState(null), 2800);
  }, []);

  const addItem = useCallback(
    (productId: string, options: AddOptions) => {
      const product = productsById[productId];
      if (!product) return;
      const size = options.size ?? "";
      const extras = options.extras?.length ? [...options.extras].sort() : [];
      const key = [productId, size, extras.join("+")].filter(Boolean).join("|");
      setLines((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) {
          return current.map((line) =>
            line.key === key ? { ...line, qty: line.qty + (options.qty ?? 1) } : line,
          );
        }
        return [
          ...current,
          {
            key,
            productId,
            qty: options.qty ?? 1,
            price: options.price,
            size: size || undefined,
            extras: extras.length ? extras : undefined,
            note: options.note || undefined,
          },
        ];
      });
      toast(t("تمت إضافة {name} إلى السلة", { name: t(product.name) }));
    },
    [toast, t],
  );

  const quickAdd = useCallback(
    (productId: string) => {
      const product = productsById[productId];
      if (!product) return;
      addItem(productId, { price: product.price, size: "ساندوتش فقط" });
    },
    [addItem],
  );

  const changeQty = useCallback((key: string, delta: number) => {
    setLines((current) =>
      current.flatMap((line) => {
        if (line.key !== key) return [line];
        const nextQty = line.qty + delta;
        return nextQty <= 0 ? [] : [{ ...line, qty: nextQty }];
      }),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    toast(t("تم تفريغ السلة"));
  }, [toast, t]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((current) => {
        const exists = current.includes(id);
        toast(t(exists ? "تمت الإزالة من المفضلة" : "تمت الإضافة إلى المفضلة"), "info");
        return exists ? current.filter((item) => item !== id) : [...current, id];
      });
    },
    [toast, t],
  );

  const login = useCallback(() => {
    setLoggedIn(true);
    toast(t("تم تسجيل الدخول بنجاح"), "info");
  }, [toast, t]);

  const logout = useCallback(() => {
    setLoggedIn(false);
    toast(t("تم تسجيل الخروج"), "info");
  }, [toast, t]);

  const count = useMemo(() => lines.reduce((total, line) => total + line.qty, 0), [lines]);
  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + line.price * line.qty, 0),
    [lines],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      lines,
      count,
      subtotal,
      addItem,
      quickAdd,
      changeQty,
      removeLine,
      clearCart,
      favorites,
      isFavorite,
      toggleFavorite,
      loggedIn,
      login,
      logout,
      toast,
      lang,
      dir,
      setLang,
      t,
    }),
    [
      lines,
      count,
      subtotal,
      addItem,
      quickAdd,
      changeQty,
      removeLine,
      clearCart,
      favorites,
      isFavorite,
      toggleFavorite,
      loggedIn,
      login,
      logout,
      toast,
      lang,
      dir,
      setLang,
      t,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      {toastState ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex justify-center px-4 lg:bottom-8">
          <div
            key={toastState.id}
            className="animate-toast-in pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]"
          >
            <span className="grid size-7 place-items-center rounded-full bg-brand text-white">
              {toastState.kind === "cart" ? <ShoppingCart className="size-4" /> : <Check className="size-4" />}
            </span>
            <span>{toastState.message}</span>
            {toastState.kind === "cart" ? (
              <Link
                href="/cart"
                className="whitespace-nowrap text-brand-soft underline decoration-brand/60 underline-offset-4"
              >
                {t("عرض السلة")}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
