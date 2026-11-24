export const formatINR = (n: unknown): string => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);
};

export const formatDate = (d: unknown): string => {
  if (!d) return '-';
  const dt = new Date(d as string);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

export const formatDateTime = (d: unknown): string => {
  if (!d) return '-';
  const dt = new Date(d as string);
  return Number.isNaN(dt.getTime())
    ? '-'
    : dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
};

export const titleCase = (s: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Today as YYYY-MM-DD in the hostel timezone (IST). */
export const todayIST = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const monthIST = (): string => todayIST().slice(0, 7);

/** Name of a possibly-populated reference (object with name/roomNumber/bedNumber, or a plain string/id). */
export const nameOf = (x: any, ...keys: string[]): string => {
  if (!x) return '-';
  if (typeof x === 'string') return x;
  for (const k of [...keys, 'name', 'roomNumber', 'bedNumber', 'title']) if (x[k]) return String(x[k]);
  return '-';
};

export const idOf = (x: any): string => (x && typeof x === 'object' ? String(x._id ?? x.id ?? '') : String(x ?? ''));

export const toInputDate = (d: unknown): string => {
  if (!d) return '';
  const dt = new Date(d as string);
  return Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
};

export { ROLE_HOME } from '@/lib/constants';
