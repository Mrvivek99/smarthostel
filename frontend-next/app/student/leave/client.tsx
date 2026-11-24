'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api, type UploadedFile } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { leaveSchema } from '@/lib/validation';
import { compact, validate, type FieldErrors } from '@/lib/forms';
import { LEAVE_STATUSES } from '@/lib/constants';
import { formatDate, titleCase, todayIST } from '@/lib/format';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { DataTable } from '@/components/ui/DataTable';
import { FileUpload } from '@/components/ui/FileUpload';
import { FormField, TextareaField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 10;

export function LeaveClient() {
  const toast = useToast();
  const me = useApi<any>('/api/auth/me');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const list = useApi<any[]>('/api/leave', { page, limit: LIMIT, status });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reason: '', departureDate: '', returnDate: '', emergencyContactName: '', emergencyContactPhone: '' });
  const [doc, setDoc] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState<any | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  function openForm() {
    const st = me.data?.student;
    setForm((f) => ({ ...f, emergencyContactName: f.emergencyContactName || st?.emergencyContactName || '', emergencyContactPhone: f.emergencyContactPhone || st?.emergencyContactPhone || '' }));
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: FieldErrors = {};
    const v = validate(leaveSchema, { ...form, ...(doc[0] ? { documentUrl: doc[0].url } : {}) });
    if (!v.ok) Object.assign(errs, v.errors);
    if (form.departureDate && form.departureDate < todayIST()) errs.departureDate = 'Departure cannot be in the past';
    if (form.departureDate && form.returnDate && form.returnDate < form.departureDate) errs.returnDate = 'Return must be on or after departure';
    if (Object.keys(errs).length || !v.ok) return setErrors(errs);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/leave', compact(v.data));
      toast.success('Leave request submitted for approval');
      setOpen(false);
      setForm({ reason: '', departureDate: '', returnDate: '', emergencyContactName: '', emergencyContactPhone: '' });
      setDoc([]);
      setPage(1);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    setCancelBusy(true);
    try {
      await api.patch(`/api/leave/${cancel._id}`, { status: 'CANCELLED' });
      toast.success('Leave request cancelled');
      setCancel(null);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCancelBusy(false);
    }
  }

  const newBtn = <button className="btn-primary" onClick={openForm}><Plus className="h-4 w-4" /> Apply for leave</button>;
  return (
    <>
      <PageHeader
        title="Leave"
        subtitle="Apply for leave and track approvals."
        actions={<><select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{LEAVE_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>{newBtn}</>}
      />
      <DataTable
        columns={[
          { key: 'dates', header: 'Dates', render: (l) => <span className="font-medium">{formatDate(l.departureDate)} - {formatDate(l.returnDate)}</span> },
          { key: 'reason', header: 'Reason', render: (l) => <span className="line-clamp-2 max-w-xs">{l.reason}</span> },
          { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
          { key: 'remarks', header: 'Warden remarks', hideOnMobile: true, render: (l) => l.remarks || '-' },
          { key: 'actions', header: '', render: (l) => (l.status === 'PENDING' || (l.status === 'APPROVED' && new Date(l.departureDate) > new Date())) ? <button className="btn-secondary btn-sm" onClick={() => setCancel(l)}>Cancel</button> : null },
        ]}
        rows={list.data} loading={list.loading} error={list.error} onRetry={list.reload}
        emptyTitle="No leave requests" emptyMessage={status ? 'No requests match this filter.' : 'Going home or travelling? Apply for leave here.'} emptyAction={status ? undefined : newBtn}
        footer={list.meta ? <Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /> : undefined}
      />

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Apply for leave" size="lg"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button className="btn-primary" type="submit" form="leave-form" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Submit request</button></>}>
        <form id="leave-form" onSubmit={submit} className="space-y-4" noValidate>
          <TextareaField label="Reason" required rows={3} value={form.reason} onChange={set('reason')} error={errors.reason} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Departure date" type="date" required min={todayIST()} value={form.departureDate} onChange={set('departureDate')} error={errors.departureDate} />
            <FormField label="Return date" type="date" required min={form.departureDate || todayIST()} value={form.returnDate} onChange={set('returnDate')} error={errors.returnDate} />
            <FormField label="Emergency contact name" value={form.emergencyContactName} onChange={set('emergencyContactName')} error={errors.emergencyContactName} />
            <FormField label="Emergency contact phone" type="tel" required value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} error={errors.emergencyContactPhone} />
          </div>
          <FileUpload label="Supporting document (optional)" folder="leave" value={doc} onChange={(f) => setDoc(f.slice(-1))} max={1} />
        </form>
      </Modal>

      <ConfirmationDialog open={!!cancel} title="Cancel this leave request?" message={cancel ? `Your leave from ${formatDate(cancel.departureDate)} to ${formatDate(cancel.returnDate)} will be cancelled.` : ''} confirmLabel="Cancel leave" danger loading={cancelBusy} onConfirm={doCancel} onCancel={() => setCancel(null)} />
    </>
  );
}
