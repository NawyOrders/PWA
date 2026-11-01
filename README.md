# NawyOrders PWA

The Progressive Web App frontend for the NawyOrders platform.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Arabic-first RTL interface using Noto Kufi Arabic
- NawyOrders navy, coral, and cream theme
- Web App Manifest and service worker offline fallback

## Getting started

Use Node.js 20.9 or later, then install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The service worker is registered in production builds only; use `npm run build` followed by `npm start` to try the offline fallback locally.

## Project structure

```text
public/
  icons/              PWA app icons
  sw.js               Service worker and offline navigation fallback
src/
  app/                Localized routes, layouts, and web manifest
    [locale]/         Arabic and English pages
      (shell)/        Storefront pages and navigation shell
      item/[slug]/    Item detail page
      offline/        Offline fallback route
  components/
    item/             Reusable item detail and cart components
  lib/                Shared utilities
  styles/             Shared motion styles
  types/              Shared TypeScript types
```

The sample menu links to `/item/burger-baladi`. Item quantity, size, toppings, and notes are saved as a cart line in local storage when the add-to-cart button is pressed. Add routes under `src/app`, reusable components under `src/components`, and shared helpers under `src/lib`.

## Branching

- `master`: Stable code.
- `dev`: Development and integration.
- `feature/*`: Individual task branches.

Create a separate branch for each task and open a Pull Request into `dev`.
