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
import {
  branches,
  deliveryFee,
  orders as seedOrders,
  productsById,
  seedCart,
  seedFavorites,
  user,
  type Order,
  type OrderItem,
  type PaymentMethodId,
} from "@/lib/data";
import { savedAddresses, type AddressKind, type SavedAddress } from "@/lib/account-data";
import { translate, type Lang, type Vars } from "@/lib/i18n";
import { storageKeys } from "@/lib/storage";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { LoadingIndicator } from "@/components/loading-indicator";

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

export type DeliveryDetails = {
  building: string;
  floor: string;
  apartment: string;
  name: string;
  phone: string;
  instructions: string;
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
  selectedBranchId: string;
  selectBranch: (id: string) => void;
  deliveryDetails: DeliveryDetails;
  updateDeliveryDetails: (patch: Partial<DeliveryDetails>) => void;
  orders: Order[];
  placeOrder: (paymentMethod: PaymentMethodId) => Order | null;
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

const seedDeliveryDetails: DeliveryDetails = {
  building: "12",
  floor: "2",
  apartment: "8",
  name: user.name,
  phone: user.phone,
  instructions: "",
};

const ADDRESS_KINDS = new Set<AddressKind>(["home", "work", "family", "cafe", "other"]);
const PAYMENT_METHODS = new Set<PaymentMethodId>(["cash", "instapay", "wallet"]);
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;

function limited(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

function decodeCart(stored: unknown, fallback: CartLine[]): CartLine[] {
  if (!Array.isArray(stored)) return fallback;
  return stored.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const line = value as Record<string, unknown>;
    const productId = limited(line.productId, 80);
    if (!line.key || typeof line.key !== "string" || !productId) return [];
    const product = productsById[productId];
    if (!product) return [];
    const qty =
      typeof line.qty === "number" && Number.isInteger(line.qty) && line.qty > 0
        ? Math.min(line.qty, 99)
        : 1;
    const price =
      typeof line.price === "number" && Number.isFinite(line.price) && line.price > 0
        ? line.price
        : product.price;
    const extras = Array.isArray(line.extras)
      ? line.extras.filter((extra): extra is string => typeof extra === "string").slice(0, 20)
      : undefined;
    return [
      {
        key: line.key.slice(0, 240),
        productId,
        qty,
        price,
        size: limited(line.size, 60),
        extras: extras?.length ? extras : undefined,
        note: limited(line.note, 200),
      },
    ];
  });
}

function decodeFavorites(stored: unknown, fallback: string[]): string[] {
  if (!Array.isArray(stored)) return fallback;
  const seen = new Set<string>();
  return stored.flatMap((id) => {
    if (typeof id !== "string" || !productsById[id] || seen.has(id)) return [];
    seen.add(id);
    return [id];
  });
}

function decodeAuth(stored: unknown): boolean {
  return stored === true;
}

function decodeLang(stored: unknown): Lang {
  return stored === "en" ? "en" : "ar";
}

function isSavedAddress(value: unknown): value is SavedAddress {
  if (!value || typeof value !== "object") return false;
  const address = value as Record<string, unknown>;
  return (
    typeof address.id === "string" &&
    address.id.length > 0 &&
    typeof address.title === "string" &&
    typeof address.detail === "string" &&
    typeof address.area === "string" &&
    typeof address.kind === "string" &&
    ADDRESS_KINDS.has(address.kind as AddressKind) &&
    typeof address.lat === "number" &&
    Number.isFinite(address.lat) &&
    Math.abs(address.lat) <= 90 &&
    typeof address.lng === "number" &&
    Number.isFinite(address.lng) &&
    Math.abs(address.lng) <= 180 &&
    (address.lastUsed === undefined || typeof address.lastUsed === "string")
  );
}

function decodeAddresses(stored: unknown, fallback: SavedAddress[]): SavedAddress[] {
  if (!Array.isArray(stored)) return fallback;
  const seen = new Set<string>();
  return stored.flatMap((value) => {
    if (!isSavedAddress(value) || seen.has(value.id)) return [];
    seen.add(value.id);
    return [
      {
        id: value.id.slice(0, 80),
        title: value.title.slice(0, 80),
        detail: value.detail.slice(0, 160),
        area: value.area.slice(0, 80),
        kind: value.kind,
        lastUsed: limited(value.lastUsed, 80),
        lat: value.lat,
        lng: value.lng,
      },
    ];
  });
}

function decodeSelectedAddress(stored: unknown, fallback: string | null): string | null {
  return typeof stored === "string" ? stored : fallback;
}

function decodeSelectedBranch(stored: unknown, fallback: string): string {
  return typeof stored === "string" && branches.some((branch) => branch.id === stored)
    ? stored
    : fallback;
}

function decodeDeliveryDetails(stored: unknown, fallback: DeliveryDetails): DeliveryDetails {
  if (!stored || typeof stored !== "object") return fallback;
  const value = stored as Record<string, unknown>;
  const limits: Record<keyof DeliveryDetails, number> = {
    building: 20,
    floor: 20,
    apartment: 20,
    name: 80,
    phone: 30,
    instructions: 200,
  };
  const next = { ...fallback };
  (Object.keys(limits) as (keyof DeliveryDetails)[]).forEach((key) => {
    if (typeof value[key] === "string") next[key] = (value[key] as string).slice(0, limits[key]);
  });
  return next;
}

function isOrderItem(value: unknown): value is OrderItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "string" &&
    Boolean(productsById[item.productId]) &&
    typeof item.name === "string" &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0
  );
}

function decodeOrders(stored: unknown, fallback: Order[]): Order[] {
  if (!Array.isArray(stored)) return fallback;
  return stored.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const order = value as Record<string, unknown>;
    if (
      typeof order.id !== "string" ||
      !SAFE_ID.test(order.id) ||
      typeof order.title !== "string" ||
      typeof order.description !== "string" ||
      typeof order.total !== "number" ||
      !Number.isFinite(order.total) ||
      order.total < 0 ||
      (order.status !== "preparing" && order.status !== "delivered")
    ) {
      return [];
    }
    const items = Array.isArray(order.items) ? order.items.filter(isOrderItem) : undefined;
    return [
      {
        id: order.id.slice(0, 40),
        status: order.status,
        title: order.title.slice(0, 120),
        date: limited(order.date, 120) ?? "",
        description: order.description.slice(0, 300),
        total: order.total,
        image:
          typeof order.image === "string" && order.image.startsWith("/images/")
            ? order.image
            : "/images/burger.webp",
        eta: limited(order.eta, 80),
        items: items?.length ? items : undefined,
        paymentMethod:
          typeof order.paymentMethod === "string" && PAYMENT_METHODS.has(order.paymentMethod as PaymentMethodId)
            ? (order.paymentMethod as PaymentMethodId)
            : undefined,
        fulfilment:
          order.fulfilment === "pickup" || order.fulfilment === "delivery"
            ? order.fulfilment
            : undefined,
        branchId:
          typeof order.branchId === "string" && branches.some((branch) => branch.id === order.branchId)
            ? order.branchId
            : undefined,
        address: limited(order.address, 200),
        createdAt:
          typeof order.createdAt === "number" && Number.isFinite(order.createdAt)
            ? order.createdAt
            : undefined,
      },
    ];
  });
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
  const [storedSelectedAddressId, setSelectedAddressId, selectedAddressReady] = usePersistentState<
    string | null
  >(storageKeys.selectedAddress, savedAddresses[0].id, decodeSelectedAddress);
  const [storedBranchId, setSelectedBranchId, branchReady] = usePersistentState<string>(
    storageKeys.selectedBranch,
    branches[0].id,
    decodeSelectedBranch,
  );
  const [deliveryDetails, setDeliveryDetails, deliveryDetailsReady] =
    usePersistentState<DeliveryDetails>(
      storageKeys.deliveryDetails,
      seedDeliveryDetails,
      decodeDeliveryDetails,
    );
  const [orders, setOrders, ordersReady] = usePersistentState<Order[]>(
    storageKeys.orders,
    seedOrders,
    decodeOrders,
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
    branchReady &&
    deliveryDetailsReady &&
    ordersReady &&
    couponReady &&
    orderNoteReady &&
    profileReady &&
    langReady;

  // Storage may reference a deleted address/branch; expose only values that
  // still resolve so screens never render a dangling selection.
  const selectedAddressId = addresses.some((address) => address.id === storedSelectedAddressId)
    ? storedSelectedAddressId
    : null;
  const selectedBranchId = branches.some((branch) => branch.id === storedBranchId)
    ? storedBranchId
    : branches[0].id;

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

  const selectBranch = useCallback(
    (id: string) => {
      if (branches.some((branch) => branch.id === id)) setSelectedBranchId(id);
    },
    [setSelectedBranchId],
  );

  const updateDeliveryDetails = useCallback(
    (patch: Partial<DeliveryDetails>) => {
      setDeliveryDetails((current) => {
        const next = { ...current };
        (Object.keys(patch) as (keyof DeliveryDetails)[]).forEach((key) => {
          const value = patch[key];
          if (typeof value === "string") {
            next[key] = value.slice(0, key === "instructions" ? 200 : 80);
          }
        });
        return next;
      });
    },
    [setDeliveryDetails],
  );

  const count = useMemo(() => lines.reduce((total, line) => total + line.qty, 0), [lines]);
  const subtotal = useMemo(
    () => lines.reduce((total, line) => total + line.price * line.qty, 0),
    [lines],
  );

  const placeOrder = useCallback(
    (paymentMethod: PaymentMethodId) => {
      if (lines.length === 0) return null;

      const now = Date.now();
      const items: OrderItem[] = lines.map((line) => ({
        productId: line.productId,
        name: productsById[line.productId]?.name ?? line.productId,
        qty: line.qty,
        price: line.price,
        size: line.size,
        extras: line.extras,
        note: line.note,
      }));
      const address = addresses.find((item) => item.id === selectedAddressId) ?? null;
      const branch = branches.find((item) => item.id === selectedBranchId) ?? branches[0];
      const separator = lang === "ar" ? "، " : ", ";
      const deliveryAddress = address
        ? `${t(address.area)}${separator}${t(address.detail)}`
        : t(user.address);
      const discount = coupon ? Math.min(Math.round(subtotal * 0.2), 50) : 0;
      const fee = fulfilment === "delivery" ? deliveryFee : 0;
      const latestId = orders.reduce(
        (max, order) => (/^\d+$/.test(order.id) ? Math.max(max, Number(order.id)) : max),
        10000,
      );
      const formattedDate = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(now));

      const order: Order = {
        id: String(latestId + 1),
        status: "preparing",
        title: items[0].name,
        date: lang === "ar" ? `اليوم، ${formattedDate}` : formattedDate,
        description: items.map((item) => `${item.qty} ${item.name}`).join(" + "),
        total: Math.max(0, subtotal - discount + fee),
        image: productsById[items[0].productId]?.image ?? "/images/burger.webp",
        eta: fulfilment === "delivery" ? "25 - 35 دقيقة" : "20 - 30 دقيقة",
        items,
        paymentMethod,
        fulfilment,
        branchId: fulfilment === "pickup" ? branch.id : undefined,
        address: fulfilment === "pickup" ? t(branch.name) : deliveryAddress,
        createdAt: now,
      };

      setOrders((current) => [order, ...current]);
      return order;
    },
    [
      addresses,
      coupon,
      fulfilment,
      lang,
      lines,
      orders,
      selectedAddressId,
      selectedBranchId,
      setOrders,
      subtotal,
      t,
    ],
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
      selectedBranchId,
      selectBranch,
      deliveryDetails,
      updateDeliveryDetails,
      orders,
      placeOrder,
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
      selectedBranchId,
      selectBranch,
      deliveryDetails,
      updateDeliveryDetails,
      orders,
      placeOrder,
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
      <div aria-hidden={!ready} inert={!ready}>
        {children}
      </div>
      {!ready ? (
        <div className="fixed inset-0 z-[200] grid min-h-[100dvh] w-full place-items-center bg-cream-50">
          <LoadingIndicator className="size-16" />
        </div>
      ) : null}
      {toastState ? (
        <div
          className={`pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4 ${
            // Keep the toast above the pinned cart bar instead of behind it.
            count > 0
              ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))] lg:bottom-28"
              : "bottom-24 lg:bottom-8"
          }`}
        >
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

/**
 * Context-optional read for chrome that can legitimately render outside the
 * provider tree — the root loading fallback is prerendered inside
 * `/_global-error`, where AppProvider does not exist. Components using this
 * must fall back to untranslated (Arabic-first) copy.
 */
export function useOptionalApp() {
  return useContext(AppContext);
}
