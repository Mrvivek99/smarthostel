import { RefreshCcw, UserPlus } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ActionDialog from '../components/ActionDialog';
import { ComplaintCard } from '../components/cards';
import { apiPatch } from '../lib/api';
import { dateCol, enumCol, statusCol, textCol } from '../lib/cols';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, opts, PRIORITIES } from '../lib/fields';
import { label, nm, titleCase } from '../lib/format';
import { enumFilter, useHostelFilter } from '../lib/pageKit';
import type { Column, FieldDef, Row } from '../types';

const ORDER = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
const closed = (r: Row) => r.status === 'RESOLVED' || r.status === 'REJECTED';
const nextStatuses = (r: Row) => [...ORDER.filter((s) => ORDER.indexOf(s) > ORDER.indexOf(r.status)), 'REJECTED'].map((v) => ({ value: v, label: titleCase(v) }));

const columns: Column[] = [
  textCol('title', 'Title'),
  enumCol('category', 'Category'),
  { key: 'student', header: 'Student', accessor: (r) => nm(r.student) },
  { key: 'hostel', header: 'Hostel', accessor: (r) => label(r.hostel) },
  statusCol('priority', 'Priority'),
  statusCol(),
  { key: 'assignedTo', header: 'Assigned to', accessor: (r) => nm(r.assignedTo) || r.assignedToName || '' },
  dateCol('createdAt', 'Raised'),
  { key: 'description', header: 'Description', accessor: (r) => r.description ?? '', className: 'max-w-xs truncate' },
  { key: 'resolutionNotes', header: 'Resolution', accessor: (r) => r.resolutionNotes ?? '', className: 'max-w-xs truncate' },
  { key: 'feedback', header: 'Student rating', accessor: (r) => (r.feedback?.rating ? `${r.feedback.rating}/5${r.feedback.comment ? ` - ${r.feedback.comment}` : ''}` : '') },
];

const assignFields: FieldDef[] = [
  { name: 'assignedTo', label: 'Assign to', type: 'select', required: true, remote: { endpoint: '/api/admin/users', filter: (u) => (u.role === 'WARDEN' || u.role === 'ADMIN') && u.isActive !== false, label: (u) => `${u.name} (${titleCase(u.role)})` } },
  { name: 'note', label: 'Note (optional)', validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
];

export default function Complaints() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Complaints" subtitle="Triage student complaints, assign them and record the resolution." entity="Complaint" endpoint="/api/complaints"
      columns={columns} fields={[]} canCreate={false} canEdit={false} canDelete={false}
      filters={[enumFilter('status', 'Status', COMPLAINT_STATUSES), enumFilter('priority', 'Priority', PRIORITIES), enumFilter('category', 'Category', COMPLAINT_CATEGORIES), hostel]}
      card={(r, actions) => <ComplaintCard c={{ ...r, resolutionNote: r.resolutionNotes }} actions={actions} />}
      emptyDescription="Complaints raised by students will show up here."
      rowActions={(r, reload) => closed(r) ? null : (
        <>
          <ActionDialog label="Assign" icon={<UserPlus className="h-3.5 w-3.5" />} title={`Assign: ${r.title}`} subtitle="The complaint moves to Assigned if it is still new."
            fields={assignFields} submitLabel="Assign" successMessage="Complaint assigned"
            onSubmit={(p) => apiPatch(`/api/complaints/${r._id}`, { assignedTo: p.assignedTo, ...(p.note ? { note: p.note } : {}) })} onDone={reload} />
          <ActionDialog label="Update" icon={<RefreshCcw className="h-3.5 w-3.5" />} variant="primary" title={`Update: ${r.title}`} subtitle="Move the complaint forward, change its priority or record how it was resolved."
            initial={{ priority: r.priority, resolutionNotes: r.resolutionNotes }} submitLabel="Save update" successMessage="Complaint updated"
            fields={[
              { name: 'status', label: 'New status', type: 'select', options: nextStatuses(r), hint: 'Leave blank to keep the current status' },
              { name: 'priority', label: 'Priority', type: 'select', options: opts('LOW', 'MEDIUM', 'HIGH', 'URGENT') },
              {
                name: 'resolutionNotes', label: 'Resolution notes', type: 'textarea', hint: 'Required when resolving or rejecting',
                validate: (v, all) => ((all.status === 'RESOLVED' || all.status === 'REJECTED') && !String(v ?? '').trim() ? 'Add resolution notes before closing a complaint' : String(v).length > 2000 ? 'Maximum 2000 characters' : undefined),
              },
              { name: 'note', label: 'Timeline note (optional)', validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
            ]}
            onSubmit={(p) => apiPatch(`/api/complaints/${r._id}`, p)} onDone={reload} />
        </>
      )} />
  );
}
