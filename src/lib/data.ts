/**
 * Demo data that is not part of a tenant's menu: the offline identity, the
 * delivery fee, payment labels and formatting helpers.
 *
 * Menu categories and items live in `tenants/<slug>/menu.json` and reach the UI
 * through the provider (see `src/lib/static-menu-data.ts`).
 */

export type OrderItem = {
  productId: string;
  nameAr: string;
  nameEn: string;
  qty: number;
  price: number;
  /** The chosen variant label, when the item is sold by variant. */
  variant?: string;
  note?: string;
};

export type Order = {
  id: string;
  status: "preparing" | "delivered";
  date: string;
  total: number;
  eta?: string;
  items?: OrderItem[];
  paymentMethod?: PaymentMethodId;
  fulfilment?: "delivery" | "pickup";
  branchId?: string;
  address?: string;
  createdAt?: number;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  group: "today" | "yesterday";
  unread: boolean;
  icon: "delivery" | "offer" | "done" | "free";
  image?: string;
  action?: string;
};

export type Branch = {
  id: string;
  name: string;
  address: string;
  distance: number;
  open: boolean;
};

export const notifications: AppNotification[] = [
  {
    id: "n1",
    title: "طلبك في الطريق ليك!",
    body: "طلبك رقم ١٠٢٤٨ خرج للتوصيل. استعد، أكلك هيوصلك خلال 10 دقائق.",
    time: "منذ 5 دقائق",
    group: "today",
    unread: true,
    icon: "delivery",
    action: "تتبع طلبك",
  },
  {
    id: "n2",
    title: "عرض الشقاوة مستنيك",
    body: "خصم 20% على البرجر لحد 50 جنيه. استخدم كود NAWY20، العرض لآخر اليوم.",
    time: "منذ ساعة",
    group: "today",
    unread: true,
    icon: "offer",
    image: "/images/burger.webp",
    action: "اطلب دلوقتي",
  },
  {
    id: "n3",
    title: "بالهنا والشفا يا أحمد!",
    body: "طلبك رقم ١٠٢٤٦ وصل. قولنا رأيك في الوجبة، تقييمك يهمنا.",
    time: "أمس، 8:30 مساءً",
    group: "yesterday",
    unread: false,
    icon: "done",
    action: "قيّم طلبك",
  },
  {
    id: "n4",
    title: "التوصيل علينا",
    body: "استمتع بتوصيل مجاني على طلبك الجاي من 200 جنيه.",
    time: "أمس، 12:00 ظهراً",
    group: "yesterday",
    unread: false,
    icon: "free",
  },
];

export const branches: Branch[] = [
  {
    id: "nakheel",
    name: "فرع النخيل",
    address: "حي النخيل، شارع السلطان محمد فرع الملك، الإسكندرية، مصر",
    distance: 1.5,
    open: true,
  },
  {
    id: "sidi",
    name: "فرع سيدي بشر",
    address: "سيدي بشر، شارع خالد بن الوليد، الإسكندرية، مصر",
    distance: 2.3,
    open: true,
  },
  {
    id: "smouha",
    name: "فرع سموحة",
    address: "سموحة، شارع فوزي معاذ، الإسكندرية، مصر",
    distance: 3.1,
    open: true,
  },
  {
    id: "maadi",
    name: "فرع المعادي",
    address: "المعادي، شارع 9، القاهرة، مصر",
    distance: 4.8,
    open: true,
  },
];

export const user = {
  name: "جميل جمال",
  phone: "+20102136515",
  email: "",
  points: 320,
  favorites: 15,
  orders: 8,
  address: "زهراء المعادي، المعراج العلوي",
  fullAddress: "شارع النصر، عمارة 12، بجوار صيدلية العربي",
  avatar: "/images/avatar.webp",
};

export const paymentMethods = [
  {
    id: "cash",
    title: "الدفع عند الاستلام",
    subtitle: "ادفع نقداً عند وصول الطلب",
    icon: "cash",
  },
  {
    id: "instapay",
    title: "انستا باي",
    subtitle: "تحويل فوري عبر انستا باي",
    icon: "instapay",
  },
  {
    id: "wallet",
    title: "محفظة إلكترونية",
    subtitle: "فودافون كاش وغيرها",
    icon: "wallet",
  },
] as const;

export type PaymentMethodId = (typeof paymentMethods)[number]["id"];

export const paymentMethodLabels = Object.fromEntries(
  paymentMethods.map((method) => [method.id, method.title]),
) as Record<PaymentMethodId, string>;

export function formatPrice(value: number) {
  return value.toLocaleString("en-US");
}

export function toArabicDigits(value: string | number) {
  return String(value).replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

export const deliveryFee = 30;
