import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/providers";
import type { Offer } from "@/lib/offers";
import { seedTestStorage, testMenu } from "@/test/menu";

export function AppTestProvider({
  children,
  offers = null,
}: {
  children: ReactNode;
  /** `null` keeps the built-in demo slides; an array switches to tenant offers. */
  offers?: Offer[] | null;
}) {
  seedTestStorage();
  return (
    <AppProvider initialMenu={testMenu} initialOffers={offers}>
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
