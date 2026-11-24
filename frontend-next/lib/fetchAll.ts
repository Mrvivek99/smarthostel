import { api } from '@/lib/client';

/** Pages through a paginated list endpoint and returns every row (capped to protect the browser). */
export async function fetchAll<T = any>(path: string, params: Record<string, string | number | boolean | undefined | null> = {}, cap = 20): Promise<T[]> {
  const out: T[] = [];
  const limit = 100;
  for (let page = 1; page <= cap; page++) {
    const r = await api.get<T[]>(path, { ...params, page, limit });
    out.push(...(r.data ?? []));
    const total = r.meta?.total ?? out.length;
    if (!r.data?.length || out.length >= total) break;
  }
  return out;
}
