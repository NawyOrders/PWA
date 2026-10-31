# NawyOrders PWA

Minimal localized Next.js PWA. The root route redirects to the default Arabic locale; `/ar` and `/en` show the translated welcome message.

The localized app routes are organized under `src/app/[locale]`. The `(shell)` route group contains the localized welcome home page and the shared shell layout, with feature folders scaffolded for future pages.

```text
src/app/
  page.tsx                    Redirects to the default locale
  [locale]/
    layout.tsx                Locale validation and dictionary provider
    template.tsx
    (shell)/
      layout.tsx
      page.tsx                Localized welcome message
      aboutNawyOrders/
      aboutRestaurant/
      aboutSpaceTech/
      cart/
      dataProcessingAgreement/
      favorites/
      menu/
      orders/
      privacyPolicy/
      profile/
      termsAndConditions/
    address/
    delivery/
    dev/
    item/
    login/
    offline/
    payConfirmation/
    payment/
    restLocation/
    splash/
    tracking/
```

## Getting started

Use Node.js 20.9 or later:

```bash
npm install
npm run dev
```

## Localization structure

```text
src/lib/i18n/
  anchors.ts
  ar.ts
  config.ts
  dictionary.ts
  DictionaryProvider.tsx
  en.ts
  index.ts
  legacy-ar.ts
  legacy-en.ts
  LegacyProvider.tsx
  types.ts
```

Add or edit translated messages in `ar.ts` and `en.ts`; define dictionary fields in `types.ts`.
