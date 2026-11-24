import CrudPage from '../components/CrudPage';
import { BedCard } from '../components/cards';
import { refCol, statusCol, textCol } from '../lib/cols';
import { opts } from '../lib/fields';
import { enumFilter, roomLabel, useHostelFilter } from '../lib/pageKit';
import type { Column, FieldDef } from '../types';

const BED_STATUSES = opts('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
const EDITABLE_STATUSES = opts('AVAILABLE', 'MAINTENANCE');

const columns: Column[] = [
  textCol('bedNumber', 'Bed'),
  { key: 'room', header: 'Room', accessor: (r) => (r.room?.roomNumber ? `Room ${r.room.roomNumber}` : '') },
  { key: 'building', header: 'Building', accessor: (r) => r.room?.building?.name ?? '' },
  { key: 'floor', header: 'Floor', accessor: (r) => (r.room?.floor?.number != null ? `Floor ${r.room.floor.number}` : '') },
  refCol('hostel', 'Hostel'),
  statusCol(),
];

const fields: FieldDef[] = [
  { name: 'room', label: 'Room', type: 'select', required: true, createOnly: true, remote: { endpoint: '/api/rooms', label: roomLabel }, hint: 'Beds can be added until the room capacity is reached' },
  { name: 'bedNumber', label: 'Bed number', createOnly: true, hint: 'Optional. Leave blank to use the next number (B1, B2, ...)' },
  { name: 'status', label: 'Status', type: 'select', options: EDITABLE_STATUSES, editOnly: true, required: true, hint: 'Only vacant beds can be toggled between available and maintenance' },
];

export default function Beds() {
  const hostel = useHostelFilter();
  const vacant = (r: { status?: string }) => r.status !== 'OCCUPIED';
  return (
    <CrudPage title="Beds" subtitle="Every bed with its current status. Occupied status is managed by allocations." entity="Bed" endpoint="/api/beds"
      columns={columns} fields={fields} canEdit={vacant} canDelete={vacant}
      filters={[hostel, enumFilter('status', 'Status', BED_STATUSES)]}
      card={(r, actions) => <BedCard b={r} actions={actions} />}
      deleteMessage={(r) => `Delete bed ${r.bedNumber}? Beds with allocation history cannot be deleted; mark them under maintenance instead.`} />
  );
}
