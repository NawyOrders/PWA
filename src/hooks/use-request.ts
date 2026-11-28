"use client";

import { useEffect, useState } from "react";

export type RequestState<T> = { data: T; loading: boolean; error: boolean };
export function useRequest<T>(enabled: boolean, key: string, load: () => Promise<T>, initial: T): RequestState<T> {
  const [state, setState] = useState<RequestState<T>>({ data: initial, loading: enabled, error: false });
  useEffect(() => {
    if (!enabled) { setState({ data: initial, loading: false, error: false }); return; }
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: false }));
    load().then((data) => !cancelled && setState({ data, loading: false, error: false })).catch(() => !cancelled && setState({ data: initial, loading: false, error: true }));
    return () => { cancelled = true; };
  // `key` intentionally represents all request inputs; callers supply stable loaders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);
  return state;
}

