import { ReactNode, useMemo, useState } from 'react';
import { Eye, LayoutGrid, List, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Column, FieldDef, FilterDef, Row } from '../types';
import { useList } from '../hooks/useList';
import { apiDelete, apiPatch, apiPost } from '../lib/api';
import { useToast } from '../context/ToastContext';
import DataTable from './DataTable';
import Modal from './Modal';
import EntityForm from './EntityForm';
import ConfirmationDialog from './ConfirmationDialog';
import FilterPanel from './FilterPanel';
import SearchBar from './SearchBar';
import Pagination from './Pagination';
import { EmptyState, ErrorState, LoadingState, PageHeader } from './States';
import { cellValue, get, label } from '../lib/format';

export interface CrudProps {
  title: string;
  subtitle?: string;
  entity: string;
  endpoint: string;
  params?: Row;
  columns: Column[];
  fields: FieldDef[];
  filters?: FilterDef[];
  canCreate?: boolean;
  canEdit?: boolean | ((r: Row) => boolean);
  canDelete?: boolean | ((r: Row) => boolean);
  itemUrl?: (r: Row) => string;
  rowActions?: (r: Row, reload: () => void) => ReactNode;
  card?: (r: Row, actions: ReactNode) => ReactNode;
  summary?: (rows: Row[]) => ReactNode;
  headerActions?: ReactNode;
  exportName?: string;
  transform?: (payload: Row, mode: 'create' | 'edit') => Row;
  emptyDescription?: string;
  deleteMessage?: (r: Row) => string;
  editMethod?: 'patch';
  hideHeader?: boolean;
}

export default function CrudPage(p: CrudProps) {
  const { items, loading, error, reload } = useList(p.endpoint, p.params);
  const toast = useToast();
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [fv, setFv] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'table' | 'cards'>(p.card ? 'cards' : 'table');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const itemUrl = p.itemUrl ?? ((r: Row) => `${p.endpoint}/${r._id ?? r.id}`);
  const can = (v: boolean | ((r: Row) => boolean) | undefined, r: Row) => (typeof v === 'function' ? v(r) : v ?? true);

  const filtered = useMemo(() => {
    let rows = items;
    for (const f of p.filters ?? []) {
      const val = fv[f.key];
      if (val) rows = rows.filter((r) => (f.accessor ? f.accessor(r) : label(get(r, f.key))) === val);
    }
    return rows;
  }, [items, fv, p.filters]);

  const cardRows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? filtered.filter((r) => p.columns.some((c) => String(cellValue(r, c)).toLowerCase().includes(n))) : filtered;
  }, [filtered, q, p.columns]);

  const save = async (payload: Row) => {
    const isNew = editing === 'new';
    const body = p.transform ? p.transform(payload, isNew ? 'create' : 'edit') : payload;
    if (isNew) await apiPost(p.endpoint, body);
    else await apiPatch(itemUrl(editing as Row), body);
    toast.success(`${p.entity} ${isNew ? 'created' : 'updated'}`);
    setEditing(null);
    reload();
  };

  const actionsFor = (r: Row, compact = false): ReactNode => (
    <>
      <button className="btn-ghost btn-sm !px-2" title="View details" aria-label="View details" onClick={() => setViewing(r)}><Eye className="h-4 w-4" /></button>
      {p.rowActions?.(r, reload)}
      {can(p.canEdit, r) && p.fields.length > 0 && <button className="btn-ghost btn-sm !px-2" title="Edit" aria-label="Edit" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" />{compact && 'Edit'}</button>}
      {can(p.canDelete, r) && <button className="btn-ghost btn-sm !px-2 !text-rose-600 hover:!bg-rose-50" title="Delete" aria-label="Delete" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" />{compact && 'Delete'}</button>}
    </>
  );

  const createBtn = p.canCreate !== false && p.fields.length > 0 && (
    <button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add {p.entity.toLowerCase()}</button>
  );

  const pageSize = 12;
  const cardPage = Math.min(page, Math.max(1, Math.ceil(cardRows.length / pageSize)));

  return (
    <div>
      {!p.hideHeader && <PageHeader title={p.title} subtitle={p.subtitle} actions={<>{p.headerActions}{createBtn}</>} />}
      {p.hideHeader && <div className="flex justify-end gap-2 mb-4">{p.headerActions}{createBtn}</div>}
      {loading ? <div className="card"><LoadingState /></div> : error ? <div className="card"><ErrorState message={error} onRetry={reload} /></div> : (
        <>
          {p.summary?.(filtered)}
          {mode === 'table' || !p.card ? (
            <DataTable columns={p.columns} rows={filtered} actions={(r) => actionsFor(r)} exportName={p.exportName ?? p.title.toLowerCase().replace(/\s+/g, '-')}
              searchPlaceholder={`Search ${p.title.toLowerCase()}…`}
              emptyTitle={`No ${p.title.toLowerCase()} yet`} emptyDescription={p.emptyDescription} emptyAction={createBtn || undefined}
              toolbar={<div className="flex flex-wrap items-center gap-3"><FilterPanel filters={p.filters ?? []} values={fv} onChange={(k, v) => setFv((s) => ({ ...s, [k]: v }))} onReset={() => setFv({})} />{p.card && <ViewToggle mode={mode} onChange={setMode} />}</div>} />
          ) : (
            <div className="card overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={`Search ${p.title.toLowerCase()}…`} />
                  <FilterPanel filters={p.filters ?? []} values={fv} onChange={(k, v) => { setFv((s) => ({ ...s, [k]: v })); setPage(1); }} onReset={() => setFv({})} />
                </div>
                <ViewToggle mode={mode} onChange={setMode} />
              </div>
              {cardRows.length === 0 ? <EmptyState title={q ? 'No matching results' : `No ${p.title.toLowerCase()} yet`} description={p.emptyDescription} action={!q && createBtn ? createBtn : undefined} /> : (
                <div className="p-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cardRows.slice((cardPage - 1) * pageSize, cardPage * pageSize).map((r) => <div key={r._id ?? r.id}>{p.card!(r, actionsFor(r, false))}</div>)}
                </div>
              )}
              {cardRows.length > 0 && <Pagination page={cardPage} pageSize={pageSize} total={cardRows.length} onPage={setPage} />}
            </div>
          )}
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? `Add ${p.entity.toLowerCase()}` : `Edit ${p.entity.toLowerCase()}`} size="lg">
        {editing !== null && <EntityForm key={editing === 'new' ? 'new' : (editing as Row)._id} fields={p.fields} initial={editing === 'new' ? undefined : editing} mode={editing === 'new' ? 'create' : 'edit'} onSubmit={save} onCancel={() => setEditing(null)} />}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`${p.entity} details`} size="md">
        {viewing && (
          <dl className="divide-y divide-slate-100">
            {p.columns.map((c) => (
              <div key={c.key} className="py-2.5 grid grid-cols-3 gap-3"><dt className="text-sm text-slate-500">{c.header}</dt><dd className="col-span-2 text-sm text-slate-800 break-words">{c.render ? c.render(viewing) : String(cellValue(viewing, c)) || '—'}</dd></div>
            ))}
            {p.fields.filter((f) => f.type !== 'password' && !p.columns.some((c) => c.key === f.name) && viewing[f.name] != null && viewing[f.name] !== '').map((f) => (
              <div key={f.name} className="py-2.5 grid grid-cols-3 gap-3"><dt className="text-sm text-slate-500">{f.label}</dt><dd className="col-span-2 text-sm text-slate-800 break-words">{String(cellValue(viewing, { key: f.name, header: f.label })) || '—'}</dd></div>
            ))}
          </dl>
        )}
      </Modal>

      <ConfirmationDialog open={!!deleting} onClose={() => setDeleting(null)} title={`Delete ${p.entity.toLowerCase()}?`} confirmLabel="Delete"
        message={deleting ? p.deleteMessage?.(deleting) ?? `This will permanently remove this ${p.entity.toLowerCase()}. This action cannot be undone.` : ''}
        onConfirm={async () => { await apiDelete(itemUrl(deleting!)); toast.success(`${p.entity} deleted`); reload(); }} />
    </div>
  );
}

function ViewToggle({ mode, onChange }: { mode: 'table' | 'cards'; onChange: (m: 'table' | 'cards') => void }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-white" role="group" aria-label="View mode">
      <button className={`p-1.5 rounded-lg ${mode === 'cards' ? 'bg-brand-600 text-white' : 'text-slate-500'}`} onClick={() => onChange('cards')} aria-label="Card view" aria-pressed={mode === 'cards'}><LayoutGrid className="h-4 w-4" /></button>
      <button className={`p-1.5 rounded-lg ${mode === 'table' ? 'bg-brand-600 text-white' : 'text-slate-500'}`} onClick={() => onChange('table')} aria-label="Table view" aria-pressed={mode === 'table'}><List className="h-4 w-4" /></button>
    </div>
  );
}
