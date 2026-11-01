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
  openLoginPrompt: () => void;
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

const CART_KEY = "nawy-cart-v1";
const FAVORITES_KEY = "nawy-favorites-v1";
const AUTH_KEY = "nawy-auth-v1";
const LANG_KEY = "nawy-lang-v1";
const ADDRESSES_KEY = "nawy-addresses-v1";
const SELECTED_ADDRESS_KEY = "nawy-selected-address-v1";
const COUPON_KEY = "nawy-coupon-v1";
const ORDER_NOTE_KEY = "nawy-order-note-v1";
const PROFILE_KEY = "nawy-profile-v1";

const seedProfile: Profile = {
  name: user.name,
  phone: user.phone,
  email: user.email,
  avatar: user.avatar,
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(seedCart);
  const [favorites, setFavorites] = useState<string[]>(seedFavorites);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>(savedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(savedAddresses[0].id);
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState("");
  const [profile, setProfile] = useState<Profile>(seedProfile);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [lang, setLang] = useState<Lang>("ar");
  const [ready, setReady] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);

  useEffect(() => {
    const storedLines = readStorage<unknown>(CART_KEY, seedCart);
    setLines(
      Array.isArray(storedLines)
        ? (storedLines.filter(
            (line): line is CartLine =>
              Boolean(line) && typeof (line as CartLine).key === "string" && typeof (line as CartLine).productId === "string",
          ) as CartLine[])
        : seedCart,
    );
    const storedFavorites = readStorage<unknown>(FAVORITES_KEY, seedFavorites);
    setFavorites(Array.isArray(storedFavorites) ? storedFavorites.filter((id): id is string => typeof id === "string") : seedFavorites);
    setLoggedIn(readStorage<unknown>(AUTH_KEY, false) === true);
    setLang(readStorage<unknown>(LANG_KEY, "ar") === "en" ? "en" : "ar");
    const storedAddresses = readStorage<unknown>(ADDRESSES_KEY, savedAddresses);
    setAddresses(Array.isArray(storedAddresses) ? (storedAddresses as SavedAddress[]) : savedAddresses);
    const storedSelectedAddress = readStorage<unknown>(SELECTED_ADDRESS_KEY, savedAddresses[0].id);
    setSelectedAddressId(typeof storedSelectedAddress === "string" ? storedSelectedAddress : savedAddresses[0].id);
    setCoupon(readStorage<unknown>(COUPON_KEY, null) === "NAWY20" ? "NAWY20" : null);
    const storedNote = readStorage<unknown>(ORDER_NOTE_KEY, "");
    setOrderNote(typeof storedNote === "string" ? storedNote.slice(0, 200) : "");
    const storedProfile = readStorage<unknown>(PROFILE_KEY, seedProfile);
    setProfile(isProfile(storedProfile) ? storedProfile : seedProfile);
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
    if (ready) window.localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
  }, [addresses, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(SELECTED_ADDRESS_KEY, JSON.stringify(selectedAddressId));
  }, [selectedAddressId, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
  }, [coupon, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(ORDER_NOTE_KEY, JSON.stringify(orderNote));
  }, [orderNote, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile, ready]);

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
    [toast, t],
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

  const clearCart = useCallback(
    (silent = false) => {
      setLines([]);
      setCoupon(null);
      setOrderNote("");
      if (!silent) toast(t("تم تفريغ السلة"));
    },
    [toast, t],
  );

  const applyCoupon = useCallback((code: string) => {
    if (code.trim().toUpperCase() !== "NAWY20") return false;
    setCoupon("NAWY20");
    return true;
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((current) => ({ ...current, ...patch }));
  }, []);

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

  const openLoginPrompt = useCallback(() => setLoginPromptOpen(true), []);
  const closeLoginPrompt = useCallback(() => setLoginPromptOpen(false), []);

  const login = useCallback(() => {
    setLoggedIn(true);
    setLoginPromptOpen(false);
    toast(t("تم تسجيل الدخول بنجاح"), "info");
  }, [toast, t]);

  const logout = useCallback(() => {
    setLoggedIn(false);
    toast(t("تم تسجيل الخروج"), "info");
  }, [toast, t]);

  const addAddress = useCallback(
    (address: SavedAddress) => {
      setAddresses((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== address.id);
        return [...withoutDuplicate, address];
      });
      setSelectedAddressId(address.id);
      toast(t("تم حفظ العنوان بنجاح"), "info");
    },
    [toast, t],
  );

  const removeAddress = useCallback(
    (id: string) => {
      setAddresses((current) => current.filter((item) => item.id !== id));
      setSelectedAddressId((current) => (current === id ? null : current));
      toast(t("تم حذف العنوان"), "info");
    },
    [toast, t],
  );

  const selectAddress = useCallback((id: string | null) => setSelectedAddressId(id), []);

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
