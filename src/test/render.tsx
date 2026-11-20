import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/providers";
import type { Offer } from "@/lib/offers";
import { seedTestStorage, testMenu } from "@/test/menu";

export function AppTestProvider({
  children,
  offers = null,
  tenantSlug = null,
}: {
  children: ReactNode;
  /** `null` keeps the built-in demo slides; an array switches to tenant offers. */
  offers?: Offer[] | null;
  /** Set it to render the app as a tenant storefront rather than the default site. */
  tenantSlug?: string | null;
}) {
  seedTestStorage();
  return (
    <AppProvider initialMenu={testMenu} initialOffers={offers} initialTenantSlug={tenantSlug}>
      {children}
    </AppProvider>
  );
}

export function renderApp(ui: ReactNode) {
  return render(ui, { wrapper: AppTestProvider });
}

export function renderAppHook<T>(hook: () => T) {
  return renderHook(hook, { wrapper: AppTestProvider });
}
