import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ClipboardList, Save } from 'lucide-react';
import AttendanceTable from '../components/AttendanceTable';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Tabs from '../components/Tabs';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/States';
import { useList } from '../hooks/useList';
import { useNameMap } from '../hooks/useNameMap';
import { useToast } from '../context/ToastContext';
import { apiGet, apiPost, errMsg } from '../lib/api';
import { opts } from '../lib/fields';
import { fmtDate, num, today } from '../lib/format';
import type { Column, Row } from '../types';

const STATUSES = opts('PRESENT', 'ABSENT', 'ON_LEAVE');

function HostelSelect({ value, onChange, optional }: { value: string; onChange: (v: string) => void; optional?: boolean }) {
  const { items, loading } = useList('/api/hostels');
  return (
    <select className="input !w-auto min-w-[12rem]" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Hostel" disabled={loading}>
      <option value="">{loading ? 'Loading…' : optional ? 'All hostels' : 'Select hostel…'}</option>
      {items.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
    </select>
  );
}

function Mark() {
  const toast = useToast();
  const [hostel, setHostel] = useState('');
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState<Row[] | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!hostel || !date) { setRoster(null); return; }
    setLoading(true); setError(null);
    try {
      const rows = await apiGet<Row[]>('/api/attendance/roster', { hostel, date });
      setRoster(rows);
      const m: Record<string, string> = {};
      for (const r of rows) { const s = r.status ?? r.suggestedStatus; if (s) m[r.student._id] = s; }
      setMarks(m);
    } catch (e) { setError(errMsg(e)); setRoster(null); } finally { setLoading(false); }
  }, [hostel, date]);
  useEffect(() => { load(); }, [load]);

  const students = useMemo(() => (roster ?? []).map((r) => ({ _id: r.student._id, name: r.student.name, email: r.student.email, rollNumber: r.student.enrollmentNo || r.student.email, room: r.room ? { roomNumber: r.room } : undefined })), [roster]);
  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, ON_LEAVE: 0 } as Record<string, number>;
    Object.values(marks).forEach((s) => { c[s] = (c[s] ?? 0) + 1; });
    return c;
  }, [marks]);
  const marked = Object.keys(marks).length;

  const save = async () => {
    setSaving(true);
    try {
      const records = Object.entries(marks).map(([student, status]) => ({ student, status }));
      const r = await apiPost('/api/attendance', { hostel, date, records });
      toast.success(`Attendance saved: ${r.created} new, ${r.updated} updated, ${r.unchanged} unchanged`);
      await load();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="card p-4 flex flex-wrap items-end gap-3 mb-5">
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Hostel</label><HostelSelect value={hostel} onChange={setHostel} /></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="att-date">Date</label><input id="att-date" type="date" className="input !w-auto" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        {roster && roster.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-auto">
            <button className="btn-secondary" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s._id, 'PRESENT'])))}>Mark all present</button>
            <button className="btn-secondary" onClick={() => setMarks({})}>Clear</button>
            <button className="btn-primary" disabled={!marked || saving} onClick={save}><Save className="h-4 w-4" />{saving ? 'Saving…' : `Save attendance (${marked})`}</button>
          </div>
        )}
      </div>
      {!hostel ? <div className="card"><EmptyState title="Choose a hostel" description="Select a hostel and date to load the marking sheet." /></div>
        : loading ? <div className="card"><LoadingState /></div>
        : error ? <div className="card"><ErrorState message={error} onRetry={load} /></div>
        : !roster || roster.length === 0 ? <div className="card"><EmptyState title="No students in this hostel" description="Only students with an active bed allocation appear on the marking sheet." /></div>
        : (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-5">
              <StatCard label="Present" value={counts.PRESENT} icon={<CalendarCheck className="h-6 w-6" />} tone="green" hint={`of ${students.length} students`} />
              <StatCard label="Absent" value={counts.ABSENT} icon={<CalendarCheck className="h-6 w-6" />} tone="rose" />
              <StatCard label="On leave" value={counts.ON_LEAVE} icon={<CalendarCheck className="h-6 w-6" />} tone="amber" hint={`${roster.filter((r) => r.approvedLeave).length} with approved leave`} />
            </div>
            <div className="card overflow-hidden"><AttendanceTable students={students} marks={marks} onChange={(id, s) => setMarks((m) => ({ ...m, [id]: s }))} /></div>
            <p className="text-xs text-slate-400 mt-3">Students with approved leave for this date are pre-selected as on leave. Only students you select are saved.</p>
          </>
        )}
    </div>
  );
}

function Records() {
  const [hostel, setHostel] = useState('');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [status, setStatus] = useState('');
  const params = useMemo(() => ({ ...(hostel ? { hostel } : {}), ...(month ? { month } : {}), ...(status ? { status } : {}) }), [hostel, month, status]);
  const { items, loading, error, reload } = useList('/api/attendance', params);
  const hostelName = useNameMap('/api/hostels');
  const columns: Column[] = [
    { key: 'date', header: 'Date', sortable: true, accessor: (r) => r.date, render: (r) => fmtDate(r.date) },
    { key: 'student', header: 'Student', accessor: (r) => r.student?.name ?? '' },
    { key: 'enrollmentNo', header: 'Enrollment no.', accessor: (r) => r.student?.enrollmentNo ?? '' },
    { key: 'hostel', header: 'Hostel', accessor: (r) => hostelName(r.hostel) },
    { key: 'status', header: 'Status', accessor: (r) => r.status, render: (r) => <StatusBadge value={r.status} /> },
    { key: 'remarks', header: 'Remarks', accessor: (r) => r.remarks ?? '' },
    { key: 'markedBy', header: 'Marked by', accessor: (r) => r.markedBy?.name ?? '' },
    { key: 'changes', header: 'Edits', accessor: (r) => (r.history ?? []).length },
  ];
  const c = (s: string) => items.filter((r) => r.status === s).length;
  const counted = c('PRESENT') + c('ABSENT');
  return (
    <div>
      <div className="card p-4 flex flex-wrap items-end gap-3 mb-5">
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Hostel</label><HostelSelect value={hostel} onChange={setHostel} optional /></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="rec-month">Month</label><input id="rec-month" type="month" className="input !w-auto" value={month} max={today().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} /></div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1" htmlFor="rec-status">Status</label>
          <select id="rec-status" className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        </div>
      </div>
      {loading ? <div className="card"><LoadingState /></div> : error ? <div className="card"><ErrorState message={error} onRetry={reload} /></div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
            <StatCard label="Present" value={num(c('PRESENT'))} icon={<CalendarCheck className="h-6 w-6" />} tone="green" />
            <StatCard label="Absent" value={num(c('ABSENT'))} icon={<CalendarCheck className="h-6 w-6" />} tone="rose" />
            <StatCard label="On leave" value={num(c('ON_LEAVE'))} icon={<CalendarCheck className="h-6 w-6" />} tone="amber" />
            <StatCard label="Attendance rate" value={counted ? `${Math.round((c('PRESENT') / counted) * 1000) / 10}%` : '—'} icon={<ClipboardList className="h-6 w-6" />} tone="purple" hint="Leave days excluded" />
          </div>
          <DataTable columns={columns} rows={items} exportName={`attendance-${month || 'all'}`} searchPlaceholder="Search records…" emptyTitle="No attendance records" emptyDescription="No attendance was marked for these filters." />
        </>
      )}
    </div>
  );
}

export default function Attendance() {
  const [tab, setTab] = useState('mark');
  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark daily attendance and review past records." />
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'mark', label: 'Mark attendance', icon: <CalendarCheck className="h-4 w-4" /> }, { id: 'records', label: 'Records', icon: <ClipboardList className="h-4 w-4" /> }]} />
      {tab === 'mark' ? <Mark /> : <Records />}
    </div>
  );
}
