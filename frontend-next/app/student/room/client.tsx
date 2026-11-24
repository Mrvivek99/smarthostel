'use client';
import { useState } from 'react';
import { BedDouble, Building2, ScrollText } from 'lucide-react';
import { api } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { roomChangeSchema } from '@/lib/validation';
import { validate, type FieldErrors } from '@/lib/forms';
import { formatDate, nameOf, titleCase } from '@/lib/format';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { SelectField, TextareaField } from '@/components/ui/FormField';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async, EmptyState, Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

export function RoomClient() {
  const me = useApi<any>('/api/auth/me');
  const history = useApi<any[]>('/api/allocations', { limit: 50 });
  const hostels = useApi<any[]>('/api/hostels', { limit: 100 });
  const student = me.data?.student;
  const roomId = student?.room?._id ?? (typeof student?.room === 'string' ? student.room : null);
  const roommates = useApi<any[]>(roomId ? '/api/beds' : null, { room: roomId, limit: 20 });
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reason: '', preferredRoomType: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const hostelId = student?.hostel?._id ?? student?.hostel;
  const hostel = (hostels.data ?? []).find((h) => String(h._id) === String(hostelId));
  const active = (history.data ?? []).find((a) => a.status === 'ACTIVE');

  async function requestChange(e: React.FormEvent) {
    e.preventDefault();
    const r = validate(roomChangeSchema, { reason: form.reason, ...(form.preferredRoomType ? { preferredRoomType: form.preferredRoomType } : {}) });
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    setBusy(true);
    try {
      // Room-change requests are routed to the warden as a maintenance-category complaint (tracked in Complaints).
      await api.post('/api/complaints', {
        category: 'OTHER',
        title: 'Room change request',
        description: `Reason: ${r.data.reason}${r.data.preferredRoomType ? `\nPreferred room type: ${titleCase(r.data.preferredRoomType)}` : ''}\nCurrent room: ${nameOf(student?.room, 'roomNumber')}, bed ${nameOf(student?.bed, 'bedNumber')}`,
        priority: 'MEDIUM',
      });
      toast.success('Room change request sent to your warden. Track it under Complaints.');
      setOpen(false);
      setForm({ reason: '', preferredRoomType: '' });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="My room" subtitle="Your hostel, room, bed and allocation history." actions={student?.bed ? <button className="btn-secondary" onClick={() => setOpen(true)}>Request room change</button> : undefined} />
      <Async loading={me.loading && !me.data} error={me.error} onRetry={me.reload} rows={4}>
        {!student?.bed ? (
          <div className="card"><EmptyState title="No bed allocated yet" message="Once your admission is approved and a bed is assigned, the details will appear here." icon={<BedDouble className="h-6 w-6" />} /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Section title="Allocation" className="lg:col-span-2">
              <dl className="grid gap-5 p-5 sm:grid-cols-2">
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Hostel</dt><dd className="mt-0.5 flex items-center gap-2 text-lg font-semibold"><Building2 className="h-5 w-5 text-brand-500" />{nameOf(student.hostel)}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Room</dt><dd className="mt-0.5 text-lg font-semibold">{nameOf(student.room, 'roomNumber')} <span className="text-sm font-medium text-navy-400">{student.room?.type ? titleCase(student.room.type) : ''}</span></dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Bed</dt><dd className="mt-0.5 text-lg font-semibold">{nameOf(student.bed, 'bedNumber')}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Checked in</dt><dd className="mt-0.5 text-lg font-semibold">{active ? formatDate(active.checkInDate) : '-'}</dd></div>
              </dl>
              {(roommates.data ?? []).length > 0 && (
                <div className="border-t border-navy-100 p-5">
                  <h3 className="text-sm font-semibold">Beds in this room</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(roommates.data ?? []).map((b) => (
                      <li key={b._id} className="flex items-center justify-between rounded-xl border border-navy-100 px-3.5 py-2.5 text-sm">
                        <span className="font-medium">Bed {b.bedNumber}{String(b._id) === String(student.bed?._id ?? student.bed) ? ' (you)' : ''}</span>
                        <span className="flex items-center gap-2">
                          {b.student?.name || b.occupant?.name ? <span className="text-navy-500">{b.student?.name ?? b.occupant?.name}</span> : null}
                          <StatusBadge status={b.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
            <Section title="Hostel rules">
              <div className="p-5">
                {hostel?.rules?.length ? (
                  <ul className="space-y-2.5 text-sm text-navy-700">
                    {hostel.rules.map((r: string, i: number) => <li key={i} className="flex gap-2"><ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{r}</li>)}
                  </ul>
                ) : <p className="text-sm text-navy-500">{hostels.loading ? 'Loading rules...' : 'No rules have been published for your hostel.'}</p>}
                {hostel?.address && <p className="mt-4 border-t border-navy-100 pt-3 text-xs text-navy-500">{hostel.address}{hostel.city ? `, ${hostel.city}` : ''}</p>}
              </div>
            </Section>
          </div>
        )}
      </Async>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Allocation history</h2>
      <DataTable
        columns={[
          { key: 'hostel', header: 'Hostel', render: (a) => nameOf(a.hostel) },
          { key: 'room', header: 'Room', render: (a) => nameOf(a.room, 'roomNumber') },
          { key: 'bed', header: 'Bed', render: (a) => nameOf(a.bed, 'bedNumber'), hideOnMobile: true },
          { key: 'checkInDate', header: 'Check-in', render: (a) => formatDate(a.checkInDate) },
          { key: 'checkOutDate', header: 'Check-out', render: (a) => formatDate(a.checkOutDate), hideOnMobile: true },
          { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
        ]}
        rows={history.data} loading={history.loading} error={history.error} onRetry={history.reload}
        emptyTitle="No allocation history" emptyMessage="Your past and current bed allocations will be listed here."
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Request a room change" description="Your warden will review the request."
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" form="rc-form" type="submit" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Send request</button></>}>
        <form id="rc-form" onSubmit={requestChange} className="space-y-4" noValidate>
          <TextareaField label="Reason" required value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} error={errors.reason} hint="At least 10 characters" />
          <SelectField label="Preferred room type" value={form.preferredRoomType} onChange={(e) => setForm((s) => ({ ...s, preferredRoomType: e.target.value }))} placeholder="No preference" error={errors.preferredRoomType} options={['SINGLE', 'DOUBLE', 'SHARED'].map((t) => ({ value: t, label: titleCase(t) }))} />
        </form>
      </Modal>
    </>
  );
}
