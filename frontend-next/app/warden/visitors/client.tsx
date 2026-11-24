'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/client';
import { useApi, useDebounced } from '@/lib/hooks';
import { useWardenHostels } from '@/lib/useWardenHostels';
import { visitorSchema } from '@/lib/validation';
import { validate, type FieldErrors } from '@/lib/forms';
import { formatDateTime, nameOf } from '@/lib/format';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { DataTable } from '@/components/ui/DataTable';
import { FormField, SelectField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 10;
const blank = { student: '', name: '', contact: '', relationship: '', purpose: '' };

export function VisitorsClient() {
  const toast = useToast();
  const { hostels, hostel, setHostel } = useWardenHostels();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [inside, setInside] = useState(false);
  const list = useApi<any[]>(hostel ? '/api/visitors' : null, { hostel, q: dq, inside: inside || undefined, page, limit: LIMIT });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [sq, setSq] = useState('');
  const dsq = useDebounced(sq);
  const students = useApi<any[]>(open && hostel ? '/api/students' : null, { hostel, q: dsq, limit: 50 });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [exit, setExit] = useState<any | null>(null);
  const [exitBusy, setExitBusy] = useState(false);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => { setPage(1); }, [hostel]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(visitorSchema, { ...form, hostel });
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/visitors', v.data);
      toast.success('Visitor registered');
      setOpen(false);
      setForm(blank);
      setSq('');
      setPage(1);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function markExit() {
    setExitBusy(true);
    try {
      await api.patch(`/api/visitors/${exit._id}`, { markExit: true });
      toast.success('Exit recorded');
      setExit(null);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExitBusy(false);
    }
  }

  const addBtn = <button className="btn-primary" onClick={() => setOpen(true)} disabled={!hostel}><Plus className="h-4 w-4" /> Register visitor</button>;
  const studentOptions = (students.data ?? []).map((s) => ({ value: String(s._id), label: `${s.name}${s.enrollmentNo ? ` (${s.enrollmentNo})` : ''}${s.room ? ` - Room ${nameOf(s.room, 'roomNumber')}` : ''}` }));

  return (
    <>
      <PageHeader
        title="Visitors"
        subtitle="Register visitors and record their exit."
        actions={<>{hostels.length > 1 && <select aria-label="Select hostel" className="input w-auto" value={hostel} onChange={(e) => setHostel(e.target.value)}>{hostels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}</select>}{addBtn}</>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar className="w-full max-w-md" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by visitor name or contact" />
        <label className="flex items-center gap-2 text-sm font-medium text-navy-600"><input type="checkbox" checked={inside} onChange={(e) => { setInside(e.target.checked); setPage(1); }} /> Currently inside only</label>
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Visitor', render: (v) => <div><p className="font-semibold">{v.name}</p><p className="text-xs text-navy-400">{v.contact} · {v.relationship}</p></div> },
          { key: 'student', header: 'Visiting', render: (v) => v.student?.name ?? '-' },
          { key: 'purpose', header: 'Purpose', hideOnMobile: true, render: (v) => <span className="line-clamp-2 max-w-xs">{v.purpose}</span> },
          { key: 'entry', header: 'Entry', hideOnMobile: true, render: (v) => <span className="whitespace-nowrap">{formatDateTime(v.entryTime)}</span> },
          { key: 'exit', header: 'Exit', render: (v) => v.exitTime ? <span className="whitespace-nowrap">{formatDateTime(v.exitTime)}</span> : <StatusBadge status="ACTIVE" /> },
          { key: 'actions', header: '', render: (v) => !v.exitTime ? <button className="btn-secondary btn-sm" onClick={() => setExit(v)}>Mark exit</button> : null },
        ]}
        rows={list.data} loading={list.loading || (!hostel && hostels.length > 0)} error={list.error} onRetry={list.reload}
        emptyTitle={dq || inside ? 'No matching visitors' : 'No visitors yet'} emptyMessage={dq || inside ? 'Try changing your search or filter.' : 'Register a visitor when they arrive.'} emptyAction={dq || inside ? undefined : addBtn}
        footer={list.meta ? <Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /> : undefined}
      />

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Register visitor" size="lg"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button className="btn-primary" type="submit" form="visitor-form" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Register</button></>}>
        <form id="visitor-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchBar value={sq} onChange={setSq} placeholder="Find student to visit" className="sm:col-span-2" />
            <SelectField className="sm:col-span-2" label="Student being visited" required value={form.student} onChange={set('student')} error={errors.student}
              placeholder={students.loading ? 'Loading students...' : studentOptions.length ? 'Select a student' : 'No students found'} options={studentOptions} />
            {students.error && <p className="text-xs text-red-600 sm:col-span-2">{students.error}</p>}
            <FormField label="Visitor name" required value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
            <FormField label="Contact number" type="tel" required value={form.contact} onChange={set('contact')} error={errors.contact} />
            <FormField label="Relationship" required value={form.relationship} onChange={set('relationship')} error={errors.relationship} maxLength={40} />
            <FormField label="Purpose" required value={form.purpose} onChange={set('purpose')} error={errors.purpose} maxLength={200} />
          </div>
        </form>
      </Modal>

      <ConfirmationDialog open={!!exit} title="Record visitor exit?" message={exit ? `${exit.name} will be marked as having left the hostel now.` : ''} confirmLabel="Mark exit" loading={exitBusy} onConfirm={markExit} onCancel={() => setExit(null)} />
    </>
  );
}
