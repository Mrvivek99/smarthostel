import { UserCheck, UserX } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ConfirmButton from '../components/ConfirmButton';
import { apiPatch } from '../lib/api';
import { listCol, textCol } from '../lib/cols';
import { passwordRule, phoneRule } from '../lib/fields';
import { StatusBadge } from '../components/States';
import type { Column, FieldDef, Row } from '../types';

const isActive = (r: Row) => r.user?.isActive !== false;

const columns: Column[] = [
  textCol('name', 'Name'),
  textCol('email', 'Email'),
  textCol('phone', 'Phone'),
  textCol('employeeId', 'Employee ID'),
  listCol('hostels', 'Hostels'),
  { key: 'active', header: 'Login', accessor: (r) => (isActive(r) ? 'Active' : 'Inactive'), render: (r) => <StatusBadge value={isActive(r)} /> },
  { key: 'lastLogin', header: 'Last login', accessor: (r) => (r.user?.lastLoginAt ? new Date(r.user.lastLoginAt).toLocaleString('en-IN') : '') },
];

const fields: FieldDef[] = [
  { name: 'name', label: 'Full name', required: true, minLength: 2 },
  { name: 'email', label: 'Email', type: 'email', required: true, createOnly: true },
  { name: 'password', label: 'Initial password', type: 'password', required: true, createOnly: true, ...passwordRule },
  { name: 'phone', label: 'Phone', type: 'tel', ...phoneRule },
  { name: 'employeeId', label: 'Employee ID' },
  { name: 'hostels', label: 'Assigned hostels', type: 'multiselect', remote: { endpoint: '/api/hostels', label: (h) => `${h.name}${h.code ? ` (${h.code})` : ''}` }, hint: 'Wardens only see data for these hostels.' },
];

export default function Wardens() {
  return (
    <CrudPage title="Wardens" subtitle="Manage hostel wardens and the hostels they are responsible for." entity="Warden" endpoint="/api/wardens"
      columns={columns} fields={fields}
      filters={[{ key: 'active', label: 'Login', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], accessor: (r) => (isActive(r) ? 'Active' : 'Inactive') }]}
      deleteMessage={(r) => `This removes ${r.name}'s warden profile and deactivates their login.`}
      rowActions={(r, reload) => isActive(r) ? (
        <ConfirmButton label="Deactivate" icon={<UserX className="h-3.5 w-3.5" />} title="Deactivate warden?" message={`${r.name} will no longer be able to sign in.`} confirmLabel="Deactivate"
          successMessage="Warden deactivated" onConfirm={() => apiPatch(`/api/wardens/${r._id}`, { isActive: false })} onDone={reload} />
      ) : (
        <ConfirmButton label="Activate" icon={<UserCheck className="h-3.5 w-3.5" />} title="Activate warden?" message={`${r.name} will be able to sign in again.`} confirmLabel="Activate" danger={false}
          successMessage="Warden activated" onConfirm={() => apiPatch(`/api/wardens/${r._id}`, { isActive: true })} onDone={reload} />
      )} />
  );
}
