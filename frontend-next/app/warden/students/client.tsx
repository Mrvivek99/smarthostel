'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApi, useDebounced } from '@/lib/hooks';
import { useWardenHostels } from '@/lib/useWardenHostels';
import { fetchAll } from '@/lib/fetchAll';
import { formatDate, monthIST, nameOf, titleCase } from '@/lib/format';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBar } from '@/components/ui/SearchBar';
import { Async, StatusBadge } from '@/components/ui/States';

const LIMIT = 10;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt><dd className="mt-0.5 text-sm font-medium">{value || '-'}</dd></div>;
}

export function StudentsClient() {
  const { hostels, hostel, setHostel } = useWardenHostels();
  const month = monthIST();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const list = useApi<any[]>(hostel ? '/api/students' : null, { hostel, q: dq, page, limit: LIMIT });
  const profile = useApi<any>(sel ? `/api/students/${sel}` : null);

  // Attendance % for the current month, per student (ON_LEAVE is excused).
  const [pct, setPct] = useState<Record<string, number | null>>({});
  const [pctError, setPctError] = useState(false);
  useEffect(() => {
    if (!hostel) return;
    let live = true;
    setPctError(false);
    fetchAll<any>('/api/attendance', { hostel, month })
      .then((rows) => {
        if (!live) return;
        const agg: Record<string, { p: number; a: number }> = {};
        for (const r of rows) {
          const id = String(r.student?._id ?? r.student);
          const x = (agg[id] ??= { p: 0, a: 0 });
          if (r.status === 'PRESENT') x.p++;
          else if (r.status === 'ABSENT') x.a++;
        }
        setPct(Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, v.p + v.a ? Math.round((v.p / (v.p + v.a)) * 100) : null])));
      })
      .catch(() => live && setPctError(true));
    return () => { live = false; };
  }, [hostel, month]);

  const pctCell = (id: string) => {
    if (pctError) return '-';
    const v = pct[id];
    return v === undefined || v === null ? <span className="text-navy-400">No data</span> : <span className={`font-semibold ${v < 75 ? 'text-red-600' : 'text-emerald-700'}`}>{v}%</span>;
  };

  const p = profile.data;
  const sp = useMemo(() => (p ? String(p._id) : ''), [p]);

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Students allocated to your hostel."
        actions={hostels.length > 1 ? <select aria-label="Select hostel" className="input w-auto" value={hostel} onChange={(e) => { setHostel(e.target.value); setPage(1); }}>{hostels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</select> : undefined}
      />
      <div className="mb-4"><SearchBar className="max-w-md" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, email, enrollment no or phone" /></div>
      <DataTable
        columns={[
          { key: 'name', header: 'Student', render: (s) => <div><p className="font-semibold">{s.name}</p><p className="text-xs text-navy-400">{s.enrollmentNo || s.email}</p></div> },
          { key: 'room', header: 'Room / bed', render: (s) => s.room ? `${nameOf(s.room, 'roomNumber')} / ${nameOf(s.bed, 'bedNumber')}` : '-' },
          { key: 'course', header: 'Course', hideOnMobile: true, render: (s) => s.course ? `${s.course}${s.year ? ` (Y${s.year})` : ''}` : '-' },
          { key: 'att', header: `Attendance (${month})`, render: (s) => pctCell(String(s._id)) },
          { key: 'status', header: 'Status', hideOnMobile: true, render: (s) => <StatusBadge status={s.status} /> },
          { key: 'actions', header: '', render: (s) => <button className="btn-secondary btn-sm" onClick={() => setSel(String(s._id))}>View profile</button> },
        ]}
        rows={list.data} loading={list.loading || (!hostel && hostels.length > 0)} error={list.error} onRetry={list.reload}
        emptyTitle={dq ? 'No matching students' : 'No students yet'} emptyMessage={dq ? 'Try a different search term.' : 'Students allocated to your hostel will appear here.'}
        footer={list.meta ? <Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /> : undefined}
      />

      <Modal open={!!sel} onClose={() => setSel(null)} title={p?.name ?? 'Student profile'} description={p?.email} size="lg"
        footer={<button className="btn-secondary" onClick={() => setSel(null)}>Close</button>}>
        <Async loading={profile.loading && !p} error={profile.error} onRetry={profile.reload} rows={4}>
          {p && (
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Status" value={<StatusBadge status={p.status} />} />
              <Field label="Attendance this month" value={pctCell(sp)} />
              <Field label="Hostel" value={nameOf(p.hostel)} />
              <Field label="Room / bed" value={p.room ? `${nameOf(p.room, 'roomNumber')} / ${nameOf(p.bed, 'bedNumber')}` : null} />
              <Field label="Enrollment no" value={p.enrollmentNo} />
              <Field label="Phone" value={p.phone} />
              <Field label="Gender" value={p.gender ? titleCase(p.gender) : null} />
              <Field label="Date of birth" value={p.dob ? formatDate(p.dob) : null} />
              <Field label="Course" value={p.course ? `${p.course}${p.year ? `, year ${p.year}` : ''}` : null} />
              <Field label="Department" value={p.department} />
              <Field label="Address" value={p.address} />
              <Field label="Check-in" value={p.activeAllocation?.checkInDate ? formatDate(p.activeAllocation.checkInDate) : null} />
              <Field label="Guardian" value={p.guardianName ? `${p.guardianName}${p.guardianRelation ? ` (${p.guardianRelation})` : ''}` : null} />
              <Field label="Guardian phone" value={p.guardianPhone} />
              <Field label="Emergency contact" value={p.emergencyContactName} />
              <Field label="Emergency phone" value={p.emergencyContactPhone} />
            </dl>
          )}
        </Async>
      </Modal>
    </>
  );
}
