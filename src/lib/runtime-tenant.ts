/**
 * The tenant API base URL for the current browser tab.
 *
 * The server render knows the tenant from the request host and passes the
 * resolved base URL into `AppProvider`. Client code then needs to reach the
 * same host for direct tenant calls (orders, addresses, branding revalidation)
 * without a build-time `NEXT_PUBLIC_*` value. A module-level value is safe here
 * because each tenant is a separate origin: one tab can only ever be one store.
 *
 * Server components and route handlers must not use this as their source of
 * truth; they resolve the tenant from the request instead. Writing it on the
 * server would leak one request's tenant into another.
 */

let currentTenantApiBaseUrl = "";

export function setRuntimeTenantApiBaseUrl(value: string | null | undefined): void {
  currentTenantApiBaseUrl = (value ?? "").trim().replace(/\/+$/, "");
}

export function getRuntimeTenantApiBaseUrl(): string {
  return currentTenantApiBaseUrl;
}
