'use client';
import { useState } from 'react';
import { api, type UploadedFile } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { COMPLAINT_STATUSES } from '@/lib/constants';
import { titleCase } from '@/lib/format';
import { canTransitionComplaint, type ComplaintStatus } from '@/lib/services/workflow';
import { ComplaintCard } from '@/components/cards/ComplaintCard';
import { FileUpload } from '@/components/ui/FileUpload';
import { FormField, SelectField, TextareaField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { Async, Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 8;

export function ComplaintsClient() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const list = useApi<any[]>('/api/complaints', { page, limit: LIMIT, status });
  const [target, setTarget] = useState<any | null>(null);
  const [next, setNext] = useState('');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<UploadedFile[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function open(c: any) {
    setTarget(c);
    setNext(c.status);
    setAssignee(c.assignedToName ?? '');
    setNotes(c.resolutionNotes ?? '');
    setNote('');
    setImages(Array.isArray(c.resolutionImages) ? c.resolutionImages : []);
    setError('');
  }

  const closing = next === 'RESOLVED' || next === 'REJECTED';
  const options = COMPLAINT_STATUSES.filter((s) => canTransitionComplaint(target?.status as ComplaintStatus, s));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (closing && !notes.trim()) return setError('Resolution notes are required to resolve or reject a complaint');
    setError('');
    setBusy(true);
    try {
      await api.patch(`/api/complaints/${target._id}`, {
        ...(next !== target.status ? { status: next } : {}),
        ...(assignee.trim() && assignee.trim() !== (target.assignedToName ?? '') ? { assignedToName: assignee.trim() } : {}),
        ...(notes.trim() !== (target.resolutionNotes ?? '') ? { resolutionNotes: notes.trim() } : {}),
        ...(images.length ? { resolutionImages: images } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success('Complaint updated');
      setTarget(null);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rows = list.data;
  const closed = (c: any) => c.status === 'RESOLVED' || c.status === 'REJECTED';
  return (
    <>
      <PageHeader
        title="Complaints"
        subtitle="Review and resolve complaints from your hostel."
        actions={<select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>}
      />
      <Async loading={list.loading && !rows} error={list.error} empty={!!rows && rows.length === 0} emptyTitle="No complaints" emptyMessage={status ? 'No complaints match this filter.' : 'Complaints raised by students will appear here.'} onRetry={list.reload} rows={3}>
        <div className={`space-y-4 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
          {(rows ?? []).map((c) => (
            <ComplaintCard key={c._id} c={c} showStudent actions={
              <>
                {!closed(c) && <button className="btn-primary btn-sm" onClick={() => open(c)}>Update status</button>}
                {c.feedback?.rating && <span className="text-xs text-navy-500">Student rated {c.feedback.rating}/5{c.feedback.comment ? ` - "${c.feedback.comment}"` : ''}</span>}
              </>
            } />
          ))}
        </div>
        {list.meta && <div className="card mt-4"><Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /></div>}
      </Async>

      <Modal open={!!target} onClose={() => !busy && setTarget(null)} title="Update complaint" description={target?.title} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setTarget(null)} disabled={busy}>Cancel</button><button className="btn-primary" type="submit" form="complaint-update" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Save changes</button></>}>
        <form id="complaint-update" onSubmit={save} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Status" required value={next} onChange={(e) => setNext(e.target.value)} options={options.map((s) => ({ value: s, label: titleCase(s) }))} />
            <FormField label="Assigned to" value={assignee} onChange={(e) => setAssignee(e.target.value)} maxLength={80} hint="Staff member handling this" />
          </div>
          <TextareaField label={closing ? 'Resolution notes' : 'Resolution notes (optional)'} required={closing} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} error={error} />
          <FormField label="Update note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} hint="Added to the complaint history" />
          <FileUpload label="Evidence (photos or documents)" folder="complaints" value={images} onChange={setImages} max={5} />
        </form>
      </Modal>
    </>
  );
}
