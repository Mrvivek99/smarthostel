import type { Column, Row } from '../types';
import { StatusBadge } from '../components/States';
import { fmtDate, fmtDateTime, get, inr, label, nm, titleCase } from './format';

export const textCol = (key: string, header: string, extra: Partial<Column> = {}): Column => ({ key, header, sortable: true, ...extra });
export const refCol = (key: string, header: string): Column => ({ key, header, accessor: (r) => nm(get(r, key)) || label(get(r, key)) });
export const statusCol = (key = 'status', header = 'Status'): Column => ({ key, header, accessor: (r) => String(get(r, key) ?? ''), render: (r) => <StatusBadge value={get(r, key)} /> });
export const activeCol = (key = 'isActive', header = 'Status'): Column => ({ key, header, accessor: (r) => (get(r, key) === false ? 'Inactive' : 'Active'), render: (r) => <StatusBadge value={get(r, key) !== false} /> });
export const dateCol = (key: string, header: string): Column => ({ key, header, accessor: (r) => fmtDate(get(r, key)) });
export const dateTimeCol = (key: string, header: string): Column => ({ key, header, accessor: (r) => fmtDateTime(get(r, key)) });
export const moneyCol = (key: string, header: string): Column => ({ key, header, accessor: (r) => Number(get(r, key)) || 0, render: (r) => inr(get(r, key)) });
export const enumCol = (key: string, header: string): Column => ({ key, header, accessor: (r) => titleCase(String(get(r, key) ?? '')) });
export const listCol = (key: string, header: string): Column => ({ key, header, accessor: (r) => label(get(r, key)) });
export const clip = (key: string, header: string, n = 60): Column => ({ key, header, accessor: (r: Row) => { const s = String(get(r, key) ?? ''); return s.length > n ? `${s.slice(0, n)}…` : s; } });
