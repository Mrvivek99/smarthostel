import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { ErrorState, LoadingState, PageHeader } from '../components/States';
import { apiGet, errMsg } from '../lib/api';
import { downloadCsv, inr, num, titleCase, toCsv, today } from '../lib/format';
import { useList } from '../hooks/useList';
import type { Column, Row } from '../types';

const TYPES = [
  { value: 'occupancy', label: 'Occupancy', hint: 'Bed usage per hostel (live snapshot)', dates: false },
  { value: 'fees', label: 'Fees outstanding', hint: 'Billed, paid and outstanding per student (by due date)', dates: true },
  { value: 'expenses', label: 'Expenses', hint: 'Spending by month, hostel and category', dates: true },
  { value: 'complaints', label: 'Complaints', hint: 'Volume and resolution time by category and status', dates: true },
  { value: 'attendance', label: 'Attendance', hint: 'Attendance percentage per student', dates: true },
  { value: 'inventory', label: 'Inventory', hint: 'Items and quantities by category and condition (live snapshot)', dates: false },
];
const MONEY = new Set(['billed', 'paid', 'outstanding', 'total', 'amount']);
const MONEY_REPORTS = new Set(['fees', 'expenses']);

interface Report { columns: { key: string; label: string }[]; rows: Row[]; summary?: Record<string, number> }

export default function Reports() {
  const [type, setType] = useState('occupancy');
  const [hostel, setHostel] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hostels = useList('/api/hostels');
  const meta = TYPES.find((t) => t.value === type)!;
  const invalidRange = !!from && !!to && from > to;

  const load = useCallback(async () => {
    if (invalidRange) return;
    setLoading(true); setError(null);
    try {
      const params: Row = { type };
      if (hostel) params.hostel = hostel;
      if (meta.dates && from) params.from = from;
      if (meta.dates && to) params.to = to;
      setData(await apiGet<Report>('/api/admin/reports', params));
    } catch (e) { setError(errMsg(e)); setData(null); } finally { setLoading(false); }
  }, [type, hostel, from, to, meta.dates, invalidRange]);
  useEffect(() => { load(); }, [load]);

  const fmt = useCallback((key: string, v: any) => (MONEY_REPORTS.has(type) && MONEY.has(key) && typeof v === 'number' ? inr(v) : typeof v === 'number' ? num(v) : v ?? ''), [type]);
  const columns: Column[] = useMemo(() => (data?.columns ?? []).map((c) => ({
    key: c.key, header: c.label,
    accessor: (r: Row) => (typeof r[c.key] === 'number' ? r[c.key] : String(r[c.key] ?? '')),
    render: (r: Row) => <span>{String(fmt(c.key, r[c.key])) || '—'}</span>,
  })), [data, fmt]);

  const exportCsv = () => {
    if (!data) return;
    const stamp = today();
    downloadCsv(`${type}-report-${stamp}`, toCsv(data.columns.map((c) => c.label), data.rows.map((r) => data.columns.map((c) => r[c.key]))));
  };

  const summary = Object.entries(data?.summary ?? {});
  const summaryLabel = (k: string) => titleCase(k);
  const summaryValue = (k: string, v: number) => (MONEY_REPORTS.has(type) && MONEY.has(k) ? inr(v) : num(v));

  return (
    <div>
      <PageHeader title="Reports" subtitle="Run an operational or financial report and export it to CSV."
        actions={<button className="btn-primary" onClick={exportCsv} disabled={!data || !data.rows.length}><Download className="h-4 w-4" /> Export CSV</button>} />
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="rp-type">Report</label>
            <select id="rp-type" className="input !w-auto min-w-[12rem]" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="rp-hostel">Hostel</label>
            <select id="rp-hostel" className="input !w-auto min-w-[10rem]" value={hostel} onChange={(e) => setHostel(e.target.value)}><option value="">All hostels</option>{hostels.items.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</select>
          </div>
          {meta.dates && (
            <>
              <div><label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="rp-from">From</label><input id="rp-from" type="date" className="input !w-auto" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="rp-to">To</label><input id="rp-to" type="date" className="input !w-auto" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
              {(from || to) && <button className="btn-ghost btn-sm" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>}
            </>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">{meta.hint}</p>
        {invalidRange && <p className="text-xs text-rose-600 mt-1" role="alert">The start date must be on or before the end date.</p>}
      </div>
      {loading ? <div className="card"><LoadingState text="Building report…" /></div> : error ? <div className="card"><ErrorState message={error} onRetry={load} /></div> : data && (
        <>
          {summary.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
              {summary.map(([k, v]) => <StatCard key={k} label={summaryLabel(k)} value={summaryValue(k, Number(v) || 0)} icon={<BarChart3 className="h-6 w-6" />} tone="purple" />)}
            </div>
          )}
          <DataTable columns={columns} rows={data.rows} rowKey={(r) => JSON.stringify(r)} searchPlaceholder="Search report…" emptyTitle="No data for this report" emptyDescription="Try another hostel or date range." />
        </>
      )}
    </div>
  );
}
