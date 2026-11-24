'use client';
import { useState } from 'react';
import { Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { useWardenHostels } from '@/lib/useWardenHostels';
import { noticeSchema } from '@/lib/validation';
import { compact, validate, type FieldErrors } from '@/lib/forms';
import { NOTICE_AUDIENCES, PRIORITIES } from '@/lib/constants';
import { formatDate, formatDateTime, nameOf, titleCase, todayIST } from '@/lib/format';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { FormField, SelectField, TextareaField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { Async, Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 10;
const blank = { title: '', body: '', hostel: '', audience: 'ALL', priority: 'MEDIUM', pinned: false, expiresAt: '' };

export function NoticesClient() {
  const toast = useToast();
  const { hostels, hostel, userId } = useWardenHostels();
  const [page, setPage] = useState(1);
  const list = useApi<any[]>('/api/notices', { page, limit: LIMIT, includeExpired: true });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<any | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const set = (k: 'title' | 'body' | 'hostel' | 'audience' | 'priority' | 'expiresAt') => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  function openForm() {
    setForm({ ...blank, hostel });
    setErrors({});
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: FieldErrors = {};
    if (!form.hostel) errs.hostel = 'Choose a hostel';
    if (form.expiresAt && form.expiresAt < todayIST()) errs.expiresAt = 'Expiry cannot be in the past';
    const v = validate(noticeSchema, compact(form));
    if (!v.ok) Object.assign(errs, v.errors);
    if (Object.keys(errs).length || !v.ok) return setErrors(errs);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/notices', v.data);
      toast.success('Notice published');
      setOpen(false);
      setPage(1);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setDelBusy(true);
    try {
      await api.del(`/api/notices/${del._id}`);
      toast.success('Notice deleted');
      setDel(null);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDelBusy(false);
    }
  }

  const rows = list.data;
  const newBtn = <button className="btn-primary" onClick={openForm} disabled={!hostels.length}><Plus className="h-4 w-4" /> Publish notice</button>;
  return (
    <>
      <PageHeader title="Notices" subtitle="Publish announcements and review what you have posted." actions={newBtn} />
      <Async loading={list.loading && !rows} error={list.error} empty={!!rows && rows.length === 0} emptyTitle="No notices yet" emptyMessage="Publish an announcement for your hostel's students." emptyAction={newBtn} onRetry={list.reload} rows={3}>
        <div className={`space-y-4 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
          {(rows ?? []).map((n) => {
            const expired = n.expiresAt && new Date(n.expiresAt) < new Date();
            return (
              <article key={n._id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Megaphone className="mt-1 h-4 w-4 shrink-0 text-brand-500" />
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1.5 text-base font-semibold">{n.title}{n.pinned && <Pin className="h-3.5 w-3.5 text-brand-600" aria-label="Pinned" />}</h3>
                      <p className="mt-0.5 text-xs text-navy-400">
                        {formatDateTime(n.publishedAt ?? n.createdAt)} · {n.authorName ?? 'Staff'} · {titleCase(n.audience)}{n.hostel ? ` · ${nameOf(n.hostel)}` : ' · All hostels'}
                        {n.expiresAt ? ` · ${expired ? 'Expired' : 'Expires'} ${formatDate(n.expiresAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">{expired && <StatusBadge status="INACTIVE" />}<StatusBadge status={n.priority} /></div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-navy-600">{n.body}</p>
                {userId && String(n.author) === userId && (
                  <div className="mt-4"><button className="btn-secondary btn-sm" onClick={() => setDel(n)}><Trash2 className="h-3.5 w-3.5" /> Delete</button></div>
                )}
              </article>
            );
          })}
        </div>
        {list.meta && <div className="card mt-4"><Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /></div>}
      </Async>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Publish notice" description="Students in the selected hostel are notified." size="lg"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button><button className="btn-primary" type="submit" form="notice-form" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Publish</button></>}>
        <form id="notice-form" onSubmit={submit} className="space-y-4" noValidate>
          <FormField label="Title" required value={form.title} onChange={set('title')} error={errors.title} maxLength={160} />
          <TextareaField label="Message" required rows={5} value={form.body} onChange={set('body')} error={errors.body} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Hostel" required value={form.hostel} onChange={set('hostel')} error={errors.hostel} options={hostels.map((h) => ({ value: h._id, label: h.name }))} placeholder="Select hostel" />
            <SelectField label="Audience" value={form.audience} onChange={set('audience')} error={errors.audience} options={NOTICE_AUDIENCES.map((a) => ({ value: a, label: titleCase(a) }))} />
            <SelectField label="Priority" value={form.priority} onChange={set('priority')} error={errors.priority} options={PRIORITIES.map((p) => ({ value: p, label: titleCase(p) }))} />
            <FormField label="Expires on (optional)" type="date" min={todayIST()} value={form.expiresAt} onChange={set('expiresAt')} error={errors.expiresAt} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-navy-700"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm((s) => ({ ...s, pinned: e.target.checked }))} /> Pin to the top</label>
        </form>
      </Modal>

      <ConfirmationDialog open={!!del} title="Delete this notice?" message={del ? `"${del.title}" will be removed for everyone.` : ''} confirmLabel="Delete" danger loading={delBusy} onConfirm={remove} onCancel={() => setDel(null)} />
    </>
  );
}
