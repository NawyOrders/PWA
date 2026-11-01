export type AddressKind = "home" | "work" | "family" | "cafe" | "other";

export type SavedAddress = {
  id: string;
  title: string;
  detail: string;
  area: string;
  kind: AddressKind;
  lastUsed?: string;
  lat: number;
  lng: number;
};

export const savedAddresses: SavedAddress[] = [
  {
    id: "home",
    title: "المنزل",
    detail: "شارع الشهيد احمد مصطفي",
    area: "اسكندرية، سموحة",
    kind: "home",
    lastUsed: "آخر استخدام: اليوم",
    lat: 31.1939,
    lng: 29.9216,
  },
  {
    id: "family",
    title: "منزل العائلة",
    detail: "شارع الفريق محمد فوزي",
    area: "اسكندرية، سموحة",
    kind: "family",
    lat: 31.1972,
    lng: 29.9046,
  },
  {
    id: "work",
    title: "العمل",
    detail: "شارع الوردانية",
    area: "كرموس",
    kind: "work",
    lat: 31.1906,
    lng: 29.9131,
  },
  {
    id: "cafe",
    title: "القهوة",
    detail: "شارع محمد بهاء الدين الغوري",
    area: "اسكندرية، سموحة",
    kind: "cafe",
    lat: 31.1861,
    lng: 29.9442,
  },
];

export const addressKinds: { id: AddressKind; label: string; icon: "home" | "work" | "family" | "other" }[] = [
  { id: "home", label: "المنزل", icon: "home" },
  { id: "work", label: "العمل", icon: "work" },
  { id: "family", label: "منزل العائلة", icon: "family" },
  { id: "other", label: "اخري", icon: "other" },
];

export type FaqItem = { id: string; question: string; answer: string; popular?: boolean };

export const faqItems: FaqItem[] = [
  {
    id: "eta",
    question: "كم يستغرق توصيل الطلب في المتوسط؟",
    answer: "يتم توصيل معظم الطلبات خلال 25 إلى 40 دقيقة حسب موقعك والمطعم المختار. يمكنك متابعة حالة طلبك مباشرة عبر خريطة التتبع الحي داخل التطبيق.",
    popular: true,
  },
  {
    id: "payment",
    question: "ما هي طرق الدفع المتاحة؟",
    answer: "نقبل الدفع عند الاستلام كاش، وInstaPay، وكروت Visa وMastercard، ومحافظ فودافون كاش وأورنچ باي. كل المعاملات مشفّرة داخل التطبيق.",
  },
  {
    id: "delivery-fee",
    question: "رسوم التوصيل كام؟",
    answer: "رسوم التوصيل 30 جنيه لكل الطلبات داخل نطاق الإسكندرية، وتكون مجاناً على الطلبات الأكثر من 200 جنيه أو عند الاستلام من الفرع.",
  },
  {
    id: "cancel",
    question: "أقدر ألغي الطلب بعد ما أأكد؟",
    answer: "تقدر تلغي الطلب مجاناً قبل بدء التحضير. بعد بدء التحضير تواصل مع الدعم على 19885 وهنشوف معاك الحل الأنسب.",
  },
  {
    id: "pickup",
    question: "هل يوجد استلام من الفرع؟",
    answer: "نعم، اختر «الاستلام» وقت الطلب وحدد أقرب فرع، وهيكون طلبك جاهز خلال 20 إلى 30 دقيقة بدون رسوم توصيل.",
  },
  {
    id: "offer",
    question: "إزاي أستخدم كود الخصم؟",
    answer: "ادخل كود الخصم في خانة «عندك كود خصم؟» داخل ملخص السلة واضغط تطبيق، والخصم هيظهر فوراً في الإجمالي.",
  },
];

export type ChatMessage = {
  id: string;
  from: "agent" | "user";
  text: string;
  time: string;
};

export const chatSeed: ChatMessage[] = [
  {
    id: "m1",
    from: "agent",
    text: "مرحباً بك في مطبخنا الفاخر 👋 , كيف يمكنني مساعدتك اليوم؟",
    time: "1:10 م",
  },
  {
    id: "m2",
    from: "user",
    text: "اريد استفسار عن طلبي رقم 2345 , لم يصل حتي الان",
    time: "1:10 م",
  },
  {
    id: "m3",
    from: "agent",
    text: "اتفهم قلقك تمام, دعني اتحقق من حالة طلبك فورا",
    time: "1:10 م",
  },
  {
    id: "m4",
    from: "agent",
    text: "لقد تحققت طلبك في الطريق سيصل خلال 10 دقائق",
    time: "1:10 م",
  },
  {
    id: "m5",
    from: "user",
    text: "جيد شكرا علي سرعة الاستجابة",
    time: "1:10 م",
  },
];

export const agentReplies = [
  "تمام, جاري متابعة طلبك الآن وهوافيك بأي تحديث.",
  "شكرا لصبرك, المندوب على بُعد 5 دقائق من عنوانك.",
  "تم إبلاغ المطبخ, طلبك جاهز للاستلام خلال 15 دقيقة.",
  "لو عندك أي استفسار تاني أنا موجود معاك في أي وقت.",
];

export const reportProblemTypes = [
  "مشكلة في التوصيل",
  "مشكلة في التطبيق",
  "مشكلة في الطلب",
  "مشكلة في الدفع",
];

export const feedbackTypes = ["اقتراح", "شكوى", "مديح", "تجربة عامة"];

export const feedbackRatings = [
  { value: 1, label: "سيء" },
  { value: 2, label: "غير مرضي" },
  { value: 3, label: "عادي" },
  { value: 4, label: "جيد" },
  { value: 5, label: "ممتاز" },
];

export type PolicySection = { id: string; title: string; body: string };

export const policies: Record<"privacy" | "terms" | "data", { title: string; sections: PolicySection[] }> = {
  privacy: {
    title: "سياسة الخصوصية",
    sections: [
      {
        id: "intro",
        title: "مقدمة",
        body: "نرحب بكم في تطبيقنا، حيث نولي اهتماماً بالغاً لخصوصيتكم وحماية بياناتكم الشخصية. توضح هذه السياسة كيفية جمعنا واستخدامنا وبياناتنا لمعلوماتكم عند استخدامكم لخدماتنا الحصرية.",
      },
      {
        id: "collect",
        title: "جمع المعلومات",
        body: "نقوم بجمع المعلومات التي تقدمونها مباشرة مثل الاسم ورقم الهاتف والعنوان عند إنشاء الحساب أو تقديم الطلبات، بالإضافة إلى بيانات الموقع الجغرافي لتحسين تجربة التوصيل.",
      },
      {
        id: "use",
        title: "استخدام المعلومات",
        body: "تُستخدم بياناتكم لتقديم تجربة طهي فاخرة ومخصصة، وتحسين خدماتنا، وإرسال العروض الحصرية، وضمان أمان المعاملات المالية داخل التطبيق.",
      },
      {
        id: "share",
        title: "مشاركة المعلومات",
        body: "لا نشارك بياناتكم الشخصية مع أطراف ثالثة إلا بموافقتكم الصريحة أو عند الضرورة القانونية، ونحرص دائماً على تعامل شركائنا وفق أعلى معايير السرية.",
      },
      {
        id: "security",
        title: "الأمان",
        body: "نعتمد أحدث تقنيات التشفير وأنظمة الحماية المتقدمة لضمان سلامة بياناتكم من أي وصول غير مصرح به أو اختراق محتمل.",
      },
    ],
  },
  terms: {
    title: "الشروط والاحكام",
    sections: [
      {
        id: "accept",
        title: "قبول الشروط",
        body: "باستخدامك تطبيق ناوي أوردرز فإنك توافق على هذه الشروط والأحكام بالكامل. إذا لم توافق على أي بند يرجى التوقف عن استخدام الخدمة فوراً.",
      },
      {
        id: "orders",
        title: "الطلبات والتأكيد",
        body: "تأكيد الطلب يعني موافقتك على الأصناف والأسعار المعروضة. قد تتغير الأسعار أو تتوقف بعض الأصناف حسب المتوفر في المطبخ، وسنبلغك بأي تغيير قبل بدء التحضير.",
      },
      {
        id: "cancellation",
        title: "الإلغاء والاسترجاع",
        body: "يمكنك إلغاء الطلب مجاناً قبل بدء التحضير. بعد بدء التحضير تُطبّق سياسة الاسترجاع، ويتم رد المبلغ لنفس وسيلة الدفع خلال 3 إلى 7 أيام عمل.",
      },
      {
        id: "conduct",
        title: "استخدام الخدمة",
        body: "يُمنع استخدام التطبيق لأي غرض غير مشروع أو الإساءة لفريق التوصيل والمطبخ. نحفظ الحق في إيقاف الحسابات التي تخالف هذه الشروط.",
      },
    ],
  },
  data: {
    title: "اتفاقية معالجة البيانات",
    sections: [
      {
        id: "roles",
        title: "أطراف الاتفاقية",
        body: "يعمل ناوي أوردرز كمسؤول عن معالجة البيانات، بينما يتولى مزودو الخدمة التقنية دور المعالج نيابة عنا، ضمن حدود التعليمات الموثقة.",
      },
      {
        id: "scope",
        title: "نطاق المعالجة",
        body: "تشمل المعالجة بيانات الحساب والعنوان ورقم الهاتف وسجل الطلبات، وتتم داخل خوادم آمنة ولمدة لا تتجاوز المدة النظامية للاحتفاظ بسجلات الطلبات.",
      },
      {
        id: "rights",
        title: "حقوقك",
        body: "يمكنك طلب نسخة من بياناتك أو تصحيحها أو حذفها في أي وقت عبر إعدادات الحساب أو بالتواصل مع الدعم على 19885، وسننفذ الطلب خلال 30 يوماً.",
      },
      {
        id: "safeguards",
        title: "الضمانات الفنية",
        body: "نطبّق ضوابط الوصول الصارمة وتشفير البيانات أثناء النقل والتخزين، ونراجع سجلات المعالجة دورياً للتأكد من عدم استخدام البيانات خارج الأغراض المتفق عليها.",
      },
    ],
  },
};

export const policyTabs = [
  { id: "privacy", label: "سياسة الخصوصية" },
  { id: "terms", label: "الشروط والاحكام" },
  { id: "data", label: "اتفاقية معالجة البيانات" },
] as const;

export const platforms = [
  {
    id: "nawy",
    role: "مدعوم بواسطة",
    name: "Nawy Orders",
    initials: "N",
    tone: "brand",
  },
  {
    id: "spacetech",
    role: "مطور بواسطة",
    name: "Space Tech",
    initials: "ST",
    tone: "violet",
  },
] as const;

export const appVersion = "1.0";
export const policyUpdated = "13 أكتوبر 2026";

export const courier = {
  name: "أحمد خالد",
  role: "عامل توصيل الطلبات",
  rating: 4.8,
  ratingCount: 4433,
  phone: "010 1234 5678",
};

export const trackingSteps = [
  { id: "confirmed", label: "تم التأكيد", icon: "check", time: "10:34 AM" },
  { id: "preparing", label: "جار التحضير", icon: "store", time: "10:34 AM" },
  { id: "onway", label: "في الطريق", icon: "bike", time: "10:34 AM" },
  { id: "delivered", label: "تم الاستلام", icon: "home", time: "10:34 AM" },
] as const;

export const trackingEta = "٣٥-٥٠ دقيقة";

/** Route from the kitchen to the delivery address across Smouha. */
export const trackingRoute: [number, number][] = [
  [31.1806, 29.9121],
  [31.1834, 29.9198],
  [31.1869, 29.9268],
  [31.1908, 29.9318],
  [31.1946, 29.9362],
  [31.1972, 29.9428],
  [31.1994, 29.9506],
  [31.1968, 29.9561],
  [31.1932, 29.9588],
];

export const courierPosition = { lat: 31.1946, lng: 29.9362 };
export const kitchenPosition = { lat: 31.1806, lng: 29.9121 };
export const destinationPosition = { lat: 31.1932, lng: 29.9588 };
export const trackingCenter: [number, number] = [31.19, 29.935];

export const helpCards = [
  { id: "faq", label: "الأسئلة الشائعة", note: "إجابات سريعة", icon: "help" },
  { id: "chat", label: "محادثة مباشرة", note: "متاح الان", icon: "chat" },
  { id: "feedback", label: "ارسال ملاحظات", note: "رأيك يهمنا", icon: "send" },
  { id: "report", label: "الابلاغ عن مشكلة", note: "دعم فني فوري", icon: "alert" },
] as const;
