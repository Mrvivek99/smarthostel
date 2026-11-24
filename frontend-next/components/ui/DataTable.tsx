import { Async } from './States';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** hide below the md breakpoint */
  hideOnMobile?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns, rows, loading, error, onRetry, emptyTitle, emptyMessage, emptyAction, rowKey, footer,
}: {
  columns: Column<T>[];
  rows: T[] | null | undefined;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  rowKey?: (row: T, i: number) => string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <Async loading={loading && !rows} error={error} empty={!!rows && rows.length === 0} emptyTitle={emptyTitle} emptyMessage={emptyMessage} emptyAction={emptyAction} onRetry={onRetry}>
        <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/60 text-xs uppercase tracking-wide text-navy-500">
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${c.hideOnMobile ? 'hidden md:table-cell' : ''} ${c.className ?? ''}`}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100/70">
              {(rows ?? []).map((row, i) => (
                <tr key={rowKey ? rowKey(row, i) : String(row._id ?? row.id ?? i)} className="hover:bg-brand-50/30">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.hideOnMobile ? 'hidden md:table-cell' : ''} ${c.className ?? ''}`}>
                      {c.render ? c.render(row) : String(row[c.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {footer}
      </Async>
    </div>
  );
}
