import CrudPage from '../components/CrudPage';
import { clip, textCol, refCol } from '../lib/cols';
import { hostelField } from '../lib/fields';
import { useHostelFilter } from '../lib/pageKit';
import type { Column, FieldDef } from '../types';

const columns: Column[] = [
  textCol('name', 'Building'),
  textCol('code', 'Code'),
  refCol('hostel', 'Hostel'),
  { ...clip('description', 'Description', 80), sortable: false },
];

const fields: FieldDef[] = [
  { ...hostelField(true), createOnly: true },
  { name: 'name', label: 'Building name', required: true },
  { name: 'code', label: 'Code', hint: 'Optional short code (stored in upper case)' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export default function Buildings() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Buildings" subtitle="Blocks and wings inside each hostel." entity="Building" endpoint="/api/buildings"
      columns={columns} fields={fields} filters={[hostel]}
      deleteMessage={(r) => `Delete ${r.name} and its floors? Buildings that still contain rooms cannot be deleted.`} />
  );
}
