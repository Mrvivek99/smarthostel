import { Wrench } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ActionDialog from '../components/ActionDialog';
import { enumCol, statusCol, textCol } from '../lib/cols';
import { CONDITIONS, hostelField, INVENTORY_CATEGORIES } from '../lib/fields';
import { label } from '../lib/format';
import { enumFilter, intRule, useHostelFilter } from '../lib/pageKit';
import { apiPatch } from '../lib/api';
import type { Column, FieldDef } from '../types';

const columns: Column[] = [
  textCol('name', 'Item'),
  enumCol('category', 'Category'),
  { key: 'hostel', header: 'Hostel', accessor: (r) => label(r.hostel) },
  { key: 'assignedRoom', header: 'Room', accessor: (r) => (r.assignedRoom?.roomNumber ? `Room ${r.assignedRoom.roomNumber}` : '') },
  { key: 'quantity', header: 'Qty', sortable: true, accessor: (r) => r.quantity },
  statusCol('condition', 'Condition'),
  { key: 'maintenance', header: 'Maintenance jobs', accessor: (r) => (r.maintenanceLog ?? []).length },
  { key: 'notes', header: 'Notes', accessor: (r) => r.notes ?? '', className: 'max-w-xs truncate' },
];

const fields: FieldDef[] = [
  { ...hostelField(true), hint: 'An item cannot be moved to another hostel after it is created' },
  { name: 'name', label: 'Item name', required: true },
  { name: 'category', label: 'Category', type: 'select', options: INVENTORY_CATEGORIES, required: true },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0, max: 100000, validate: intRule },
  { name: 'condition', label: 'Condition', type: 'select', options: CONDITIONS, default: 'GOOD' },
  { name: 'assignedRoom', label: 'Assigned room', type: 'select', remote: { endpoint: '/api/rooms', dependsOn: { field: 'hostel', param: 'hostel' }, label: (r) => `Room ${r.roomNumber}${r.building?.name ? ` · ${r.building.name}` : ''}` }, hint: 'Optional. Must be in the selected hostel.' },
  { name: 'notes', label: 'Notes', type: 'textarea', validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
];

const maintenanceFields: FieldDef[] = [
  { name: 'note', label: 'What was done', type: 'textarea', required: true, validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
  { name: 'cost', label: 'Cost (₹)', type: 'number', min: 0, hint: 'Optional' },
];

export default function Inventory() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Inventory" subtitle="Furniture and equipment across your hostels." entity="Item" endpoint="/api/inventory"
      columns={columns} fields={fields} filters={[hostel, enumFilter('category', 'Category', INVENTORY_CATEGORIES), enumFilter('condition', 'Condition', CONDITIONS)]}
      emptyDescription="Add items to track quantities, condition and maintenance."
      summary={(rows) => rows.length ? <p className="text-sm text-slate-500 mb-3">{rows.length} item types · {rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0).toLocaleString('en-IN')} units in total</p> : null}
      rowActions={(r, reload) => (
        <ActionDialog label="Maintenance" icon={<Wrench className="h-3.5 w-3.5" />} title={`Log maintenance: ${r.name}`} subtitle={r.maintenanceLog?.length ? `${r.maintenanceLog.length} previous job(s) logged` : undefined}
          fields={maintenanceFields} submitLabel="Log maintenance" successMessage="Maintenance logged"
          onSubmit={(p) => apiPatch(`/api/inventory/${r._id}`, { maintenance: { note: p.note, ...(p.cost !== undefined ? { cost: p.cost } : {}) } })} onDone={reload} />
      )} />
  );
}
