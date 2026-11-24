import CrudPage from '../components/CrudPage';
import { HostelCard } from '../components/cards';
import { activeCol, enumCol, textCol } from '../lib/cols';
import { HOSTEL_TYPES, phoneRule } from '../lib/fields';
import { enumFilter, intRule } from '../lib/pageKit';
import type { Column, FieldDef, Row } from '../types';

const columns: Column[] = [
  textCol('name', 'Name'),
  textCol('code', 'Code'),
  { ...enumCol('type', 'Type') },
  textCol('city', 'City'),
  { key: 'beds', header: 'Beds (occupied / total)', accessor: (r) => (r.beds ? `${r.beds.occupied} / ${r.beds.total}` : '0 / 0') },
  textCol('contactPhone', 'Phone'),
  activeCol(),
];

const fields: FieldDef[] = [
  { name: 'name', label: 'Hostel name', required: true },
  { name: 'code', label: 'Code', required: true, hint: 'Short unique code, e.g. BH1 (stored in upper case)' },
  { name: 'type', label: 'Type', type: 'select', options: HOSTEL_TYPES, required: true },
  { name: 'city', label: 'City' },
  { name: 'contactPhone', label: 'Contact phone', type: 'tel', ...phoneRule },
  { name: 'capacity', label: 'Declared capacity', type: 'number', min: 0, max: 100000, validate: intRule, hint: 'Informational; bed counts come from rooms' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'rules', label: 'Hostel rules', type: 'textarea', hint: 'One rule per line' },
  { name: 'wardenIds', label: 'Wardens', type: 'multiselect', createOnly: true, remote: { endpoint: '/api/wardens', label: (w) => `${w.name} (${w.email})` }, hint: 'Optional. Warden assignments can be changed later from the Wardens page.' },
  { name: 'isActive', label: 'Active', type: 'checkbox', default: true, hint: 'Active (open for allocation)' },
];

export default function Hostels() {
  return (
    <CrudPage title="Hostels" subtitle="Hostels run by your organization, with live bed occupancy." entity="Hostel" endpoint="/api/hostels"
      columns={columns} fields={fields}
      filters={[enumFilter('type', 'Type', HOSTEL_TYPES), { key: 'active', label: 'Status', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], accessor: (r: Row) => (r.isActive === false ? 'Inactive' : 'Active') }]}
      card={(r, actions) => <HostelCard h={{ ...r, totalBeds: r.beds?.total, occupiedBeds: r.beds?.occupied }} actions={actions} />}
      transform={(p) => ({ ...p, rules: String(p.rules ?? '').split('\n').map((x) => x.trim()).filter(Boolean) })}
      deleteMessage={(r) => `Delete ${r.name}? Hostels with allocation history or buildings cannot be deleted; deactivate them instead.`} />
  );
}
