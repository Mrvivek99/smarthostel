import { UserCheck, UserX } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ConfirmButton from '../components/ConfirmButton';
import { StudentCard } from '../components/cards';
import { apiPatch } from '../lib/api';
import { activeCol, refCol, statusCol, textCol } from '../lib/cols';
import { GENDERS, passwordRule, phoneRule, STUDENT_STATUSES } from '../lib/fields';
import { enumFilter, intRule, roomNo, useHostelFilter } from '../lib/pageKit';
import { nm } from '../lib/format';
import type { Column, FieldDef } from '../types';

void activeCol;
const columns: Column[] = [
  textCol('name', 'Name', { accessor: (r) => nm(r) }),
  textCol('email', 'Email'),
  textCol('enrollmentNo', 'Enrollment no.'),
  textCol('course', 'Course'),
  refCol('hostel', 'Hostel'),
  { key: 'room', header: 'Room', accessor: (r) => roomNo(r) },
  statusCol(),
];

const fields: FieldDef[] = [
  { name: 'name', label: 'Full name', required: true, minLength: 2 },
  { name: 'email', label: 'Email', type: 'email', required: true, createOnly: true },
  { name: 'password', label: 'Initial password', type: 'password', required: true, createOnly: true, ...passwordRule },
  { name: 'phone', label: 'Phone', type: 'tel', ...phoneRule },
  { name: 'gender', label: 'Gender', type: 'select', options: GENDERS, hint: 'Used for hostel eligibility when allocating beds' },
  { name: 'dob', label: 'Date of birth', type: 'date', validate: (v) => (new Date(v) > new Date() ? 'Date of birth cannot be in the future' : undefined) },
  { name: 'enrollmentNo', label: 'Enrollment number' },
  { name: 'course', label: 'Course' },
  { name: 'year', label: 'Year of study', type: 'number', min: 1, max: 10, validate: intRule },
  { name: 'department', label: 'Department' },
  { name: 'status', label: 'Account status', type: 'select', options: STUDENT_STATUSES, editOnly: true, required: true },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'guardianName', label: 'Guardian name' },
  { name: 'guardianPhone', label: 'Guardian phone', type: 'tel', ...phoneRule },
  { name: 'guardianRelation', label: 'Guardian relation' },
  { name: 'emergencyContactName', label: 'Emergency contact name' },
  { name: 'emergencyContactPhone', label: 'Emergency contact phone', type: 'tel', ...phoneRule },
];

export default function Students() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Students" subtitle="Manage student accounts, profiles and status." entity="Student" endpoint="/api/students"
      columns={columns} fields={fields} filters={[enumFilter('status', 'Status', STUDENT_STATUSES), enumFilter('gender', 'Gender', GENDERS), hostel]}
      card={(r, actions) => <StudentCard s={r} actions={actions} />}
      deleteMessage={(r) => `This permanently deletes ${nm(r)} and their login. Students with allocation or payment history should be deactivated instead.`}
      rowActions={(r, reload) => r.status === 'INACTIVE' ? (
        <ConfirmButton label="" icon={<UserCheck className="h-4 w-4" />} title="Activate student?" message={`${nm(r)} will be able to sign in again.`} confirmLabel="Activate" danger={false}
          successMessage="Student activated" onConfirm={() => apiPatch(`/api/students/${r._id}`, { status: 'ACTIVE' })} onDone={reload} />
      ) : (
        <ConfirmButton label="" icon={<UserX className="h-4 w-4" />} title="Deactivate student?" message={`${nm(r)} will lose access until reactivated. Their records are kept.`} confirmLabel="Deactivate"
          successMessage="Student deactivated" onConfirm={() => apiPatch(`/api/students/${r._id}`, { status: 'INACTIVE' })} onDone={reload} />
      )} />
  );
}
