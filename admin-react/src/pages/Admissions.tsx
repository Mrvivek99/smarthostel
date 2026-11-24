import { useMemo, useState } from 'react';
import { Check, Eye, FileText, Search, X } from 'lucide-react';
import ActionDialog from '../components/ActionDialog';
import ConfirmButton from '../components/ConfirmButton';
import DataTable from '../components/DataTable';
import FilterPanel from '../components/FilterPanel';
import Modal from '../components/Modal';
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/States';
import { useList } from '../hooks/useList';
import { apiPatch } from '../lib/api';
import { fmtDate, fmtDateTime, label, titleCase } from '../lib/format';
import { opts } from '../lib/fields';
import type { Column, FieldDef, Row } from '../types';

const STATUSES = opts('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
const open = (r: Row) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW';

const columns: Column[] = [
  { key: 'fullName', header: 'Applicant', sortable: true, accessor: (r) => r.fullName },
  { key: 'email', header: 'Email', accessor: (r) => r.student?.email ?? '' },
  { key: 'course', header: 'Course', accessor: (r) => `${r.course ?? ''}${r.year ? ` · Year ${r.year}` : ''}` },
  { key: 'preferredHostel', header: 'Preferred hostel', accessor: (r) => label(r.preferredHostel) },
  { key: 'preferredRoomType', header: 'Room type', accessor: (r) => titleCase(r.preferredRoomType ?? '') },
  { key: 'createdAt', header: 'Submitted', accessor: (r) => fmtDate(r.createdAt) },
  { key: 'status', header: 'Status', accessor: (r) => r.status, render: (r) => <StatusBadge value={r.status} /> },
];

const approveFields: FieldDef[] = [{ name: 'remarks', label: 'Remarks (optional)', type: 'textarea', validate: (v) => (String(v).length > 500 ? 'Maximum 500 characters' : undefined) }];
const rejectFields: FieldDef[] = [{ name: 'remarks', label: 'Reason for rejection', type: 'textarea', required: true, hint: 'Shown to the student', validate: (v) => (String(v).length > 500 ? 'Maximum 500 characters' : undefined) }];

function Detail({ r }: { r: Row }) {
  const rows: [string, string][] = [
    ['Applicant', r.fullName], ['Email', r.student?.email], ['Gender', titleCase(r.gender ?? '')], ['Date of birth', fmtDate(r.dob)], ['Phone', r.phone], ['Address', r.address],
    ['Course', r.course], ['Year', r.year ? String(r.year) : ''], ['Institution', r.institution], ['Enrollment no.', r.enrollmentNo],
    ['Preferred hostel', label(r.preferredHostel)], ['Preferred room type', titleCase(r.preferredRoomType ?? '')],
    ['Guardian', [r.guardianName, r.guardianRelation && `(${r.guardianRelation})`, r.guardianPhone].filter(Boolean).join(' ')],
    ['Emergency contact', [r.emergencyName, r.emergencyPhone].filter(Boolean).join(' · ')],
    ['Submitted', fmtDateTime(r.createdAt)], ['Reviewed', r.reviewedAt ? fmtDateTime(r.reviewedAt) : ''], ['Remarks', r.remarks],
  ];
  return (
    <div>
      <div className="mb-3"><StatusBadge value={r.status} /></div>
      <dl className="divide-y divide-slate-100">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="py-2.5 grid grid-cols-3 gap-3"><dt className="text-sm text-slate-500">{k}</dt><dd className="col-span-2 text-sm text-slate-800 break-words">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-navy-900 mb-2">Documents</h3>
        {Array.isArray(r.documents) && r.documents.length ? (
          <ul className="space-y-1.5">
            {r.documents.map((d: Row, i: number) => (
              <li key={d.publicId ?? d.url ?? i}><a className="inline-flex items-center gap-2 text-sm text-brand-700 hover:underline" href={d.url} target="_blank" rel="noopener noreferrer"><FileText className="h-4 w-4" />{d.type ? titleCase(d.type) : `Document ${i + 1}`}</a></li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-400">No documents uploaded.</p>}
      </div>
    </div>
  );
}

export default function Admissions() {
  const { items, loading, error, reload } = useList('/api/admissions');
  const [fv, setFv] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<Row | null>(null);
  const filters = useMemo(() => [{ key: 'status', label: 'Status', options: STATUSES }], []);
  const rows = useMemo(() => (fv.status ? items.filter((r) => r.status === fv.status) : items), [items, fv]);
  const pending = items.filter(open).length;

  const actions = (r: Row) => (
    <>
      <button className="btn-ghost btn-sm !px-2" title="View application" aria-label="View application" onClick={() => setViewing(r)}><Eye className="h-4 w-4" /></button>
      {open(r) && (
        <>
          {r.status === 'SUBMITTED' && (
            <ConfirmButton label="Start review" icon={<Search className="h-3.5 w-3.5" />} danger={false} title="Mark under review?" message="The student will be notified that the application is being reviewed."
              successMessage="Marked under review" onConfirm={() => apiPatch(`/api/admissions/${r._id}`, { status: 'UNDER_REVIEW' })} onDone={reload} />
          )}
          <ActionDialog label="Approve" icon={<Check className="h-3.5 w-3.5" />} variant="primary" title={`Approve ${r.fullName}`} subtitle="Activates the student account so a bed can be allocated."
            fields={approveFields} submitLabel="Approve" successMessage="Application approved" onSubmit={(p) => apiPatch(`/api/admissions/${r._id}`, { status: 'APPROVED', ...p })} onDone={reload} />
          <ActionDialog label="Reject" icon={<X className="h-3.5 w-3.5" />} variant="danger" title={`Reject ${r.fullName}`}
            fields={rejectFields} submitLabel="Reject" successMessage="Application rejected" onSubmit={(p) => apiPatch(`/api/admissions/${r._id}`, { status: 'REJECTED', ...p })} onDone={reload} />
        </>
      )}
    </>
  );

  return (
    <div>
      <PageHeader title="Admissions" subtitle={pending ? `${pending} application${pending === 1 ? '' : 's'} waiting for review.` : 'Review hostel applications submitted by students.'} />
      {loading ? <div className="card"><LoadingState /></div> : error ? <div className="card"><ErrorState message={error} onRetry={reload} /></div> : (
        <DataTable columns={columns} rows={rows} actions={actions} exportName="admissions" searchPlaceholder="Search applications…"
          emptyTitle="No applications yet" emptyDescription="Applications appear here once students submit them."
          toolbar={<FilterPanel filters={filters} values={fv} onChange={(k, v) => setFv((s) => ({ ...s, [k]: v }))} onReset={() => setFv({})} />} />
      )}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Admission application" subtitle={viewing?.fullName} size="lg">
        {viewing && <Detail r={viewing} />}
      </Modal>
    </div>
  );
}
