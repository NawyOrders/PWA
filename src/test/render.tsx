import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/providers";
import { seedTestStorage, testMenu } from "@/test/menu";

export function AppTestProvider({ children }: { children: ReactNode }) {
  seedTestStorage();
  return <AppProvider initialMenu={testMenu}>{children}</AppProvider>;
}

export function renderApp(ui: ReactNode) {
  return render(ui, { wrapper: AppTestProvider });
}

export function renderAppHook<T>(hook: () => T) {
  return renderHook(hook, { wrapper: AppTestProvider });
}
