export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Today as YYYY-MM-DD in the configured timezone. */
export function todayStr(now: Date = new Date()): string {
  const tz = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  return now.toLocaleDateString('en-CA', { timeZone: tz });
}

export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function lastMonths(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const head = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c.key])).join(','));
  return [head, ...body].join('\n');
}
