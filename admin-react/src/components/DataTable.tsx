import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import type { Column, Row } from '../types';
import { cellValue, downloadCsv, toCsv } from '../lib/format';
import SearchBar from './SearchBar';
import Pagination from './Pagination';
import { EmptyState } from './States';
import { getPageSize, setPageSize as savePageSize } from '../lib/prefs';

interface Props {
  columns: Column[];
  rows: Row[];
  rowKey?: (r: Row) => string;
  actions?: (r: Row) => ReactNode;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  exportName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  bare?: boolean;
}

export default function DataTable({ columns, rows, rowKey, actions, toolbar, searchPlaceholder, exportName, emptyTitle, emptyDescription, emptyAction, bare }: Props) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(getPageSize());

  useEffect(() => setPage(1), [q, rows, sort]);

  const processed = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;
    if (needle) out = out.filter((r) => columns.some((c) => String(cellValue(r, c)).toLowerCase().includes(needle)));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const x = cellValue(a, col), y = cellValue(b, col);
          if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir;
          return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * sort.dir;
        });
      }
    }
    return out;
  }, [rows, q, sort, columns]);

  const pages = Math.max(1, Math.ceil(processed.length / pageSize));
  const cur = Math.min(page, pages);
  const visible = processed.slice((cur - 1) * pageSize, cur * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  const exportCsv = () =>
    downloadCsv(exportName || 'export', toCsv(columns.map((c) => c.header), processed.map((r) => columns.map((c) => cellValue(r, c)))));

  return (
    <div className={bare ? '' : 'card overflow-hidden'}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchBar value={q} onChange={setQ} placeholder={searchPlaceholder} />
          {toolbar}
        </div>
        {exportName && (
          <button className="btn-secondary btn-sm self-start lg:self-auto" onClick={exportCsv} disabled={!processed.length}><Download className="h-3.5 w-3.5" /> Export CSV</button>
        )}
      </div>
      {processed.length === 0 ? (
        <EmptyState title={q ? 'No matching results' : emptyTitle} description={q ? 'Try a different search term.' : emptyDescription} action={q ? undefined : emptyAction} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/70">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="th" aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                    {c.sortable === false ? c.header : (
                      <button className="inline-flex items-center gap-1 uppercase hover:text-navy-800" onClick={() => toggleSort(c.key)}>
                        {c.header}
                        {sort?.key === c.key ? (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    )}
                  </th>
                ))}
                {actions && <th className="th text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((r, i) => (
                <tr key={rowKey ? rowKey(r) : r._id ?? r.id ?? i} className="hover:bg-slate-50/60">
                  {columns.map((c) => (
                    <td key={c.key} className={`td ${c.className ?? ''}`}>{c.render ? c.render(r) : String(cellValue(r, c)) || <span className="text-slate-300">—</span>}</td>
                  ))}
                  {actions && <td className="td"><div className="flex justify-end gap-1.5 flex-wrap">{actions(r)}</div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {processed.length > 0 && (
        <Pagination page={cur} pageSize={pageSize} total={processed.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); savePageSize(n); setPage(1); }} />
      )}
    </div>
  );
}
