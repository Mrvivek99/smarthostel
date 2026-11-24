import CrudPage from '../components/CrudPage';
import { refCol, textCol } from '../lib/cols';
import { hostelField } from '../lib/fields';
import { intRule, useHostelFilter } from '../lib/pageKit';
import { useNameMap } from '../hooks/useNameMap';
import type { Column, FieldDef } from '../types';

const fields: FieldDef[] = [
  { ...hostelField(true), createOnly: true },
  { name: 'building', label: 'Building', type: 'select', required: true, createOnly: true, remote: { endpoint: '/api/buildings', dependsOn: { field: 'hostel', param: 'hostel' }, label: (b) => b.name }, hint: 'Choose the hostel first' },
  { name: 'number', label: 'Floor number', type: 'number', required: true, min: -2, max: 100, validate: intRule, hint: '0 = ground floor, -1 = basement' },
  { name: 'label', label: 'Label', hint: 'Optional, e.g. "Ground floor"' },
];

export default function Floors() {
  const hostel = useHostelFilter();
  const hostelName = useNameMap('/api/hostels');
  const columns: Column[] = [
    { key: 'number', header: 'Floor', sortable: true, accessor: (r) => r.number },
    textCol('label', 'Label'),
    refCol('building', 'Building'),
    { key: 'hostel', header: 'Hostel', accessor: (r) => hostelName(r.hostel) },
  ];
  return (
    <CrudPage title="Floors" subtitle="Floors within each building." entity="Floor" endpoint="/api/floors"
      columns={columns} fields={fields} filters={[hostel]}
      deleteMessage={() => 'Delete this floor? Floors that still contain rooms cannot be deleted.'} />
  );
}
