'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { LEAVE_STATUSES } from '@/lib/constants';
import { formatDate, formatDateTime, titleCase } from '@/lib/format';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import { TextareaField } from '@/components/ui/FormField';
import { Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 10;

export function LeaveClient() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('PENDING');
  const list = useApi<any[]>('/api/leave', { page, limit: LIMIT, status });
  const [target, setTarget] = useState<{ l: any; decision: 'APPROVED' | 'REJECTED' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<any | null>(null);

  function decide(l: any, decision: 'APPROVED' | 'REJECTED') {
    setTarget({ l, decision });
    setRemarks('');
    setError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (target.decision === 'REJECTED' && !remarks.trim()) return setError('Please give a reason for rejecting');
    setBusy(true);
    try {
      await api.patch(`/api/leave/${target.l._id}`, { status: target.decision, ...(remarks.trim() ? { remarks: remarks.trim() } : {}) });
      toast.success(`Leave ${target.decision === 'APPROVED' ? 'approved' : 'rejected'}`);
      setTarget(null);
      list.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Leave"
        subtitle="Approve or reject leave requests and review history."
        actions={<select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses (history)</option>{LEAVE_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>}
      />
      <DataTable
        columns={[
          { key: 'student', header: 'Student', render: (l) => <div><p className="font-semibold">{l.student?.name ?? '-'}</p><p className="text-xs text-navy-400">{l.student?.enrollmentNo ?? l.student?.email ?? ''}</p></div> },
          { key: 'dates', header: 'Dates', render: (l) => <span className="whitespace-nowrap">{formatDate(l.departureDate)} - {formatDate(l.returnDate)}</span> },
          { key: 'reason', header: 'Reason', hideOnMobile: true, render: (l) => <span className="line-clamp-2 max-w-xs">{l.reason}</span> },
          { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
          {
            key: 'actions', header: '',
            render: (l) => l.status === 'PENDING' ? (
              <div className="flex gap-2">
                <button className="btn-primary btn-sm" onClick={() => decide(l, 'APPROVED')}>Approve</button>
                <button className="btn-secondary btn-sm" onClick={() => decide(l, 'REJECTED')}>Reject</button>
              </div>
            ) : <button className="btn-secondary btn-sm" onClick={() => setView(l)}>Details</button>,
          },
        ]}
        rows={list.data} loading={list.loading} error={list.error} onRetry={list.reload}
        emptyTitle={status === 'PENDING' ? 'No pending requests' : 'No leave requests'} emptyMessage={status === 'PENDING' ? 'You are all caught up. Switch the filter to see past decisions.' : 'No requests match this filter.'}
        footer={list.meta ? <Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /> : undefined}
      />

      <Modal open={!!target} onClose={() => !busy && setTarget(null)} title={target?.decision === 'APPROVED' ? 'Approve leave' : 'Reject leave'}
        description={target ? `${target.l.student?.name ?? 'Student'} · ${formatDate(target.l.departureDate)} to ${formatDate(target.l.returnDate)}` : undefined}
        footer={<><button className="btn-secondary" onClick={() => setTarget(null)} disabled={busy}>Cancel</button><button className={target?.decision === 'REJECTED' ? 'btn-danger' : 'btn-primary'} type="submit" form="leave-decision" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} {target?.decision === 'APPROVED' ? 'Approve' : 'Reject'}</button></>}>
        <form id="leave-decision" onSubmit={submit} className="space-y-4" noValidate>
          {target && <p className="rounded-xl bg-navy-50 p-3 text-sm text-navy-700"><span className="font-semibold">Reason: </span>{target.l.reason}</p>}
          {target?.l.documentUrl && <a href={target.l.documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-700 hover:underline">View supporting document</a>}
          <TextareaField label={target?.decision === 'REJECTED' ? 'Remarks' : 'Remarks (optional)'} required={target?.decision === 'REJECTED'} rows={3} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} error={error} />
        </form>
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title="Leave details" description={view?.student?.name} footer={<button className="btn-secondary" onClick={() => setView(null)}>Close</button>}>
        {view && (
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><StatusBadge status={view.status} /><span>{formatDate(view.departureDate)} - {formatDate(view.returnDate)}</span></div>
            <div><dt className="text-xs font-medium uppercase text-navy-400">Reason</dt><dd className="mt-0.5 whitespace-pre-line">{view.reason}</dd></div>
            <div><dt className="text-xs font-medium uppercase text-navy-400">Emergency contact</dt><dd className="mt-0.5">{[view.emergencyContactName, view.emergencyContactPhone].filter(Boolean).join(' · ') || '-'}</dd></div>
            <div><dt className="text-xs font-medium uppercase text-navy-400">Remarks</dt><dd className="mt-0.5">{view.remarks || '-'}</dd></div>
            <div><dt className="text-xs font-medium uppercase text-navy-400">Reviewed</dt><dd className="mt-0.5">{view.reviewedBy?.name ? `${view.reviewedBy.name} · ${formatDateTime(view.reviewedAt)}` : '-'}</dd></div>
            {view.documentUrl && <a href={view.documentUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">Supporting document</a>}
          </dl>
        )}
      </Modal>
    </>
  );
}
