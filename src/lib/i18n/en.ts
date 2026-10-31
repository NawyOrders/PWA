import type { Dictionary } from "./types";

export const en = {
  nav: {
    menu: "Menu",
    about: "About",
    switchLanguage: "العربية",
  },
  home: {
    welcomeMessage: "Welcome",
    eyebrow: "A little joy in every bite",
    titleFirst: "Your favorites,",
    titleSecond: "your way.",
    description: "Pick something fresh and make every detail just the way you like it.",
    orderButton: "Order the Baladi Burger",
    customerRating: "customer rating",
    picksEyebrow: "OUR PICKS",
    picksTitle: "Good things to try",
    freshDaily: "Fresh every day",
  },
  menu: {
    featured: "FAN FAVORITE",
    currency: "EGP",
  },
  item: {
    backToMenu: "← Menu",
    chooseSize: "Choose a size",
    sizes: { regular: "Regular", double: "Double", triple: "Triple" },
    extras: "Add extras",
    toppings: { cheese: "Extra cheese", jalapeno: "Jalapeños", mushrooms: "Mushrooms" },
    orderNotes: "Order notes",
    notesPlaceholder: "For example: no onions...",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    addToCart: "Add to cart",
    addedToCart: "Added to cart ✓",
  },
  offline: {
    title: "You’re offline",
    message: "Reconnect to the internet and try again. We’ll be here.",
    backToMenu: "Back to menu",
  },
  footer: "Fresh, fast, and made your way.",
} satisfies Dictionary;
