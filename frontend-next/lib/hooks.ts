'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiClientError, Meta, qs } from '@/lib/client';

export interface UseApi<T> {
  data: T | null;
  meta?: Meta;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** GET a resource; pass `null` as path to skip. Re-fetches when the path or params change. */
export function useApi<T = any>(path: string | null, params?: Record<string, string | number | boolean | undefined | null>): UseApi<T> {
  const key = path ? path + qs(params) : null;
  const [state, setState] = useState<{ data: T | null; meta?: Meta; loading: boolean; error: string | null }>({
    data: null,
    loading: !!key,
    error: null,
  });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const first = useRef(true);

  useEffect(() => {
    if (!key) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    // Keep previous data visible while reloading (no flash), but show loading on first load.
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get<T>(key, undefined, ctrl.signal)
      .then((r) => setState({ data: r.data, meta: r.meta, loading: false, error: null }))
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return;
        setState({ data: null, loading: false, error: e instanceof ApiClientError ? e.message : 'Something went wrong' });
      });
    first.current = false;
    return () => ctrl.abort();
  }, [key, tick]);

  return { ...state, reload };
}

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
