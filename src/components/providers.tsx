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
import { productsById, seedCart, seedFavorites, user } from "@/lib/data";
import { savedAddresses, type SavedAddress } from "@/lib/account-data";
import { translate, type Lang, type Vars } from "@/lib/i18n";
import { storageKeys } from "@/lib/storage";
import { usePersistentState } from "@/hooks/use-persistent-state";

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

export type Profile = {
  name: string;
  phone: string;
  email: string;
  avatar: string;
};

type AppContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (productId: string, options: AddOptions) => void;
  quickAdd: (productId: string) => void;
  changeQty: (key: string, delta: number) => void;
  removeLine: (key: string) => void;
  clearCart: (silent?: boolean) => void;
  coupon: string | null;
  applyCoupon: (code: string) => boolean;
  orderNote: string;
  setOrderNote: (note: string) => void;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  loggedIn: boolean;
  ready: boolean;
  loginPromptOpen: boolean;
  loginPromptNext: string | null;
  openLoginPrompt: (next?: string) => void;
  closeLoginPrompt: () => void;
  login: () => void;
  logout: () => void;
  addresses: SavedAddress[];
  addAddress: (address: SavedAddress) => void;
  removeAddress: (id: string) => void;
  selectedAddressId: string | null;
  selectAddress: (id: string | null) => void;
  fulfilment: "delivery" | "pickup";
  setFulfilment: (mode: "delivery" | "pickup") => void;
  toast: (message: string, kind?: ToastKind) => void;
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  t: (text: string, vars?: Vars) => string;
};

type ToastKind = "cart" | "info";

type ToastState = { id: number; message: string; kind: ToastKind } | null;

const AppContext = createContext<AppContextValue | null>(null);

const seedProfile: Profile = {
  name: user.name,
  phone: user.phone,
  email: user.email,
  avatar: user.avatar,
};

/* -------------------------------------------------------------------------- */
/* Decoders: storage is untrusted input, so every domain validates on hydrate. */
/* -------------------------------------------------------------------------- */

function decodeCart(stored: unknown, fallback: CartLine[]): CartLine[] {
  if (!Array.isArray(stored)) return fallback;
  return stored.filter(
    (line): line is CartLine =>
      Boolean(line) && typeof (line as CartLine).key === "string" && typeof (line as CartLine).productId === "string",
  );
}

function decodeFavorites(stored: unknown, fallback: string[]): string[] {
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : fallback;
}

function decodeAuth(stored: unknown): boolean {
  return stored === true;
}

function decodeLang(stored: unknown): Lang {
  return stored === "en" ? "en" : "ar";
}

function decodeAddresses(stored: unknown, fallback: SavedAddress[]): SavedAddress[] {
  if (!Array.isArray(stored)) return fallback;
  return stored.filter(
    (address): address is SavedAddress => Boolean(address) && typeof (address as SavedAddress).id === "string",
  );
}

function decodeSelectedAddress(stored: unknown, fallback: string | null): string | null {
  return typeof stored === "string" ? stored : fallback;
}

function decodeCoupon(stored: unknown): string | null {
  return stored === "NAWY20" ? "NAWY20" : null;
}

function decodeOrderNote(stored: unknown, fallback: string): string {
  return typeof stored === "string" ? stored.slice(0, 200) : fallback;
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.name === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.email === "string" &&
    typeof profile.avatar === "string"
  );
}

function decodeProfile(stored: unknown, fallback: Profile): Profile {
  return isProfile(stored) ? stored : fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lines, setLines, cartReady] = usePersistentState<CartLine[]>(storageKeys.cart, seedCart, decodeCart);
  const [favorites, setFavorites, favoritesReady] = usePersistentState<string[]>(
    storageKeys.favorites,
    seedFavorites,
    decodeFavorites,
  );
  const [loggedIn, setLoggedIn, authReady] = usePersistentState<boolean>(storageKeys.auth, false, decodeAuth);
  const [addresses, setAddresses, addressesReady] = usePersistentState<SavedAddress[]>(
    storageKeys.addresses,
    savedAddresses,
    decodeAddresses,
  );
  const [selectedAddressId, setSelectedAddressId, selectedAddressReady] = usePersistentState<string | null>(
    storageKeys.selectedAddress,
    savedAddresses[0].id,
    decodeSelectedAddress,
  );
  const [coupon, setCoupon, couponReady] = usePersistentState<string | null>(
    storageKeys.coupon,
    null,
    decodeCoupon,
  );
  const [orderNote, setOrderNote, orderNoteReady] = usePersistentState<string>(
    storageKeys.orderNote,
    "",
    decodeOrderNote,
  );
  const [profile, setProfile, profileReady] = usePersistentState<Profile>(
    storageKeys.profile,
    seedProfile,
    decodeProfile,
  );
  const [lang, setLang, langReady] = usePersistentState<Lang>(storageKeys.lang, "ar", decodeLang);
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [loginPromptNext, setLoginPromptNext] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ready =
    cartReady &&
    favoritesReady &&
    authReady &&
    addressesReady &&
    selectedAddressReady &&
    couponReady &&
    orderNoteReady &&
    profileReady &&
    langReady;

  const loginPromptOpen = loginPromptNext !== null;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

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
      const note = options.note?.trim() ?? "";
      const key = [productId, size, extras.join("+"), note].filter(Boolean).join("|");
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
            note: note || undefined,
          },
        ];
      });
      toast(t("تمت إضافة {name} إلى السلة", { name: t(product.name) }));
    },
    [toast, t, setLines],
  );

  const quickAdd = useCallback(
    (productId: string) => {
      const product = productsById[productId];
      if (!product) return;
      addItem(productId, {
        price: product.price,
        size: product.category === "burger" ? "ساندوتش فقط" : undefined,
      });
    },
    [addItem],
  );

  const changeQty = useCallback(
    (key: string, delta: number) => {
      setLines((current) =>
        current.flatMap((line) => {
          if (line.key !== key) return [line];
          const nextQty = line.qty + delta;
          return nextQty <= 0 ? [] : [{ ...line, qty: nextQty }];
        }),
      );
    },
    [setLines],
  );

  const removeLine = useCallback(
    (key: string) => {
      setLines((current) => current.filter((line) => line.key !== key));
    },
    [setLines],
  );

  const clearCart = useCallback(
    (silent = false) => {
      setLines([]);
      setCoupon(null);
      setOrderNote("");
      if (!silent) toast(t("تم تفريغ السلة"));
    },
    [toast, t, setLines, setCoupon, setOrderNote],
  );

  const applyCoupon = useCallback(
    (code: string) => {
      if (code.trim().toUpperCase() !== "NAWY20") return false;
      setCoupon("NAWY20");
      return true;
    },
    [setCoupon],
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfile((current) => ({ ...current, ...patch }));
    },
    [setProfile],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((current) => {
        const exists = current.includes(id);
        toast(t(exists ? "تمت الإزالة من المفضلة" : "تمت الإضافة إلى المفضلة"), "info");
        return exists ? current.filter((item) => item !== id) : [...current, id];
      });
    },
    [toast, t, setFavorites],
  );

  const openLoginPrompt = useCallback((next: string = "/cart") => setLoginPromptNext(next), []);
  const closeLoginPrompt = useCallback(() => setLoginPromptNext(null), []);

  const login = useCallback(() => {
    setLoggedIn(true);
    setLoginPromptNext(null);
    toast(t("تم تسجيل الدخول بنجاح"), "info");
  }, [toast, t, setLoggedIn]);

  const logout = useCallback(() => {
    setLoggedIn(false);
    toast(t("تم تسجيل الخروج"), "info");
  }, [toast, t, setLoggedIn]);

  const addAddress = useCallback(
    (address: SavedAddress) => {
      setAddresses((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== address.id);
        return [...withoutDuplicate, address];
      });
      setSelectedAddressId(address.id);
      toast(t("تم حفظ العنوان بنجاح"), "info");
    },
    [toast, t, setAddresses, setSelectedAddressId],
  );

  const removeAddress = useCallback(
    (id: string) => {
      setAddresses((current) => current.filter((address) => address.id !== id));
      setSelectedAddressId((current) => (current === id ? null : current));
      toast(t("تم حذف العنوان"), "info");
    },
    [toast, t, setAddresses, setSelectedAddressId],
  );

  const selectAddress = useCallback((id: string | null) => setSelectedAddressId(id), [setSelectedAddressId]);

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
      coupon,
      applyCoupon,
      orderNote,
      setOrderNote,
      profile,
      updateProfile,
      favorites,
      isFavorite,
      toggleFavorite,
      loggedIn,
      ready,
      loginPromptOpen,
      loginPromptNext,
      openLoginPrompt,
      closeLoginPrompt,
      login,
      logout,
      addresses,
      addAddress,
      removeAddress,
      selectedAddressId,
      selectAddress,
      fulfilment,
      setFulfilment,
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
      coupon,
      applyCoupon,
      orderNote,
      setOrderNote,
      profile,
      updateProfile,
      favorites,
      isFavorite,
      toggleFavorite,
      loggedIn,
      ready,
      loginPromptOpen,
      loginPromptNext,
      openLoginPrompt,
      closeLoginPrompt,
      login,
      logout,
      addresses,
      addAddress,
      removeAddress,
      selectedAddressId,
      selectAddress,
      fulfilment,
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
