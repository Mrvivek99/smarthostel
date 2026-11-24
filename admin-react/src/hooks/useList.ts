import { useCallback, useEffect, useRef, useState } from 'react';
import { apiListAll, errMsg } from '../lib/api';
import type { Row } from '../types';

export function useList(endpoint: string | null, params?: Row) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(params ?? {});
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!endpoint) return;
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await apiListAll(endpoint, params);
      if (id === seq.current) setItems(rows);
    } catch (e) {
      if (id === seq.current) setError(errMsg(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, key]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load, setItems };
}
