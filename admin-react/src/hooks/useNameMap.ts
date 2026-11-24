import { useCallback } from 'react';
import { useList } from './useList';
import { idOf, label } from '../lib/format';

/** Resolves an unpopulated reference (plain id) to a display name using a list endpoint. */
export function useNameMap(endpoint: string, nameOf: (r: any) => string = (r) => label(r)) {
  const { items } = useList(endpoint);
  return useCallback((ref: any): string => {
    if (ref == null || ref === '') return '';
    if (typeof ref === 'object') return label(ref);
    const hit = items.find((i) => idOf(i) === String(ref));
    return hit ? nameOf(hit) : '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
}
