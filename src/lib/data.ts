export type CategoryId =
  | "burger"
  | "pizza"
  | "tost"
  | "chicken"
  | "drinks"
  | "appetizers"
  | "desserts";

export type Category = {
  id: CategoryId;
  name: string;
  image: string;
  count: number;
};

export type ProductType = "لحم" | "سمك" | "دجاج" | "نباتي" | "بيتزا" | "جانبي" | "مشروب" | "حلويات" | "توش";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: CategoryId;
  type?: ProductType;
  tags: string[];
  popular?: boolean;
  offer?: boolean;
  calories?: number;
};

export type OrderLine = {
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  status: "preparing" | "delivered";
  title: string;
  date: string;
  description: string;
  total: number;
  image: string;
  eta?: string;
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

export const categories: Category[] = [
  { id: "desserts", name: "حلويات", image: "/images/dessert.webp", count: 8 },
  { id: "appetizers", name: "مقبلات", image: "/images/fries.webp", count: 16 },
  { id: "drinks", name: "مشروبات", image: "/images/cola.webp", count: 9 },
  { id: "chicken", name: "فرايد تشيكن", image: "/images/chicken.webp", count: 16 },
  { id: "tost", name: "توست", image: "/images/tost.webp", count: 12 },
  { id: "pizza", name: "بيتزا", image: "/images/pizza.webp", count: 18 },
  { id: "burger", name: "برجر", image: "/images/burger.webp", count: 24 },
];

export const categoriesById = Object.fromEntries(
  categories.map((category) => [category.id, category]),
) as Record<CategoryId, Category>;

export const products: Product[] = [
  {
    id: "beef-burger",
    name: "برجر لحم",
    description: "قطعتان لحم مع الجبن والخضار بصوص خاص",
    price: 120,
    oldPrice: 150,
    image: "/images/burger.webp",
    category: "burger",
    type: "لحم",
    tags: ["الأكثر طلباً", "برجر لحم", "اطعمة مميزة"],
    popular: true,
    calories: 640,
  },
  {
    id: "fish-burger",
    name: "برجر سمك",
    description: "قطعتان فيليه سمك مع سلطة كول سلو وصلصة ثومية",
    price: 125,
    oldPrice: 140,
    image: "/images/burger.webp",
    category: "burger",
    type: "سمك",
    tags: ["الأكثر طلباً", "برجر سمك"],
    popular: true,
    calories: 560,
  },
  {
    id: "chicken-burger",
    name: "برجر دجاج",
    description: "صدر دجاج مشوي مع جبن شيدر وطماطم ومايونيز",
    price: 100,
    oldPrice: 130,
    image: "/images/burger.webp",
    category: "burger",
    type: "دجاج",
    tags: ["برجر دجاج"],
    calories: 520,
  },
  {
    id: "veggie-burger",
    name: "برجر نباتي",
    description: "قطع من الخضروات والتوابل مع صوص الطحينة والسلطة",
    price: 90,
    image: "/images/burger.webp",
    category: "burger",
    type: "نباتي",
    tags: ["عروض", "برجر نباتي"],
    offer: true,
    calories: 410,
  },
  {
    id: "classic-burger",
    name: "برجر لحم كلاسيك",
    description: "قطعتان لحم مع بصل مكرملة خاصة مع الجبن والخضار الطازج",
    price: 120,
    image: "/images/burger.webp",
    category: "burger",
    type: "لحم",
    tags: ["برجر لحم", "اطعمة مميزة"],
    calories: 610,
  },
  {
    id: "double-burger",
    name: "دبل برجر",
    description: "أربع قطع لحم مع جبن مضاعف وصوص ناوي الخاص",
    price: 150,
    oldPrice: 175,
    image: "/images/burger.webp",
    category: "burger",
    type: "لحم",
    tags: ["الأكثر طلباً", "برجر لحم"],
    popular: true,
    calories: 820,
  },
  {
    id: "spicy-burger",
    name: "برجر حار",
    description: "لحم بقري حار مع جبن شيدر وهالبينو وصوص حار",
    price: 135,
    image: "/images/burger.webp",
    category: "burger",
    type: "لحم",
    tags: ["عروض", "برجر لحم"],
    offer: true,
    calories: 690,
  },
  {
    id: "family-box",
    name: "وجبة العائلة",
    description: "4 برجر لحم + بطاطس كبير + 4 مشروب",
    price: 320,
    oldPrice: 380,
    image: "/images/burger.webp",
    category: "burger",
    type: "لحم",
    tags: ["وجبات العائلة", "عروض"],
    offer: true,
    calories: 2100,
  },
  {
    id: "kids-meal",
    name: "وجبة أطفال",
    description: "برجر صغير + بطاطس + عصير + لعبة",
    price: 85,
    image: "/images/burger.webp",
    category: "burger",
    type: "لحم",
    tags: ["وجبات اطفال"],
    calories: 480,
  },
  {
    id: "pizza-pepperoni",
    name: "بيتزا بيبروني",
    description: "بيتزا إيطالية بالبيبروني والجبن الموزاريلا",
    price: 180,
    image: "/images/pizza.webp",
    category: "pizza",
    type: "بيتزا",
    tags: ["اطعمة مميزة"],
    popular: true,
    calories: 980,
  },
  {
    id: "pizza-margherita",
    name: "بيتزا مارجريتا",
    description: "بيتزا بالجبن الموزاريلا والريحان وصلصة الطماطم",
    price: 150,
    image: "/images/pizza.webp",
    category: "pizza",
    type: "بيتزا",
    tags: ["عروض"],
    offer: true,
    calories: 840,
  },
  {
    id: "chicken-bucket",
    name: "وجبة فرايد تشيكن",
    description: "4 قطع دجاج + بطاطس + كول سلو",
    price: 160,
    oldPrice: 190,
    image: "/images/chicken.webp",
    category: "chicken",
    type: "دجاج",
    tags: ["اطعمة مميزة"],
    popular: true,
    calories: 900,
  },
  {
    id: "tost-club",
    name: "توست كلوب",
    description: "توست محمص بالدجاج والجبن والخضار",
    price: 85,
    image: "/images/tost.webp",
    category: "tost",
    type: "توش",
    tags: [],
    calories: 430,
  },
  {
    id: "fries",
    name: "بطاطس مقرمشة",
    description: "بطاطس مقلية ذهبية مع صوص ناوي",
    price: 45,
    image: "/images/fries.webp",
    category: "appetizers",
    type: "جانبي",
    tags: ["اطعمة مميزة"],
    calories: 380,
  },
  {
    id: "onion-rings",
    name: "حلقات بصل",
    description: "حلقات بصل مقرمشة مع صوص الرانش",
    price: 50,
    image: "/images/fries.webp",
    category: "appetizers",
    type: "جانبي",
    tags: [],
    calories: 410,
  },
  {
    id: "cola",
    name: "كوب كولا",
    description: "كولا مثلجة مع ثلج وليمون",
    price: 25,
    image: "/images/cola.webp",
    category: "drinks",
    type: "مشروب",
    tags: [],
    calories: 140,
  },
  {
    id: "water",
    name: "مياه معدنية",
    description: "زجاجة مياه معدنية 500 مل",
    price: 10,
    image: "/images/cola.webp",
    category: "drinks",
    type: "مشروب",
    tags: [],
    calories: 0,
  },
  {
    id: "dessert-ice",
    name: "آيس كريم شوكولاتة",
    description: "آيس كريم كريمي بالشوكولاتة وصوص الكراميل",
    price: 55,
    image: "/images/dessert.webp",
    category: "desserts",
    type: "حلويات",
    tags: [],
    calories: 310,
  },
];

export const productsById = Object.fromEntries(products.map((product) => [product.id, product])) as Record<
  string,
  Product
>;

export const popularProducts = products.filter((product) => product.popular);

export const homeCategoryOrder: CategoryId[] = ["burger", "pizza", "tost", "chicken", "drinks"];

export const desktopCategoryOrder: CategoryId[] = [
  "burger",
  "pizza",
  "tost",
  "chicken",
  "drinks",
  "appetizers",
  "desserts",
];

export const menuFilters = ["الكل", "برجر لحم", "وجبات العائلة", "اطعمة مميزة", "وجبات اطفال"];

export function filterMenu(filter: string) {
  if (filter === "الكل") return products.filter((product) => product.category === "burger");
  return products.filter((product) => product.tags.includes(filter));
}

export const seedCart = [
  { key: "fish-burger|ساندوتش فقط", productId: "fish-burger", qty: 1, price: 125, size: "ساندوتش فقط" },
  { key: "beef-burger|ساندوتش فقط", productId: "beef-burger", qty: 1, price: 120, size: "ساندوتش فقط" },
  { key: "chicken-burger|ساندوتش فقط", productId: "chicken-burger", qty: 1, price: 100, size: "ساندوتش فقط" },
];

export const seedFavorites = [
  "beef-burger",
  "fish-burger",
  "chicken-burger",
  "veggie-burger",
  "double-burger",
  "classic-burger",
  "spicy-burger",
  "family-box",
  "kids-meal",
  "pizza-pepperoni",
];

export const orders: Order[] = [
  {
    id: "10248",
    status: "preparing",
    title: "كومبو برجر لحم",
    date: "اليوم، 27 أكتوبر 2026 • 8:15 م",
    description: "2 برجر لحم + بطاطس + 2 كولا",
    total: 320,
    image: "/images/burger.webp",
    eta: "وقت الوصول المتوقع: 25 - 35 دقيقة",
  },
  {
    id: "10193",
    status: "delivered",
    title: "بيتزا بيبروني",
    date: "24 أكتوبر 2026 • 7:30 م",
    description: "1 بيتزا كبيرة + 2 كولا",
    total: 285,
    image: "/images/pizza.webp",
  },
  {
    id: "10193",
    status: "delivered",
    title: "بيتزا بيبروني",
    date: "24 أكتوبر 2026 • 7:30 م",
    description: "1 بيتزا كبيرة + 2 كولا",
    total: 285,
    image: "/images/pizza.webp",
  },
  {
    id: "10136",
    status: "delivered",
    title: "وجبة فرايد تشيكن",
    date: "20 أكتوبر 2026 • 9:00 م",
    description: "4 قطع دجاج + بطاطس + كول سلو",
    total: 240,
    image: "/images/chicken.webp",
  },
];

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
  {
    id: "n5",
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

export function formatPrice(value: number) {
  return value.toLocaleString("en-US");
}

export const deliveryFee = 30;
