import type { z, ZodTypeAny } from 'zod';

export type FieldErrors = Record<string, string>;

/** Runs a zod schema client-side and returns a field -> message map (first message per field). */
export function validate<S extends ZodTypeAny>(schema: S, values: unknown): { ok: true; data: z.infer<S> } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(values);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const i of r.error.issues) {
    const k = i.path.join('.') || '_';
    if (!errors[k]) errors[k] = i.message;
  }
  return { ok: false, errors };
}

/** Drops empty-string / undefined values so optional zod fields are simply absent. */
export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function attendanceSummary(rows: { status: string }[]) {
  const present = rows.filter((r) => r.status === 'PRESENT').length;
  const absent = rows.filter((r) => r.status === 'ABSENT').length;
  const leave = rows.filter((r) => r.status === 'ON_LEAVE').length;
  const counted = present + absent;
  return { present, absent, leave, total: rows.length, percent: counted ? Math.round((present / counted) * 100) : null as number | null };
}
