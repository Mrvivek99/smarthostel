import { useMemo } from 'react';
import type { FilterDef, Option, Row } from '../types';
import { useList } from '../hooks/useList';
import { get, idOf, label, nm } from './format';

/** Static enum filter (value is the raw enum string). */
export const enumFilter = (key: string, title: string, options: Option[]): FilterDef => ({ key, label: title, options });

/** Hostel filter whose options come from /api/hostels; rows are matched by id so it works whether or not the reference is populated. */
export function useHostelFilter(path = 'hostel'): FilterDef {
  const { items } = useList('/api/hostels');
  return useMemo(() => ({
    key: path,
    label: 'Hostel',
    options: items.map((h) => ({ value: idOf(h), label: String(h.name ?? idOf(h)) })),
    accessor: (r: Row) => idOf(get(r, path)),
  }), [items, path]);
}

export const roomLabel = (r: Row) => [label(r.hostel), r.roomNumber ? `Room ${r.roomNumber}` : ''].filter(Boolean).join(' · ') || idOf(r);
export const studentLabel = (r: Row) => `${nm(r)}${r.enrollmentNo ? ` (${r.enrollmentNo})` : r.email ? ` (${r.email})` : ''}`;
export const roomNo = (r: Row) => (r.room ? (typeof r.room === 'object' && r.room.roomNumber ? `Room ${r.room.roomNumber}` : label(r.room)) : '');

export const intRule = (v: any) => (Number.isInteger(Number(v)) ? undefined : 'Enter a whole number');
export const isoMonth = () => new Date().toISOString().slice(0, 7);
