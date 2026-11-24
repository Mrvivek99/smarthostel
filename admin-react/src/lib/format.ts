import type { Row, Column } from '../types';

export function get(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function idOf(v: any): string {
  if (v == null) return '';
  if (typeof v === 'object') return String(v._id ?? v.id ?? '');
  return String(v);
}

/** Human readable label for any value, including populated references */
export function label(v: any): string {
  if (v == null || v === '') return '';
  if (typeof v === 'object') {
    if (Array.isArray(v)) return v.map(label).filter(Boolean).join(', ');
    return String(v.name ?? v.title ?? v.fullName ?? v.roomNumber ?? v.bedNumber ?? v.code ?? v.email ?? v._id ?? '');
  }
  return String(v);
}

export const nm = (r: Row | undefined | null): string =>
  r ? String(r.name ?? r.fullName ?? r.user?.name ?? r.applicantName ?? r.email ?? r.user?.email ?? '') : '';

export function bedLabel(b: Row | undefined | null): string {
  if (!b) return '';
  const room = typeof b.room === 'object' ? b.room : undefined;
  const parts = [
    label(b.hostel ?? room?.hostel),
    label(b.building ?? room?.building),
    room?.roomNumber ? `Room ${room.roomNumber}` : '',
    b.bedNumber != null ? `Bed ${b.bedNumber}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || idOf(b);
}

export const titleCase = (s: string) =>
  String(s ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const inr = (n: any) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const num = (n: any) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);

export function fmtDate(d: any): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(d: any): string {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? String(d)
    : dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const toDateInput = (d: any) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
};
export const toLocalInput = (d: any) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const off = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - off).toISOString().slice(0, 16);
};

export const today = () => new Date().toISOString().slice(0, 10);

export function csvEscape(v: any): string {
  const s = v == null ? '' : typeof v === 'object' ? label(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function cellValue(row: Row, col: Column): string | number {
  const v = col.accessor ? col.accessor(row) : get(row, col.key);
  if (v == null) return '';
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return label(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(String(v))) return fmtDateTime(v);
  return String(v);
}
