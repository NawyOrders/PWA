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
import {
  apiConfigured,
  apiUrl,
  attachStoredRefresh,
  authTransport,
  completeProfile as completeProfileRequest,
  fetchBranding,
  isFatalRefreshError,
  normalizeEgyptianPhone,
  refreshSession,
  revokeSession,
  splitFullName,
  type CustomerSessionPayload,
  type RestaurantBranding,
} from "@/lib/api";
import { localAccount, rememberLocalAccount } from "@/lib/local-accounts";
import {
  createAuthFetch,
  createRefreshCoordinator,
  createStorageRefreshLock,
  decodeSession,
  grantFromPayload,
  grantFromTokens,
  identityFromPayload,
  sessionNeedsRefresh,
  type AccessGrant,
  type AuthFetch,
  type CustomerSession,
  type RefreshCoordinator,
} from "@/lib/session";
import { applyBranding, decodeBrandingCache, type BrandingCache } from "@/lib/branding";
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
  /**
   * The `customerId` whose session last seeded this identity. It is what lets a
   * signed-in customer edit their own details without the next load overwriting
   * them, and what makes a different customer replace them.
   */
  customerId?: string;
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
  /**
   * Persists the profile against the tenant API when a live session exists.
   *
   * The API reports `nextStep: "CompleteProfile"` until this succeeds, and its
   * order endpoints refuse an incomplete account. The demo path falls back to
   * `updateProfile` because there is no server row to write.
   */
  completeProfile: (input: { name: string; email?: string }) => Promise<void>;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  /** The signed-in customer's own balance; `0` for a new account or a signed-out device. */
  points: number;
  loggedIn: boolean;
  ready: boolean;
  /**
   * Who is signed in, from the tenant API. `null` on the demo path, where
   * there is no issued identity behind the flag — the account screens keep
   * their stored profile in that case.
   */
  customer: CustomerSession | null;
  /**
   * Whether the access grant is live. Screens do not need it — the fetch
   * wrapper below refreshes on its own — but it is what `useCustomerSession`
   * reports as `status`, and what keeps a guard from guessing.
   *
   * `recovering` is where a bad moment leaves you: the session is still the
   * customer's, the cookie is still spendable, and a retry is already
   * scheduled — there is just no token in memory at this second. Reporting it
   * as `signed-out` would send somebody to the login form because the tenant
   * had a rough minute, which is the failure the backoff exists to avoid.
   */
  sessionStatus: "signed-out" | "active" | "refreshing" | "recovering";
  loginPromptOpen: boolean;
  loginPromptNext: string | null;
  openLoginPrompt: (next?: string) => void;
  closeLoginPrompt: () => void;
  /**
   * Called with the payload `/otp/verify` answered, or with nothing at all to
   * take the offline demo path.
   *
   * Only the identity and the access token cross this boundary. The refresh
   * token was taken out of that response by `/api/auth/otp/verify` and lives in
   * an httpOnly cookie, so no component, hook or storage entry can hold it.
   */
  login: (payload?: CustomerSessionPayload | null) => void;
  logout: () => void;
  /**
   * Swaps in the saved account for a phone: its own favorites, orders and
   * points, or an empty account when that phone has never saved one.
   *
   * The offline login screen calls it once its own OTP challenge succeeded —
   * the same proof `login(payload)` carries for the simulator — because the
   * demo path has no payload to read the number from. It does nothing against
   * the live tenant API, where this data belongs to the backend, not to a slot
   * in this browser.
   */
  adoptLocalAccount: (phone: string) => void;
  /**
   * `fetch` for tenant endpoints: attaches the bearer token, refreshes once on
   * a 401, retries once, and never loops.
   */
  authFetch: AuthFetch;
  /** Tenant identity and palette, or `null` while running on built-in defaults. */
  branding: RestaurantBranding | null;
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

/**
 * How long to wait before trying again after a refresh that failed for a reason
 * that says nothing about the session — no network, a 500, a request that timed
 * out. Thirty seconds is long enough that a stall is not a burst of traffic and
 * short enough that a token about to expire is usually rescued.
 */
export const TRANSIENT_REFRESH_RETRY_MS = 30_000;

/**
 * How many of those retries to spend before admitting the session cannot be
 * kept. Without a ceiling a customer whose network never comes back stays
 * nominally signed in on a token that has already expired.
 */
export const MAX_TRANSIENT_REFRESH_RETRIES = 3;

/**
 * The neutral identity a signed-out device shows. Exported because the demo
 * login path needs the same fallback when a phone with no remembered name and
 * no typed name signs in: a new local customer must not inherit the previous
 * customer's name or photo.
 */
export const seedProfile: Profile = {
  name: user.name,
  phone: user.phone,
  email: user.email,
  /**
   * No photo ships with an account. A stock face made a brand-new customer look
   * like they already had a picture they never uploaded, so the disc starts
   * empty and the screens offer "add your own" instead.
   */
  avatar: "",
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

/** A balance is a whole, non-negative, safe integer; anything else is the fallback. */
function decodePoints(stored: unknown, fallback: number): number {
  return typeof stored === "number" && Number.isSafeInteger(stored) && stored >= 0 ? stored : fallback;
}

/**
 * The pointer naming whose account the visible data is. It is a normalised
 * number in the same 8–15 digit window `isUsablePhone` applies, so tampered
 * storage cannot turn it into a path, a query or a key the table never wrote.
 */
function decodeAccountPhone(stored: unknown, fallback: string | null): string | null {
  return typeof stored === "string" && /^\+\d{8,15}$/.test(stored) ? stored : fallback;
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

/**
 * A 320px JPEG data URL — what the upload control produces — is around 40 KB, so
 * anything far above that is a mistake or hostile storage. localStorage gives the
 * whole app ~5 MB, and one oversized picture makes every later write fail
 * silently (storage.ts swallows QuotaExceededError).
 */
const maxStoredAvatarChars = 300_000;

/**
 * Only two kinds of picture are safe to hand to next/image: a data URL the
 * customer uploaded in this browser, and a file this app ships. Anything else is
 * treated as no picture, because a remote host is not in `images.remotePatterns`
 * and would throw at render time. The seeded demo face is dropped on purpose —
 * accounts saved before the photo became opt-in still hold its path.
 */
function usableAvatar(value: unknown): string {
  if (typeof value !== "string" || !value || value === user.avatar) return "";
  if (value.startsWith("data:image/")) return value.length <= maxStoredAvatarChars ? value : "";
  return /^\/[\w./-]+$/.test(value) ? value : "";
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.name === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.email === "string" &&
    typeof profile.avatar === "string" &&
    (profile.customerId === undefined || typeof profile.customerId === "string")
  );
}

function decodeProfile(stored: unknown, fallback: Profile): Profile {
  if (!isProfile(stored)) return fallback;
  return { ...stored, avatar: usableAvatar(stored.avatar) };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lines, setLines, cartReady] = usePersistentState<CartLine[]>(storageKeys.cart, seedCart, decodeCart);
  const [favorites, setFavorites, favoritesReady] = usePersistentState<string[]>(
    storageKeys.favorites,
    seedFavorites,
    decodeFavorites,
  );
  const [authFlag, setAuthFlag, authReady] = usePersistentState<boolean>(storageKeys.auth, false, decodeAuth);
  /*
   * Only the identity is persisted. The access token lives in `grant` below —
   * memory, for this page load — and the refresh token lives in an httpOnly
   * cookie the browser sends to `/api/auth/*` and JavaScript cannot read.
   *
   * The decoder also catches the refresh token a pre-cookie build left behind,
   * because the very next thing `usePersistentState` does is write the clean
   * identity back, which would otherwise erase it before anyone could adopt it.
   */
  const storedRefreshToken = useRef<string | null>(null);
  const decodeStoredSession = useCallback((stored: unknown): CustomerSession | null => {
    const parsed = decodeSession(stored);
    storedRefreshToken.current = parsed?.legacyRefreshToken ?? null;
    return parsed?.identity ?? null;
  }, []);
  const [customer, setCustomer, sessionReady] = usePersistentState<CustomerSession | null>(
    storageKeys.session,
    null,
    decodeStoredSession,
  );
  const [grant, setGrant] = useState<AccessGrant | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** When a transient refresh failure should be retried, or `null` if none is pending. */
  const [refreshRetryAt, setRefreshRetryAt] = useState<number | null>(null);
  const [brandingCache, setBrandingCache, brandingReady] = usePersistentState<BrandingCache | null>(
    storageKeys.branding,
    null,
    decodeBrandingCache,
  );
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
  /*
   * The balance the account screen shows. It starts at nothing: the seeded
   * `user.points` was a demo constant every customer inherited, which is not a
   * reward anybody earned.
   */
  const [points, setPoints, pointsReady] = usePersistentState<number>(storageKeys.points, 0, decodePoints);
  /*
   * Whose account the visible favorites, orders and points are. It is persisted
   * so a reload keeps writing to the same slot, and it is deliberately not the
   * profile's phone: editing the contact number on the account screen must not
   * move somebody's order history onto a different identity. Only a fresh OTP
   * challenge claims a slot.
   */
  const [accountPhone, setAccountPhone, accountPhoneReady] = usePersistentState<string | null>(
    storageKeys.accountPhone,
    null,
    decodeAccountPhone,
  );
  const [lang, setLang, langReady] = usePersistentState<Lang>(storageKeys.lang, "ar", decodeLang);
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [loginPromptNext, setLoginPromptNext] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brandingFetched = useRef(false);
  /** Mirror of `grant` for callbacks that must read the token without re-subscribing. */
  const grantRef = useRef<AccessGrant | null>(null);
  /** The recovery refresh runs once per load, not once per render. */
  const recoveringSession = useRef(false);
  /** Collapses a double-tapped logout into one revoke; re-armed by the next login. */
  const loggingOut = useRef(false);
  /** Failures spent on retries that said nothing about the session itself. */
  const refreshRetries = useRef(0);
  /**
   * `refreshRetryAt` as a callback can read it.
   *
   * The state value is the render's copy; a ref is what lets a failure handler
   * ask "is a retry already scheduled for this streak?" without waiting for the
   * next render to tell it.
   */
  const retryDeadline = useRef<number | null>(null);
  /**
   * The one-time legacy-token handover, so the reload refresh can wait for it.
   * Refreshing before the cookie lands is a refresh with no cookie, and the
   * honest answer to that is a 401 — which would sign out a customer whose
   * session was still good.
   */
  const adoptionPending = useRef<Promise<void> | null>(null);

  const ready =
    cartReady &&
    favoritesReady &&
    authReady &&
    sessionReady &&
    brandingReady &&
    addressesReady &&
    selectedAddressReady &&
    branchReady &&
    deliveryDetailsReady &&
    ordersReady &&
    couponReady &&
    orderNoteReady &&
    profileReady &&
    pointsReady &&
    accountPhoneReady &&
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
  // Two ways in: the local demo flag, or a session issued by the tenant API.
  // An expired access token still counts as signed in — it is refreshed, and
  // only a failed refresh signs the customer out.
  const loggedIn = authFlag || customer !== null;
  // A pending retry deadline is what separates "waiting for a token" from
  // "there is no session": only `handleRefreshFailure` sets it, only a success
  // or `expireSession` clears it, and the demo path never reaches either.
  const sessionStatus: AppContextValue["sessionStatus"] = refreshing
    ? "refreshing"
    : grant
      ? "active"
      : refreshRetryAt !== null
        ? "recovering"
        : "signed-out";
  const branding = brandingCache?.branding ?? null;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);

  /* ------------------------------------------------------------------------ */
  /* Local account ownership: one phone, one saved history.                    */
  /* ------------------------------------------------------------------------ */

  /**
   * Claims the slot for a phone that just proved itself and shows what that
   * customer saved. No slot means a new account, so it starts empty rather than
   * inheriting the seeded demo history or the last person's favorites.
   *
   * The live API owns this data, so nothing is read from a browser slot there.
   */
  const adoptLocalAccount = useCallback(
    (phone: string) => {
      if (authTransport() === "live") return;
      const normalized = normalizeEgyptianPhone(phone);
      if (!normalized.replace(/\D/g, "")) return;
      const slot = localAccount(normalized);
      setAccountPhone(normalized);
      setFavorites(slot ? decodeFavorites(slot.favorites, []) : []);
      setOrders(slot ? decodeOrders(slot.orders, []) : []);
      setPoints(slot ? slot.points : 0);
    },
    [setAccountPhone, setFavorites, setOrders, setPoints],
  );

  /**
   * The other half of the same promise: once nobody is signed in, the device
   * shows the neutral catalogue view again and the pointer is cleared, so the
   * next person cannot see — or write into — the account that just left. The
   * slot itself keeps that customer's copy for their next login.
   */
  const releaseLocalAccount = useCallback(() => {
    // Nobody is signed in, so no slot owns the screen in any transport.
    setAccountPhone(null);
    if (authTransport() === "live") return;
    setFavorites(seedFavorites);
    setOrders(seedOrders);
    setPoints(0);
  }, [setAccountPhone, setFavorites, setOrders, setPoints]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  /* Tenant palette: opt-in only. Unless the deploy sets the flag, the app keeps
     the colours from globals.css and a tenant payload repaints nothing. */
  useEffect(() => {
    applyBranding(branding);
  }, [branding]);

  /* A session is the source of truth for who the customer is, so the account
     screens stop showing the seeded demo identity as soon as somebody signs in
     through the API. Details the customer edited are kept — they are replaced
     only when a different customer signs in on this device. */
  useEffect(() => {
    if (!customer || !sessionReady || !profileReady) return;
    setProfile((current) =>
      current.customerId === customer.customerId
        ? current
        : {
            ...current,
            customerId: customer.customerId,
            name: customer.fullName || current.name,
            phone: customer.phoneNumber || current.phone,
            email: customer.email ?? current.email,
          },
    );
  }, [customer, sessionReady, profileReady, setProfile]);

  /*
   * Every change to the visible account data lands in the signed-in customer's
   * own slot, so a reload — or a logout and the next login — answers with what
   * they actually saved. Signed out there is no slot to write to, which is what
   * keeps the neutral seeded view from overwriting somebody's history.
   */
  useEffect(() => {
    if (!ready || !loggedIn || !accountPhone) return;
    if (authTransport() === "live") return;
    rememberLocalAccount(accountPhone, { points, favorites, orders });
  }, [ready, loggedIn, accountPhone, points, favorites, orders]);

  /*
   * A load that finds a session but no pointer — storage written before account
   * data had an owner — attaches what is already on screen to the identity that
   * is signed in instead of dropping it. An existing slot still wins: that is
   * the customer's saved history, and the screen is only this load's view of it.
   */
  useEffect(() => {
    if (!ready || !loggedIn || accountPhone) return;
    if (authTransport() === "live") return;
    const normalized = normalizeEgyptianPhone(customer?.phoneNumber || profile.phone);
    if (!normalized.replace(/\D/g, "")) return;
    if (localAccount(normalized)) {
      adoptLocalAccount(normalized);
      return;
    }
    setAccountPhone(normalized);
  }, [ready, loggedIn, accountPhone, customer, profile.phone, adoptLocalAccount, setAccountPhone]);

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

  /* One conditional GET per load: the stored ETag turns a fresh branding into
     a 304, and any failure simply leaves the palette that is already applied. */
  useEffect(() => {
    if (!apiConfigured() || !brandingReady || brandingFetched.current) return;
    brandingFetched.current = true;
    fetchBranding({ etag: brandingCache?.etag ?? null })
      .then((result) => {
        if (!result.notModified) setBrandingCache({ etag: result.etag, branding: result.branding });
      })
      .catch(() => {
        // Branding is cosmetic and the backend may be unreachable offline: the
        // built-in palette (or the cached one) stays and the next load retries.
      });
  }, [brandingReady, brandingCache?.etag, setBrandingCache]);

  /* ------------------------------------------------------------------------ */
  /* Session: one refresh at a time, one token in memory, none in storage.     */
  /* ------------------------------------------------------------------------ */

  /*
   * `/refresh` rotates the token on every success and treats a replayed token
   * as theft — the whole family is revoked — so two tabs refreshing at the same
   * moment would sign the customer out through nothing but eagerness. The
   * coordinator keeps one refresh per tab and the storage lock keeps one per
   * browser; the lock is lazy-initialised because it names this tab, and a tab
   * that cloned the name would wait on itself.
   */
  const coordinatorRef = useRef<RefreshCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = createRefreshCoordinator({
      request: () => refreshSession(),
      lock: typeof window === "undefined" ? null : createStorageRefreshLock(),
      onRotated: (next) => {
        grantRef.current = next;
        setGrant(next);
      },
    });
  }

  const applyGrant = useCallback((next: AccessGrant | null) => {
    grantRef.current = next;
    setGrant(next);
  }, []);

  const refreshNow = useCallback(async () => {
    const coordinator = coordinatorRef.current;
    if (!coordinator) throw new Error("session-unavailable");
    setRefreshing(true);
    try {
      const next = await coordinator.refresh();
      // A rotation that worked is proof the session is alive: the budget below
      // counts a streak of failures, not failures for the whole page load, and
      // a retry that is no longer needed is cancelled rather than left armed.
      refreshRetries.current = 0;
      retryDeadline.current = null;
      setRefreshRetryAt(null);
      return next;
    } finally {
      setRefreshing(false);
    }
  }, []);

  /*
   * A refused refresh is the end of the session, not a retry candidate. It
   * clears everything and says so once: an expired session that quietly
   * re-prompted on every screen would look like a broken app.
   */
  const expireSession = useCallback(() => {
    applyGrant(null);
    setCustomer(null);
    setAuthFlag(false);
    // An expired session is a sign-out: the account data goes back to the
    // neutral view rather than staying on screen for the next person.
    releaseLocalAccount();
    // The session is over, so a retry that was waiting on it is cancelled
    // rather than left to spend a refresh on an empty cookie jar.
    refreshRetries.current = 0;
    retryDeadline.current = null;
    setRefreshRetryAt(null);
    toast(t("انتهت الجلسة، سجّل الدخول تاني"), "info");
  }, [applyGrant, setCustomer, setAuthFlag, releaseLocalAccount, toast, t]);

  /*
   * Which refresh failures end the session, and which only cost a retry.
   *
   * The guide is explicit about the first group: any 401 from `/refresh`, and
   * the 409s the refresh-token family answers with, mean the token is expired,
   * revoked or spent twice, so the customer signs in again. Everything else —
   * the network is down, the tenant answered 500, the request timed out — says
   * nothing about whether the session is valid, and signing somebody out for a
   * stall throws away a full cart. Those get a bounded backoff instead, and a
   * session that still cannot be refreshed after it is admitted as over.
   *
   * One failure schedules one retry, at most. Several callers can be waiting on
   * the same single-flight refresh — the boot effect and the proactive effect
   * both are on a reload with no grant — and each attaches its own handler to
   * the same rejection. Counting every handler would spend the budget twice as
   * fast as the customer makes attempts.
   */
  const handleRefreshFailure = useCallback(
    (error: unknown) => {
      if (isFatalRefreshError(error)) {
        expireSession();
        return;
      }
      if (retryDeadline.current !== null) return;
      if (refreshRetries.current >= MAX_TRANSIENT_REFRESH_RETRIES) {
        expireSession();
        return;
      }
      refreshRetries.current += 1;
      const deadline = Date.now() + TRANSIENT_REFRESH_RETRY_MS;
      retryDeadline.current = deadline;
      setRefreshRetryAt(deadline);
    },
    [expireSession],
  );

  const authFetch = useMemo<AuthFetch>(
    () =>
      createAuthFetch({
        // The grant is read through a ref so a request already in flight never
        // retries with the token it was built with.
        getGrant: () => grantRef.current,
        refresh: refreshNow,
        onSignedOut: expireSession,
        join: (path) => apiUrl(path),
      }),
    [refreshNow, expireSession],
  );

  /*
   * An older build kept the refresh token in `localStorage`. Hand it to the app
   * server once — it goes into the httpOnly jar and is never sent back — and
   * the identity the hook already rewrote is all that remains on the device.
   */
  useEffect(() => {
    if (!sessionReady || !customer) return;
    const legacy = storedRefreshToken.current;
    if (!legacy || authTransport() === "demo") return;
    // One-shot by design: the stored session has already been rewritten with
    // the identity alone, so this ref holds the last copy in the browser.
    storedRefreshToken.current = null;
    const pending = attachStoredRefresh(legacy)
      .then(() => undefined)
      .catch(() => {
        // A failed adoption costs a sign-in, not a security promise: the cookie
        // jar stays empty and the refresh below answers 401.
      });
    adoptionPending.current = pending;
    // Dropped as soon as it lands, so the proactive effect below can resume: a
    // ref that stayed set would read as an adoption in flight for the rest of
    // the page load and every later refresh would silently wait for it.
    void pending.finally(() => {
      if (adoptionPending.current === pending) adoptionPending.current = null;
    });
  }, [customer, sessionReady]);

  /*
   * A reload keeps the identity but not the access token, which now lives only
   * in memory. Minting a fresh one here is what turns "still signed in" from a
   * claim into a fact — and it runs once per load, not once per render.
   *
   * It waits for the adoption above because a refresh that beats the cookie to
   * the server is a refresh with nothing to spend, and the honest answer to
   * that is a 401 that signs out a session which was still good.
   */
  useEffect(() => {
    if (!sessionReady || !customer || recoveringSession.current) return;
    if (authTransport() === "demo") return;
    if (grant) return;
    recoveringSession.current = true;
    void (adoptionPending.current ?? Promise.resolve())
      .then(() => refreshNow())
      .catch(handleRefreshFailure);
  }, [customer, grant, sessionReady, refreshNow, handleRefreshFailure]);

  /*
   * Access tokens refresh a minute before they expire, once per expiry window.
   * `handleRefreshFailure` decides whether a failure ends the session or only
   * postpones the attempt, so a network that is briefly down cannot sign the
   * customer out — and a session that is genuinely gone is not retried.
   *
   * It waits behind the adoption for the same reason the boot refresh does: a
   * rotation sent before the handed-over cookie lands is a rotation with
   * nothing to spend, and it would answer 401 against a session still worth
   * keeping.
   */
  useEffect(() => {
    if (!customer || authTransport() === "demo") return;
    if (adoptionPending.current) return;
    if (refreshRetryAt !== null) return;
    if (!sessionNeedsRefresh(grant)) return;
    let cancelled = false;
    refreshNow().catch((error) => {
      if (!cancelled) handleRefreshFailure(error);
    });
    return () => {
      cancelled = true;
    };
  }, [customer, grant, refreshNow, handleRefreshFailure, refreshRetryAt]);

  /*
   * The backoff itself: clearing the deadline re-runs the effects above, which
   * is the retry. One set of rules rather than a second path to keep in step.
   */
  useEffect(() => {
    if (refreshRetryAt === null) return;
    const timer = setTimeout(
      () => {
        // The window is over: mark it spent so the next failure is allowed to
        // schedule one of its own.
        retryDeadline.current = null;
        setRefreshRetryAt(null);
      },
      Math.max(0, refreshRetryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [refreshRetryAt]);

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

  const completeProfile = useCallback(
    async (input: { name: string; email?: string }) => {
      const name = input.name.trim();
      const email = (input.email ?? "").trim();

      // The demo path has no server row, so the stored profile is the record.
      if (authTransport() !== "live" || !customer) {
        updateProfile({ name, email: email || profile.email });
        return;
      }

      let grant = grantRef.current;
      if (!grant || sessionNeedsRefresh(grant)) grant = await refreshNow();

      const { firstName, lastName } = splitFullName(name);
      const result = await completeProfileRequest({
        accessToken: grant.accessToken,
        firstName,
        lastName,
        email,
      });

      // Completion rotates the pair, so the in-memory grant has to move with it.
      const nextGrant = grantFromTokens(result.session);
      if (nextGrant) applyGrant(nextGrant);

      const next: CustomerSession = {
        customerId: result.profile.customerId || customer.customerId,
        phoneNumber: result.profile.phoneNumber ?? customer.phoneNumber,
        fullName: result.profile.fullName ?? name,
        email: result.profile.email ?? (email || null),
      };
      setCustomer(next);
      setProfile((current) => ({
        ...current,
        customerId: next.customerId || current.customerId,
        name: next.fullName || current.name,
        phone: next.phoneNumber || current.phone,
        email: next.email ?? current.email,
      }));
    },
    [applyGrant, customer, profile.email, refreshNow, setCustomer, setProfile, updateProfile],
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

  const login = useCallback(
    (payload?: CustomerSessionPayload | null) => {
      // Re-arm logout: it is deliberately once-per-session so a double tap
      // cannot fire two revokes.
      loggingOut.current = false;
      if (payload) {
        // A session from the API is the source of truth, so the demo flag is
        // cleared rather than left disagreeing with it.
        const next = identityFromPayload(payload);
        applyGrant(grantFromPayload(payload));
        setCustomer(next);
        setAuthFlag(false);
        // The number that just verified owns the history: against the simulator
        // the saved slot is the answer, and against the live API this does
        // nothing at all.
        adoptLocalAccount(next.phoneNumber);
        // A sign-in always starts a new recovery window; the reload effect must
        // not fire for the token this response just handed us.
        recoveringSession.current = true;
        // A fresh session gets a fresh retry budget rather than inheriting the
        // one the previous account burned through.
        refreshRetries.current = 0;
        setRefreshRetryAt(null);
      } else {
        setAuthFlag(true);
      }
      setLoginPromptNext(null);
      toast(t("تم تسجيل الدخول بنجاح"), "info");
    },
    [toast, t, applyGrant, setCustomer, setAuthFlag, adoptLocalAccount],
  );

  const logout = useCallback(() => {
    // The local clear is unconditional and synchronous; the revoke is the
    // courtesy that follows. A dead network must never leave a customer
    // appearing signed in on a shared device.
    if (loggingOut.current) return;
    loggingOut.current = true;
    if (authTransport() !== "demo") {
      void revokeSession().catch(() => undefined);
    }
    applyGrant(null);
    setCustomer(null);
    setAuthFlag(false);
    // The account belonged to that customer, so a shared device is left with
    // the neutral seeded profile rather than someone else's name and phone.
    setProfile(seedProfile);
    // And the same for what they saved: their history stays in their own slot
    // for their next login, not on screen for the next person.
    releaseLocalAccount();
    // The next sign-in on this page load earns its own recovery refresh.
    recoveringSession.current = false;
    // And no refresh from the account that just left may fire afterwards.
    refreshRetries.current = 0;
    adoptionPending.current = null;
    setRefreshRetryAt(null);
    toast(t("تم تسجيل الخروج"), "info");
  }, [toast, t, applyGrant, setCustomer, setAuthFlag, setProfile, releaseLocalAccount]);

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
      completeProfile,
      favorites,
      isFavorite,
      toggleFavorite,
      points,
      loggedIn,
      ready,
      customer,
      sessionStatus,
      authFetch,
      branding,
      loginPromptOpen,
      loginPromptNext,
      openLoginPrompt,
      closeLoginPrompt,
      login,
      logout,
      adoptLocalAccount,
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
      completeProfile,
      favorites,
      isFavorite,
      toggleFavorite,
      points,
      loggedIn,
      ready,
      customer,
      sessionStatus,
      authFetch,
      branding,
      loginPromptOpen,
      loginPromptNext,
      openLoginPrompt,
      closeLoginPrompt,
      login,
      logout,
      adoptLocalAccount,
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
