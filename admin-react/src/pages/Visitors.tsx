import { BadgeCheck, LogOut } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ConfirmButton from '../components/ConfirmButton';
import { dateTimeCol, statusCol, textCol } from '../lib/cols';
import { hostelField, phoneRule, VERIFICATION_STATUSES } from '../lib/fields';
import { label, nm } from '../lib/format';
import { enumFilter, studentLabel, useHostelFilter } from '../lib/pageKit';
import { apiPatch } from '../lib/api';
import type { Column, FieldDef } from '../types';

const columns: Column[] = [
  textCol('name', 'Visitor'),
  textCol('contact', 'Contact'),
  textCol('relationship', 'Relationship'),
  { key: 'student', header: 'Visiting', accessor: (r) => nm(r.student) },
  { key: 'hostel', header: 'Hostel', accessor: (r) => label(r.hostel) },
  textCol('purpose', 'Purpose'),
  dateTimeCol('entryTime', 'Entry'),
  { key: 'exitTime', header: 'Exit', accessor: (r) => (r.exitTime ? new Date(r.exitTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Inside') },
  statusCol('verificationStatus', 'Verification'),
];

const fields: FieldDef[] = [
  { ...hostelField(true), createOnly: true },
  { name: 'student', label: 'Visiting student', type: 'select', required: true, createOnly: true, remote: { endpoint: '/api/students', dependsOn: { field: 'hostel', param: 'hostel' }, label: studentLabel }, hint: 'Choose the hostel first; only students living there are listed' },
  { name: 'name', label: 'Visitor name', required: true, createOnly: true },
  { name: 'contact', label: 'Visitor phone', type: 'tel', required: true, createOnly: true, ...phoneRule },
  { name: 'relationship', label: 'Relationship', required: true, createOnly: true, placeholder: 'e.g. Father' },
  { name: 'purpose', label: 'Purpose of visit', required: true, createOnly: true },
  { name: 'entryTime', label: 'Entry time', type: 'datetime', createOnly: true, hint: 'Defaults to now' },
  { name: 'verificationStatus', label: 'Verification', type: 'select', options: VERIFICATION_STATUSES, default: 'PENDING' },
];

export default function Visitors() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Visitors" subtitle="Register visitors and record when they leave." entity="Visitor" endpoint="/api/visitors"
      columns={columns} fields={fields} canDelete={false}
      filters={[enumFilter('verificationStatus', 'Verification', VERIFICATION_STATUSES), { key: 'inside', label: 'Presence', options: [{ value: 'Inside', label: 'Inside' }, { value: 'Left', label: 'Left' }], accessor: (r) => (r.exitTime ? 'Left' : 'Inside') }, hostel]}
      emptyDescription="Register a visitor when they arrive at the hostel."
      rowActions={(r, reload) => (
        <>
          {r.verificationStatus === 'PENDING' && (
            <ConfirmButton label="Verify" icon={<BadgeCheck className="h-3.5 w-3.5" />} danger={false} title="Mark visitor as verified?" message={`${r.name}'s identity will be recorded as verified.`}
              successMessage="Visitor verified" onConfirm={() => apiPatch(`/api/visitors/${r._id}`, { verificationStatus: 'VERIFIED' })} onDone={reload} />
          )}
          {!r.exitTime && (
            <ConfirmButton label="Mark exit" icon={<LogOut className="h-3.5 w-3.5" />} danger={false} title="Record visitor exit?" message={`${r.name} will be marked as having left the hostel now.`} confirmLabel="Mark exit"
              successMessage="Exit recorded" onConfirm={() => apiPatch(`/api/visitors/${r._id}`, { markExit: true })} onDone={reload} />
          )}
        </>
      )} />
  );
}
