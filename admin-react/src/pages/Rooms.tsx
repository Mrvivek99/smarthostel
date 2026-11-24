import CrudPage from '../components/CrudPage';
import { RoomCard } from '../components/cards';
import { enumCol, listCol, moneyCol, refCol, statusCol, textCol } from '../lib/cols';
import { hostelField, ROOM_STATUSES, ROOM_TYPES } from '../lib/fields';
import { enumFilter, useHostelFilter } from '../lib/pageKit';
import type { Column, FieldDef } from '../types';

const columns: Column[] = [
  textCol('roomNumber', 'Room'),
  refCol('hostel', 'Hostel'),
  refCol('building', 'Building'),
  { key: 'floor', header: 'Floor', accessor: (r) => (r.floor?.number != null ? `Floor ${r.floor.number}` : '') },
  enumCol('type', 'Type'),
  { key: 'beds', header: 'Occupied / capacity', accessor: (r) => `${r.beds?.occupied ?? 0} / ${r.capacity ?? 0}` },
  moneyCol('monthlyRent', 'Monthly rent'),
  listCol('amenities', 'Amenities'),
  statusCol(),
];

const fields: FieldDef[] = [
  { ...hostelField(true), createOnly: true },
  { name: 'building', label: 'Building', type: 'select', required: true, createOnly: true, remote: { endpoint: '/api/buildings', dependsOn: { field: 'hostel', param: 'hostel' }, label: (b) => b.name }, hint: 'Choose the hostel first' },
  { name: 'floor', label: 'Floor', type: 'select', required: true, createOnly: true, remote: { endpoint: '/api/floors', dependsOn: { field: 'building', param: 'building' }, label: (f) => `Floor ${f.number}${f.label ? ` · ${f.label}` : ''}` }, hint: 'Choose the building first' },
  { name: 'roomNumber', label: 'Room number', required: true },
  { name: 'type', label: 'Room type', type: 'select', options: ROOM_TYPES, required: true, hint: 'Single = 1 bed, Double = 2 beds, Shared = 3 to 12 beds' },
  {
    name: 'capacity', label: 'Capacity (shared rooms only)', type: 'number', hint: 'Shared rooms hold 3 to 12 beds (defaults to 3). Ignored for single and double rooms.',
    validate: (v, all) => (all.type === 'SHARED' && (!Number.isInteger(Number(v)) || Number(v) < 3 || Number(v) > 12) ? 'Shared rooms hold 3 to 12 beds' : undefined),
  },
  { name: 'monthlyRent', label: 'Monthly rent (₹)', type: 'number', min: 0, max: 10000000 },
  { name: 'amenities', label: 'Amenities', hint: 'Comma separated, e.g. AC, Attached bathroom, Balcony', wide: true },
  { name: 'status', label: 'Status', type: 'select', options: ROOM_STATUSES, default: 'ACTIVE', hint: 'A room with occupants cannot be put under maintenance' },
  { name: 'createBeds', label: 'Create beds', type: 'checkbox', createOnly: true, default: true, hint: 'Automatically create one bed per unit of capacity' },
];

export default function Rooms() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Rooms" subtitle="Rooms across your hostels, with bed occupancy." entity="Room" endpoint="/api/rooms"
      columns={columns} fields={fields} filters={[hostel, enumFilter('type', 'Type', ROOM_TYPES), enumFilter('status', 'Status', ROOM_STATUSES)]}
      card={(r, actions) => <RoomCard r={{ ...r, occupiedBeds: r.beds?.occupied ?? 0 }} actions={actions} />}
      transform={(p) => {
        const out: Record<string, any> = { ...p, amenities: String(p.amenities ?? '').split(',').map((x) => x.trim()).filter(Boolean) };
        if (out.type !== 'SHARED') delete out.capacity;
        return out;
      }}
      deleteMessage={(r) => `Delete room ${r.roomNumber} and its beds? Occupied rooms and rooms with allocation history cannot be deleted; mark them under maintenance instead.`} />
  );
}
