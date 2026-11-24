import { useMemo } from 'react';
import { useList } from './useList';
import type { FilterDef } from '../types';
import { label } from '../lib/format';

/** Builds a table filter whose options come from a list endpoint (matched by the populated reference's label). */
export function useRefFilter(key: string, title: string, endpoint: string, itemLabel: (r: any) => string = (r) => label(r)): FilterDef {
  const { items } = useList(endpoint);
  return useMemo(() => {
    const names = Array.from(new Set(items.map(itemLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return { key, label: title, options: names.map((n) => ({ value: n, label: n })) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, key, title]);
}
