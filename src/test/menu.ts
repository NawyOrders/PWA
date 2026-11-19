import type { Order } from "@/lib/data";
import type { Category, Item, Menu } from "@/lib/menu";
import { storageKeys } from "@/lib/storage";

/**
 * The menu the component tests boot the provider with. It mirrors the item ids
 * the old demo catalogue exposed, so the setup/checkout journey keeps its
 * fixtures while every price now comes from this menu instead of the data file.
 */

function item(
  categoryId: string,
  id: string,
  nameAr: string,
  nameEn: string,
  price: number | null,
  variants: Item["variants"] = [],
): Item {
  return { id, nameAr, nameEn, price, variants, image: null, categoryId };
}

const burger: Category = {
  id: "burger",
  nameAr: "برجر",
  nameEn: "Burgers",
  image: null,
  items: [
    item("burger", "beef-burger", "برجر لحم", "Beef Burger", 120),
    item("burger", "fish-burger", "برجر سمك", "Fish Burger", 125),
    item("burger", "chicken-burger", "برجر دجاج", "Chicken Burger", 100),
    item("burger", "veggie-burger", "برجر نباتي", "Veggie Burger", 90),
    item("burger", "classic-burger", "برجر لحم كلاسيك", "Classic Beef Burger", 120),
    item("burger", "double-burger", "دبل برجر", "Double Burger", 150),
    item("burger", "spicy-burger", "برجر حار", "Spicy Burger", 135),
    item("burger", "family-box", "وجبة العائلة", "Family Box", 320),
    item("burger", "kids-meal", "وجبة أطفال", "Kids Meal", 85),
    item("burger", "strips-meal", "وجبة استربس", "Strips Meal", null, [
      { key: "5 قطع", price: 155 },
      { key: "8 قطع", price: 200 },
    ]),
  ],
};

const pizza: Category = {
  id: "pizza",
  nameAr: "بيتزا",
  nameEn: "Pizza",
  image: null,
  items: [
    item("pizza", "pizza-pepperoni", "بيتزا بيبروني", "Pepperoni Pizza", 180),
    item("pizza", "pizza-margherita", "بيتزا مارجريتا", "Margherita Pizza", 150),
  ],
};

const chicken: Category = {
  id: "chicken",
  nameAr: "فرايد تشيكن",
  nameEn: "Fried Chicken",
  image: null,
  items: [item("chicken", "chicken-bucket", "وجبة فرايد تشيكن", "Fried Chicken Meal", 160)],
};

const tost: Category = {
  id: "tost",
  nameAr: "توست",
  nameEn: "Toast",
  image: null,
  items: [item("tost", "cheese-tost", "توست جبن", "Cheese Toast", 70)],
};

const appetizers: Category = {
  id: "appetizers",
  nameAr: "مقبلات",
  nameEn: "Appetizers",
  image: null,
  items: [item("appetizers", "fries", "بطاطس مقرمشة", "Crispy Fries", 45)],
};

const drinks: Category = {
  id: "drinks",
  nameAr: "مشروبات",
  nameEn: "Drinks",
  image: null,
  items: [item("drinks", "cola", "كوب كولا", "Cola Cup", 25)],
};

const desserts: Category = {
  id: "desserts",
  nameAr: "حلويات",
  nameEn: "Desserts",
  image: null,
  items: [item("desserts", "chocolate-cake", "تشيز كيك شوكولاتة", "Chocolate Cheesecake", 60)],
};

export const testMenu: Menu = {
  currency: "EGP",
  categories: [burger, pizza, chicken, tost, appetizers, drinks, desserts],
};

export const testCategories = testMenu.categories;
export const testItems = testMenu.categories.flatMap((category) => category.items);
export const testItemsById = new Map(testItems.map((entry) => [entry.id, entry]));
export const testCategoriesById = new Map(testCategories.map((entry) => [entry.id, entry]));

export const seedCart = [
  { productId: "fish-burger", qty: 1, price: 125 },
  { productId: "beef-burger", qty: 1, price: 120 },
  { productId: "chicken-burger", qty: 1, price: 100 },
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

export const seedOrders: Order[] = [
  {
    id: "10248",
    status: "preparing",
    date: "اليوم، 27 أكتوبر 2026 • 8:15 م",
    total: 365,
    eta: "25 - 35 دقيقة",
    paymentMethod: "instapay",
    fulfilment: "delivery",
    address: "زهراء المعادي، المعراج العلوي",
    items: [
      { productId: "beef-burger", nameAr: "برجر لحم", nameEn: "Beef Burger", qty: 2, price: 120 },
      { productId: "fries", nameAr: "بطاطس مقرمشة", nameEn: "Crispy Fries", qty: 1, price: 45 },
      { productId: "cola", nameAr: "كوب كولا", nameEn: "Cola Cup", qty: 2, price: 25 },
    ],
    createdAt: Date.UTC(2026, 9, 27, 20, 15),
  },
  {
    id: "10193",
    status: "delivered",
    date: "24 أكتوبر 2026 • 7:30 م",
    total: 260,
    paymentMethod: "cash",
    fulfilment: "delivery",
    address: "زهراء المعادي، المعراج العلوي",
    items: [
      { productId: "pizza-pepperoni", nameAr: "بيتزا بيبروني", nameEn: "Pepperoni Pizza", qty: 1, price: 180 },
      { productId: "cola", nameAr: "كوب كولا", nameEn: "Cola Cup", qty: 2, price: 25 },
    ],
    createdAt: Date.UTC(2026, 9, 24, 19, 30),
  },
  {
    id: "10136",
    status: "delivered",
    date: "20 أكتوبر 2026 • 9:00 م",
    total: 235,
    paymentMethod: "cash",
    fulfilment: "pickup",
    branchId: "nakheel",
    address: "فرع النخيل",
    items: [
      {
        productId: "chicken-bucket",
        nameAr: "وجبة فرايد تشيكن",
        nameEn: "Fried Chicken Meal",
        qty: 1,
        price: 160,
      },
      { productId: "fries", nameAr: "بطاطس مقرمشة", nameEn: "Crispy Fries", qty: 1, price: 45 },
    ],
    createdAt: Date.UTC(2026, 9, 20, 21, 0),
  },
];

/**
 * Writes the shared demo device state only where a test has not written its
 * own. Cart, favorites and order history are no longer seeded by the app, so
 * the fixtures start each test from the same realistic signed-out device.
 */
export function seedTestStorage() {
  if (typeof window === "undefined") return;
  const seed = (key: string, value: unknown) => {
    try {
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Storage can be blocked in a test; the provider then falls back to [].
    }
  };
  seed(storageKeys.cart, seedCart);
  seed(storageKeys.favorites, seedFavorites);
  seed(storageKeys.orders, seedOrders);
}
