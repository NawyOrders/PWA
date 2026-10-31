import type { Dictionary } from "./types";

export const ar = {
  nav: {
    menu: "القائمة",
    about: "عنّا",
    switchLanguage: "English",
  },
  home: {
    welcomeMessage: "أهلاً وسهلاً",
    eyebrow: "طعم يفرّح يومك",
    titleFirst: "وجبتك المفضلة،",
    titleSecond: "على مزاجك.",
    description: "اختار من أكلاتنا الطازة وخلّي كل تفصيلة زي ما بتحب.",
    orderButton: "اطلب برجر بلدي",
    customerRating: "تقييم العملاء",
    picksEyebrow: "اختياراتنا",
    picksTitle: "أكلات تستاهل التجربة",
    freshDaily: "طازة كل يوم",
  },
  menu: {
    featured: "الأكثر طلباً",
    currency: "ج.م",
  },
  item: {
    backToMenu: "← القائمة",
    chooseSize: "اختار الحجم",
    sizes: { regular: "عادي", double: "دبل", triple: "تريبل" },
    extras: "إضافاتك",
    toppings: { cheese: "جبنة إضافية", jalapeno: "هالبينو", mushrooms: "مشروم" },
    orderNotes: "ملاحظات على الطلب",
    notesPlaceholder: "مثلاً: من غير بصل...",
    decreaseQuantity: "تقليل الكمية",
    increaseQuantity: "زيادة الكمية",
    addToCart: "أضف للسلة",
    addedToCart: "اتضاف للسلة ✓",
  },
  offline: {
    title: "أنت غير متصل حالياً",
    message: "ارجع اتصل بالإنترنت وجرب تاني. هنكون مستنيينك.",
    backToMenu: "العودة للقائمة",
  },
  footer: "طازج، سريع، وعلى مزاجك.",
} satisfies Dictionary;
