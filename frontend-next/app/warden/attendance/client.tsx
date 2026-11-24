'use client';
import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, Download } from 'lucide-react';
import { api, qs } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { useWardenHostels } from '@/lib/useWardenHostels';
import { ATTENDANCE_STATUSES } from '@/lib/constants';
import { formatDate, monthIST, titleCase, todayIST } from '@/lib/format';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { StatCard } from '@/components/ui/StatCard';
import { Async, EmptyState, Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

type Status = (typeof ATTENDANCE_STATUSES)[number];
type Mark = { status?: Status; remarks: string };
const WINDOW_DAYS = 7;
const HLIMIT = 20;

const BTN: Record<Status, string> = {
  PRESENT: 'bg-emerald-600 text-white border-emerald-600',
  ABSENT: 'bg-red-600 text-white border-red-600',
  ON_LEAVE: 'bg-sky-600 text-white border-sky-600',
};

function shiftDay(d: string, days: number) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

export function AttendanceClient() {
  const toast = useToast();
  const { me, hostels, hostel, setHostel } = useWardenHostels();
  const today = todayIST();
  const [tab, setTab] = useState<'mark' | 'history'>('mark');
  const [date, setDate] = useState(today);
  const roster = useApi<any[]>(tab === 'mark' && hostel ? '/api/attendance/roster' : null, { hostel, date });
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [busy, setBusy] = useState(false);

  // Initialise the marking sheet from the roster (existing mark, else approved-leave suggestion).
  useEffect(() => {
    if (!roster.data) return;
    const next: Record<string, Mark> = {};
    for (const r of roster.data) next[String(r.student._id)] = { status: r.suggestedStatus, remarks: r.remarks ?? '' };
    setMarks(next);
  }, [roster.data]);

  const rows = roster.data ?? [];
  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, ON_LEAVE: 0, unmarked: 0 };
    for (const r of rows) {
      const s = marks[String(r.student._id)]?.status;
      if (s) c[s]++;
      else c.unmarked++;
    }
    return c;
  }, [rows, marks]);

  const setStatus = (id: string, status: Status) => setMarks((m) => ({ ...m, [id]: { ...m[id], remarks: m[id]?.remarks ?? '', status } }));
  const setRemarks = (id: string, remarks: string) => setMarks((m) => ({ ...m, [id]: { ...m[id], remarks } }));
  const markAll = (status: Status) => setMarks((m) => Object.fromEntries(rows.map((r) => {
    const id = String(r.student._id);
    // keep approved-leave students on leave when bulk-marking present
    return [id, { remarks: m[id]?.remarks ?? '', status: status === 'PRESENT' && r.approvedLeave ? 'ON_LEAVE' : status }];
  })) as Record<string, Mark>);

  async function submit() {
    const records = rows
      .map((r) => ({ id: String(r.student._id), m: marks[String(r.student._id)] }))
      .filter((x) => x.m?.status)
      .map((x) => ({ student: x.id, status: x.m.status as Status, ...(x.m.remarks.trim() ? { remarks: x.m.remarks.trim() } : {}) }));
    if (!records.length) return toast.error('Mark at least one student before submitting');
    setBusy(true);
    try {
      const res = await api.post<{ created: number; updated: number; unchanged: number }>('/api/attendance', { hostel, date, records });
      const d = res.data;
      toast.success(`Attendance saved: ${d.created} new, ${d.updated} updated, ${d.unchanged} unchanged`);
      roster.reload();
      history.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---- history / monthly ----
  const [month, setMonth] = useState(monthIST());
  const [hpage, setHpage] = useState(1);
  const history = useApi<any[]>(hostel ? '/api/attendance' : null, { hostel, month, page: hpage, limit: HLIMIT });
  const s = history.meta?.summary as { present: number; absent: number; onLeave: number; total: number; percentage: number } | undefined;
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`/api/attendance/export${qs({ hostel, month })}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) {
        const j: any = await res.json().catch(() => null);
        throw new Error(j?.error || `Export failed (${res.status})`);
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Attendance exported');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const hostelSelect = hostels.length > 1 ? (
    <select aria-label="Select hostel" className="input w-auto" value={hostel} onChange={(e) => { setHostel(e.target.value); setHpage(1); }}>
      {hostels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
    </select>
  ) : undefined;

  if (me.loading && !me.data) return <><PageHeader title="Attendance" /><div className="card"><Async loading error={null}><span /></Async></div></>;
  if (me.error) return <><PageHeader title="Attendance" /><div className="card"><Async loading={false} error={me.error} onRetry={me.reload}><span /></Async></div></>;
  if (!hostels.length) return <><PageHeader title="Attendance" /><div className="card"><EmptyState title="No hostel assigned" message="Ask your administrator to assign you to a hostel." /></div></>;

  return (
    <>
      <PageHeader title="Attendance" subtitle="Mark daily attendance and review history." actions={hostelSelect} />
      <div className="mb-4 inline-flex rounded-xl border border-navy-200 bg-white p-1" role="tablist">
        {([['mark', 'Mark attendance'], ['history', 'History & export']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === k ? 'bg-brand-600 text-white' : 'text-navy-600 hover:bg-navy-50'}`}>{l}</button>
        ))}
      </div>

      {tab === 'mark' && (
        <Section title="Marking sheet" actions={
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" aria-label="Attendance date" className="input w-auto" value={date} min={shiftDay(today, -WINDOW_DAYS)} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <button className="btn-secondary btn-sm" onClick={() => markAll('PRESENT')} disabled={!rows.length}><CheckCheck className="h-4 w-4" /> All present</button>
          </div>
        }>
          <Async loading={roster.loading && !roster.data} error={roster.error} empty={rows.length === 0} emptyTitle="No students in this hostel" emptyMessage="Students appear here once they have an active bed allocation." onRetry={roster.reload} rows={5}>
            <div className={`transition-opacity ${roster.loading ? 'opacity-60' : ''}`}>
              <ul className="divide-y divide-navy-100">
                {rows.map((r) => {
                  const id = String(r.student._id);
                  const m = marks[id];
                  return (
                    <li key={id} className="flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center">
                      <div className="min-w-0 lg:w-1/3">
                        <p className="truncate text-sm font-semibold">{r.student.name}</p>
                        <p className="text-xs text-navy-400">{r.student.enrollmentNo || r.student.email} · Room {r.room ?? '-'}{r.bed ? ` / ${r.bed}` : ''}{r.approvedLeave ? ' · approved leave' : ''}</p>
                      </div>
                      <div className="flex gap-1.5" role="radiogroup" aria-label={`Status for ${r.student.name}`}>
                        {ATTENDANCE_STATUSES.map((st) => (
                          <button key={st} type="button" role="radio" aria-checked={m?.status === st} onClick={() => setStatus(id, st)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${m?.status === st ? BTN[st] : 'border-navy-200 bg-white text-navy-600 hover:bg-navy-50'}`}>{titleCase(st)}</button>
                        ))}
                      </div>
                      <input aria-label={`Remarks for ${r.student.name}`} className="input lg:flex-1" placeholder="Remarks (optional)" maxLength={200} value={m?.remarks ?? ''} onChange={(e) => setRemarks(id, e.target.value)} />
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-col gap-3 border-t border-navy-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-navy-500">{counts.PRESENT} present · {counts.ABSENT} absent · {counts.ON_LEAVE} on leave · {counts.unmarked} not marked</p>
                <button className="btn-primary" onClick={submit} disabled={busy || counts.unmarked === rows.length}>{busy && <Spinner className="h-4 w-4" />} Submit attendance for {formatDate(date)}</button>
              </div>
            </div>
          </Async>
        </Section>
      )}

      {tab === 'history' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input type="month" aria-label="Select month" className="input w-auto" value={month} max={monthIST()} onChange={(e) => { if (e.target.value) { setMonth(e.target.value); setHpage(1); } }} />
            <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>{exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Export CSV</button>
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Attendance" loading={history.loading && !history.data} value={s && s.present + s.absent > 0 ? `${s.percentage}%` : '-'} hint="On-leave days are excused" />
            <StatCard label="Present" tone="green" loading={history.loading && !history.data} value={s?.present ?? 0} />
            <StatCard label="Absent" tone="red" loading={history.loading && !history.data} value={s?.absent ?? 0} />
            <StatCard label="On leave" tone="navy" loading={history.loading && !history.data} value={s?.onLeave ?? 0} />
          </div>
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'student', header: 'Student', render: (r) => <div><p className="font-semibold">{r.student?.name ?? '-'}</p><p className="text-xs text-navy-400">{r.student?.enrollmentNo ?? ''}</p></div> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'remarks', header: 'Remarks', hideOnMobile: true, render: (r) => r.remarks || '-' },
              { key: 'by', header: 'Marked by', hideOnMobile: true, render: (r) => r.markedBy?.name ?? '-' },
            ]}
            rows={history.data} loading={history.loading} error={history.error} onRetry={history.reload}
            emptyTitle="No records this month" emptyMessage="Attendance you mark will appear here."
            footer={history.meta ? <Pagination page={hpage} limit={HLIMIT} total={history.meta.total} onChange={setHpage} /> : undefined}
          />
        </>
      )}
    </>
  );
}
