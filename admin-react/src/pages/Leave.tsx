import { Check, X } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ActionDialog from '../components/ActionDialog';
import { dateCol, statusCol, textCol } from '../lib/cols';
import { opts } from '../lib/fields';
import { label, nm } from '../lib/format';
import { enumFilter, useHostelFilter } from '../lib/pageKit';
import { apiPatch } from '../lib/api';
import type { Column, FieldDef } from '../types';

const LEAVE_STATUSES = opts('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

const columns: Column[] = [
  { key: 'student', header: 'Student', accessor: (r) => nm(r.student) },
  { key: 'hostel', header: 'Hostel', accessor: (r) => label(r.hostel) },
  { key: 'reason', header: 'Reason', accessor: (r) => r.reason ?? '', className: 'max-w-xs truncate' },
  dateCol('departureDate', 'Departure'),
  dateCol('returnDate', 'Return'),
  textCol('emergencyContactName', 'Emergency contact'),
  textCol('emergencyContactPhone', 'Emergency phone'),
  statusCol(),
  { key: 'remarks', header: 'Remarks', accessor: (r) => r.remarks ?? '' },
  { key: 'reviewedBy', header: 'Reviewed by', accessor: (r) => nm(r.reviewedBy) },
  dateCol('createdAt', 'Applied'),
];

const approveFields: FieldDef[] = [{ name: 'remarks', label: 'Remarks (optional)', type: 'textarea', validate: (v) => (String(v).length > 500 ? 'Maximum 500 characters' : undefined) }];
const rejectFields: FieldDef[] = [{ name: 'remarks', label: 'Reason for rejection', type: 'textarea', required: true, hint: 'Shown to the student', validate: (v) => (String(v).length > 500 ? 'Maximum 500 characters' : undefined) }];

export default function Leave() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Leave requests" subtitle="Approve or reject student leave applications." entity="Leave request" endpoint="/api/leave"
      columns={columns} fields={[]} canCreate={false} canEdit={false} canDelete={false} exportName="leave-requests"
      filters={[enumFilter('status', 'Status', LEAVE_STATUSES), hostel]}
      emptyDescription="Leave requests submitted by students will appear here."
      rowActions={(r, reload) => r.status !== 'PENDING' ? null : (
        <>
          <ActionDialog label="Approve" icon={<Check className="h-3.5 w-3.5" />} variant="primary" title={`Approve leave for ${nm(r.student)}`} fields={approveFields} submitLabel="Approve" successMessage="Leave approved"
            onSubmit={(p) => apiPatch(`/api/leave/${r._id}`, { status: 'APPROVED', ...p })} onDone={reload} />
          <ActionDialog label="Reject" icon={<X className="h-3.5 w-3.5" />} variant="danger" title={`Reject leave for ${nm(r.student)}`} fields={rejectFields} submitLabel="Reject" successMessage="Leave rejected"
            onSubmit={(p) => apiPatch(`/api/leave/${r._id}`, { status: 'REJECTED', ...p })} onDone={reload} />
        </>
      )} />
  );
}
