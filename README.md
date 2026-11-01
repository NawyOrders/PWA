# ناوي أوردرز — Nawy Orders PWA

Arabic-first (RTL) food-ordering **Progressive Web App** built with **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS v4** — a faithful mobile (390px) and desktop (1440px) recreation of the supplied "Nawy Orders" designs, with a complete English (LTR) mode.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

## Features

- Home feed with promo carousel, category chips, "الأكثر طلباً" and full menu sections
- Categories browsing and Arabic/Latin search with filters
- Product detail with size/extras options, quantity stepper, and favorites
- Cart, checkout, delivery, payment and order confirmation flows
- Account area: profile, addresses, orders, notifications, settings, login
- Client state persisted to `localStorage` (cart, favorites, session) via React Context
- Arabic ↔ English switch with full UI, demo-data and RTL → LTR layout translation

## Language (AR / EN)

- Switch languages from **Settings → عربي / English**. The choice is saved in `localStorage` under `nawy-lang-v1`.
- `src/components/providers.tsx` exposes `lang`, `dir`, `setLang` and `t()`; it also syncs `<html lang dir>`.
- An inline script in `src/app/layout.tsx` applies the saved locale before hydration, so there is no RTL/LTR flash.
- Arabic strings are the dictionary keys; English lives in `src/lib/i18n.ts`. Displayed demo data (orders, notifications, branch names, addresses) is translated at render time.
- Layout uses logical utilities (`start/end`, `ps/pe`, `ms/me`), direction-aware gradients, and mirrored chevrons (`ltr:rotate-180`), so every screen works in both directions.

## Hero artwork

The home hero is configured in [`src/lib/media.ts`](src/lib/media.ts):

```ts
export const heroMedia = {
  rtl: "/images/banner.webp",
  ltr: null, // set to e.g. "/images/banner-en.webp" when you have LTR artwork
};
```

- Replace `public/images/banner.webp` to change the Arabic/RTL hero.
- If `ltr` is `null` (default), the RTL artwork is mirrored in English and the overlay gradient/text move to the opposite side automatically.
- If you add dedicated English artwork, set `ltr` to its path; mirroring is skipped and that image is used as-is.

## PWA

- `src/app/manifest.ts` → `/manifest.webmanifest` (name, icons, shortcuts, `display: standalone`, `dir: rtl`, theme `#E8452C`)
- `public/sw.js` → precaches the shell (`/`, `/offline`, manifest, icons, hero images). Navigation uses network-first with an offline fallback; static assets use cache-first.
- `src/components/service-worker-register.tsx` → registers the worker in production builds
- `/offline` → dedicated offline screen

## Project structure

```
src/app/         App Router routes (home, categories, search, product, cart, checkout, profile, …)
src/components/  UI and feature components
src/lib/data.ts  Products, categories, orders and seeded demo data
public/          Service worker, icons, generated imagery, OG cover
scripts/         Asset generation and headless-Chrome screenshot helpers
```

## Design tokens

Cream `#FBF3EA` · Brand `#E8452C` · Peach `#F7E3D6` · Ink `#201A16` · Muted `#9B8D82` · Success `#38A475` · Gold `#F6A723`, with Cairo (body) and Baloo Bhaijaan 2 (display).
