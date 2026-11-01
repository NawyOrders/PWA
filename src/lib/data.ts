export type CategorySlug =
  | "burger"
  | "pizza"
  | "toast"
  | "chicken"
  | "drinks"
  | "sweets"
  | "appetizers";

export interface Category {
  slug: CategorySlug;
  name: string;
  count: number;
  icon: string;
  blurb: string;
}

export type ProductTag =
  | "popular"
  | "offer"
  | "new"
  | "vegetarian"
  | "family"
  | "kids"
  | "combo"
  | "beef"
  | "chicken"
  | "fish";

export interface Product {
  slug: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: CategorySlug;
  tags: ProductTag[];
  badge?: string;
  calories?: number;
  prepTime?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  distance: string;
  open: boolean;
  hours: string;
}

export interface Order {
  id: string;
  items: string;
  date: string;
  total: number;
  status: "preparing" | "delivered";
  statusLabel: string;
  products: string[];
  eta?: string;
}

export interface SiteNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: "brand" | "sun" | "success";
  unread: boolean;
  action: string;
  href: string;
  image?: string;
}

export const site = {
  name: "ناوي أوردر",
  nameEn: "Nawy Order",
  tagline: "أطلب أكلك المفضل أونلاين",
  description:
    "ناوي أوردر — اطلب ألذ البرجر والبيتزا والفرايد تشيكن أونلاين مع توصيل سريع في أسكندرية وكل الفروع. عروض يومية ووجبات طازة توصل لباب البيت.",
  phone: "19885",
  phoneHref: "tel:19885",
  currency: "جنيه",
  address: "زهراء المعادي، المعراج العلوي، القاهرة",
  areaServed: "الإسكندرية والقاهرة",
  openingHours: "يوميًا من 11:00 صباحًا حتى 1:30 بعد منتصف الليل",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const categories: Category[] = [
  {
    slug: "sweets",
    name: "حلويات",
    count: 8,
    icon: "/images/products/sweets.jpg",
    blurb: "حلويات طازة تكمّل الوجبة على مودك",
  },
  {
    slug: "appetizers",
    name: "مقبلات",
    count: 14,
    icon: "/images/products/chicken.jpg",
    blurb: "مقبلات ومشاريب تخليك على طول جاهز",
  },
  {
    slug: "drinks",
    name: "مشروبات",
    count: 9,
    icon: "/images/categories/drinks.png",
    blurb: "مشروبات باردة وطازة مع كل وجبة",
  },
  {
    slug: "chicken",
    name: "فرايد تشيكن",
    count: 16,
    icon: "/images/categories/chicken.png",
    blurb: "دجاج مقرمش بخلطة توابل ناوي السرية",
  },
  {
    slug: "toast",
    name: "توست",
    count: 12,
    icon: "/images/categories/toast.png",
    blurb: "توست محمص بحشوات سخنة وجبنة سايحة",
  },
  {
    slug: "pizza",
    name: "بيتزا",
    count: 18,
    icon: "/images/categories/pizza.png",
    blurb: "عجينة إيطالية وموتزاريلا سايحة من الفرن",
  },
  {
    slug: "burger",
    name: "برجر",
    count: 24,
    icon: "/images/categories/burger.png",
    blurb: "برجر يطعمك تحت، طازة ومحضر مخصوص ليك",
  },
];

export const categoriesBySlug = Object.fromEntries(
  categories.map((category) => [category.slug, category]),
) as Record<CategorySlug, Category>;

export const homeCategorySlugs: CategorySlug[] = [
  "burger",
  "pizza",
  "toast",
  "chicken",
  "drinks",
];

export const products: Product[] = [
  {
    slug: "burger-samak",
    name: "برجر سمك",
    description: "قطعتان فيليه سمك مع سلطة كول سلو وصوصة ثومية",
    price: 125,
    oldPrice: 140,
    image: "/images/products/burger.jpg",
    category: "burger",
    tags: ["popular", "fish", "offer"],
    badge: "الأكثر طلبًا",
    calories: 610,
    prepTime: "20 - 25 دقيقة",
  },
  {
    slug: "burger-lahm",
    name: "برجر لحم",
    description: "قطعتان لحم مع الجين والخضار بصوص خاص",
    price: 120,
    oldPrice: 150,
    image: "/images/products/burger.jpg",
    category: "burger",
    tags: ["popular", "beef", "offer"],
    calories: 640,
    prepTime: "20 - 25 دقيقة",
  },
  {
    slug: "burger-dajaj",
    name: "برجر دجاج",
    description: "صدر دجاج مشوي مع جبن وطماطم وصوص المايونيز",
    price: 100,
    image: "/images/products/burger.jpg",
    category: "burger",
    tags: ["popular", "chicken"],
    calories: 520,
    prepTime: "15 - 20 دقيقة",
  },
  {
    slug: "burger-nabati",
    name: "برجر نباتي",
    description: "قطع من الخضروات والتقليات مع صوص الطحينة والسلطة",
    price: 90,
    image: "/images/products/burger.jpg",
    category: "burger",
    tags: ["vegetarian", "new"],
    badge: "نباتي",
    calories: 410,
    prepTime: "15 - 20 دقيقة",
  },
  {
    slug: "pizza-pepperoni",
    name: "بيتزا بيروني",
    description: "بيتزا كبيرة بيروني مع موتزاريلا وصوص طماطم إيطالي",
    price: 180,
    oldPrice: 210,
    image: "/images/products/pizza.jpg",
    category: "pizza",
    tags: ["popular", "offer", "family"],
    badge: "خصم 15%",
    calories: 890,
    prepTime: "25 - 30 دقيقة",
  },
  {
    slug: "pizza-margherita",
    name: "بيتزا مارجريتا",
    description: "بيتزا وسط جبنة موتزاريلا وريحان طازج",
    price: 150,
    image: "/images/products/pizza.jpg",
    category: "pizza",
    tags: ["vegetarian", "family"],
    calories: 720,
    prepTime: "25 - 30 دقيقة",
  },
  {
    slug: "fried-chicken-meal",
    name: "وجبة فرايد تشيكن",
    description: "٤ قطع دجاج مقرمش مع بطاطس وكول سلو",
    price: 140,
    image: "/images/products/chicken.jpg",
    category: "chicken",
    tags: ["popular", "family"],
    calories: 980,
    prepTime: "25 - 30 دقيقة",
  },
  {
    slug: "chicken-strips",
    name: "أصابع دجاج",
    description: "٦ أصابع دجاج مقرمشة مع صوص باربكيو",
    price: 95,
    image: "/images/products/chicken.jpg",
    category: "chicken",
    tags: ["kids", "chicken"],
    calories: 560,
    prepTime: "15 - 20 دقيقة",
  },
  {
    slug: "toast-chicken",
    name: "توست دجاج",
    description: "توست محمص مع دجاج مشوي وجبن شيدر وصوص خاص",
    price: 75,
    image: "/images/products/toast.jpg",
    category: "toast",
    tags: ["new", "chicken"],
    calories: 430,
    prepTime: "10 - 15 دقيقة",
  },
  {
    slug: "cola-ice",
    name: "كولا بالثلج",
    description: "كوب كبير كولا باردة بالثلج",
    price: 20,
    image: "/images/products/drinks.jpg",
    category: "drinks",
    tags: ["kids"],
    calories: 140,
  },
  {
    slug: "lemon-mint",
    name: "ليمون بالنعناع",
    description: "ليمون طازج مع نعناع مجروش وثلج",
    price: 25,
    image: "/images/products/drinks.jpg",
    category: "drinks",
    tags: ["new", "vegetarian"],
    calories: 90,
  },
  {
    slug: "chocolate-cake",
    name: "تشيز كيك شوكولاتة",
    description: "قطعة تشيز كيك شوكولاتة بصوص جاناش وفراولة",
    price: 60,
    image: "/images/products/sweets.jpg",
    category: "sweets",
    tags: ["new"],
    calories: 380,
  },
];

export const productsBySlug = Object.fromEntries(
  products.map((product) => [product.slug, product]),
) as Record<string, Product>;

export function getProductsByCategory(category: CategorySlug) {
  return products.filter((product) => product.category === category);
}

export function getPopularProducts(limit = 5) {
  return products.filter((product) => product.tags.includes("popular")).slice(0, limit);
}

export const menuFilters = [
  { id: "beef", label: "برجر لحم" },
  { id: "offer", label: "كومبو التوفر" },
  { id: "family", label: "وجبات العائلة" },
  { id: "kids", label: "وجبات أطفال" },
  { id: "all", label: "الكل" },
] as const;

export type MenuFilter = (typeof menuFilters)[number]["id"];

export const branches: Branch[] = [
  {
    id: "nakhil",
    name: "فرع النخيل",
    address: "حي النخيل، شارع السلطان محمد فرع الملك، الإسكندرية، مصر",
    distance: "1.5 كم",
    open: true,
    hours: "1:00 - 1:30 صباحًا",
  },
  {
    id: "smooha",
    name: "فرع سموحة",
    address: "شارع فوزي معاذ، سموحة، الإسكندرية، مصر",
    distance: "2.3 كم",
    open: true,
    hours: "1:00 - 1:30 صباحًا",
  },
  {
    id: "sidi-bishr",
    name: "فرع سيدي بشر",
    address: "شارع خالد بن الوليد، سيدي بشر، الإسكندرية، مصر",
    distance: "3.1 كم",
    open: true,
    hours: "1:00 - 1:30 صباحًا",
  },
  {
    id: "agami",
    name: "فرع العجمي",
    address: "شارع البيطاش، العجمي، الإسكندرية، مصر",
    distance: "5.8 كم",
    open: true,
    hours: "1:00 - 1:30 صباحًا",
  },
];

export const orders: Order[] = [
  {
    id: "1048",
    items: "٢ برجر لحم + بطاطس + ٢ كولا",
    date: "٢٧ أكتوبر ٢٠٢٦ · ٨:١٠ م",
    total: 330,
    status: "preparing",
    statusLabel: "قيد التحضير",
    products: ["burger-lahm", "burger-lahm", "fried-chicken-meal", "cola-ice", "cola-ice"],
    eta: "٣٠ - ٤٥ دقيقة",
  },
  {
    id: "10193",
    items: "١ بيتزا كبيرة + ٢ كولا",
    date: "٢٤ أكتوبر ٢٠٢٦ · ٧:٣٠ م",
    total: 285,
    status: "delivered",
    statusLabel: "تم التوصيل",
    products: ["pizza-pepperoni", "cola-ice", "cola-ice"],
  },
  {
    id: "10192",
    items: "١ بيتزا كبيرة + ٢ كولا",
    date: "٢٤ أكتوبر ٢٠٢٦ · ٧:٣٠ م",
    total: 285,
    status: "delivered",
    statusLabel: "تم التوصيل",
    products: ["pizza-pepperoni", "cola-ice", "cola-ice"],
  },
  {
    id: "10126",
    items: "٤ قطع دجاج + بطاطس + كول سلو",
    date: "٢٠ أكتوبر ٢٠٢٦ · ٩:٠٠ م",
    total: 240,
    status: "delivered",
    statusLabel: "تم التوصيل",
    products: ["fried-chicken-meal"],
  },
];

export const notifications: SiteNotification[] = [
  {
    id: "n1",
    title: "طلبك في الطريق ليك!",
    body: "طلبك رقم 1048 خرج للتوصيل. استعد، أكلك هيوصلك خلال 10 دقايق.",
    time: "منذ 5 دقائق",
    tone: "brand",
    unread: true,
    action: "تتبع طلبك",
    href: "/orders",
  },
  {
    id: "n2",
    title: "عرض الشقاوة مستنيك",
    body: "خصم 20% على البرجر لحد 50 جنيه. استخدم كود NAWY20، العرض لآخر اليوم.",
    time: "منذ ساعتين",
    tone: "sun",
    unread: true,
    action: "اطلب دلوقتي",
    href: "/categories/burger",
    image: "/images/products/burger.jpg",
  },
  {
    id: "n3",
    title: "بالهنا والشفا يا أحمد!",
    body: "طلبك رقم 10193 وصل. قولنا رأيك في الوجبة، تقييمك يهمنا.",
    time: "أمس · 8:30 م",
    tone: "success",
    unread: false,
    action: "قيّم طلبك",
    href: "/orders",
  },
  {
    id: "n4",
    title: "نقاطك وصلت 320 نقطة",
    body: "جمعت 320 نقطة، تقدر تستبدلها بوجبة مجانية من المفضلة.",
    time: "منذ 3 أيام",
    tone: "sun",
    unread: false,
    action: "اعرف أكتر",
    href: "/profile",
  },
  {
    id: "n5",
    title: "التوصيل علينا",
    body: "استمتع بتوصيل مجاني على طلبك الجاي من 200 جنيه.",
    time: "أمس · 12:00 ظهرًا",
    tone: "brand",
    unread: false,
    action: "اطلب دلوقتي",
    href: "/categories",
  },
];

export const breadOptions = [
  {
    id: "sandwich",
    name: "ساندوتش فقط",
    description: "الكومبو يشمل بطاطس ومشروب غازي",
    price: 125,
    extra: 0,
  },
  {
    id: "combo",
    name: "كومبو",
    description: "بطاطس ومشروب غازي + جبنة إضافية",
    price: 45,
    extra: 45,
  },
];

export const extraOptions = [
  { id: "cheese", name: "شريحة جبنة", price: 10 },
  { id: "sauce", name: "صوص تومية إضافي", price: 15 },
  { id: "fries", name: "بطاطس صغيرة", price: 25 },
];

export const paymentMethods = [
  { id: "cash", name: "الدفع عند الاستلام", description: "ادفع نقدًا عند وصول الطلب" },
  { id: "instapay", name: "انستا باي", description: "تحويل فوري عبر انستا باي" },
  { id: "wallet", name: "محفظة إلكترونية", description: "فودافون كاش وغيرها" },
];

export const deliveryFee = 30;
