'use client';
import { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { api, type UploadedFile } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { complaintSchema } from '@/lib/validation';
import { validate, type FieldErrors } from '@/lib/forms';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, PRIORITIES } from '@/lib/constants';
import { titleCase } from '@/lib/format';
import { ComplaintCard } from '@/components/cards/ComplaintCard';
import { FileUpload } from '@/components/ui/FileUpload';
import { FormField, SelectField, TextareaField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { Async, Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 8;
const blank = { category: 'MAINTENANCE', title: '', description: '', priority: 'MEDIUM' };

export function ComplaintsClient() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const list = useApi<any[]>('/api/complaints', { page, limit: LIMIT, status });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<any | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [fbBusy, setFbBusy] = useState(false);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(complaintSchema, { ...form, images });
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/complaints', v.data);
      toast.success('Complaint submitted. Your warden has been notified.');
      setOpen(false);
      setForm(blank);
      setImages([]);
      setPage(1);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback() {
    if (!rating) return toast.error('Please choose a rating');
    setFbBusy(true);
    try {
      await api.patch(`/api/complaints/${fb._id}`, { feedback: { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) } });
      toast.success('Thanks for your feedback');
      setFb(null);
      setRating(0);
      setComment('');
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setFbBusy(false);
    }
  }

  const rows = list.data;
  const newBtn = <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New complaint</button>;

  return (
    <>
      <PageHeader
        title="Complaints"
        subtitle="Report an issue and track its resolution."
        actions={<><select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>{newBtn}</>}
      />
      <Async loading={list.loading && !rows} error={list.error} empty={!!rows && rows.length === 0} emptyTitle="No complaints" emptyMessage={status ? 'No complaints match this filter.' : 'Having an issue with your room or the hostel? Raise a complaint and track it here.'} emptyAction={status ? undefined : newBtn} onRetry={list.reload} rows={3}>
        <div className={`space-y-4 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
          {(rows ?? []).map((c) => (
            <ComplaintCard
              key={c._id}
              c={c}
              actions={
                c.status === 'RESOLVED' ? (
                  c.feedback?.rating ? (
                    <p className="flex items-center gap-1 text-xs text-navy-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> You rated this {c.feedback.rating}/5{c.feedback.comment ? ` - "${c.feedback.comment}"` : ''}</p>
                  ) : (
                    <button className="btn-secondary btn-sm" onClick={() => setFb(c)}>Rate resolution</button>
                  )
                ) : undefined
              }
            />
          ))}
        </div>
        {list.meta && <div className="card mt-4"><Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /></div>}
      </Async>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="New complaint" description="Describe the problem so it can be fixed quickly." size="lg"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button className="btn-primary" type="submit" form="complaint-form" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Submit</button></>}>
        <form id="complaint-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Category" required value={form.category} onChange={set('category')} error={errors.category} options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))} />
            <SelectField label="Priority" required value={form.priority} onChange={set('priority')} error={errors.priority} options={PRIORITIES.map((c) => ({ value: c, label: titleCase(c) }))} />
          </div>
          <FormField label="Title" required value={form.title} onChange={set('title')} error={errors.title} maxLength={140} />
          <TextareaField label="Description" required value={form.description} onChange={set('description')} error={errors.description} hint="At least 10 characters" />
          <FileUpload label="Supporting images" folder="complaints" value={images} onChange={setImages} max={5} />
        </form>
      </Modal>

      <Modal open={!!fb} onClose={() => !fbBusy && setFb(null)} title="Rate the resolution" description={fb?.title} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setFb(null)} disabled={fbBusy}>Cancel</button><button className="btn-primary" onClick={sendFeedback} disabled={fbBusy}>{fbBusy && <Spinner className="h-4 w-4" />} Send feedback</button></>}>
        <div className="space-y-4">
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="rounded p-1">
                <Star className={`h-8 w-8 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-navy-200'}`} />
              </button>
            ))}
          </div>
          <TextareaField label="Comment (optional)" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
        </div>
      </Modal>
    </>
  );
}
