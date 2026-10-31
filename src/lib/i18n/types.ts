export type Locale = "ar" | "en";

export type Dictionary = {
  nav: {
    menu: string;
    about: string;
    switchLanguage: string;
  };
  home: {
    welcomeMessage: string;
    eyebrow: string;
    titleFirst: string;
    titleSecond: string;
    description: string;
    orderButton: string;
    customerRating: string;
    picksEyebrow: string;
    picksTitle: string;
    freshDaily: string;
  };
  menu: {
    featured: string;
    currency: string;
  };
  item: {
    backToMenu: string;
    chooseSize: string;
    sizes: { regular: string; double: string; triple: string };
    extras: string;
    toppings: { cheese: string; jalapeno: string; mushrooms: string };
    orderNotes: string;
    notesPlaceholder: string;
    decreaseQuantity: string;
    increaseQuantity: string;
    addToCart: string;
    addedToCart: string;
  };
  offline: {
    title: string;
    message: string;
    backToMenu: string;
  };
  footer: string;
};

export type DictionaryContextValue = {
  locale: Locale;
  dictionary: Dictionary;
};
