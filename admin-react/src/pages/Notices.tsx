import CrudPage from '../components/CrudPage';
import { dateCol, enumCol, statusCol, textCol } from '../lib/cols';
import { NOTICE_AUDIENCES, PRIORITIES } from '../lib/fields';
import { fmtDateTime, label } from '../lib/format';
import { enumFilter, useHostelFilter } from '../lib/pageKit';
import { StatusBadge } from '../components/States';
import type { Column, FieldDef } from '../types';

const columns: Column[] = [
  { key: 'title', header: 'Title', sortable: true, accessor: (r) => r.title },
  enumCol('audience', 'Audience'),
  { key: 'hostel', header: 'Hostel', accessor: (r) => label(r.hostel) || 'All hostels' },
  statusCol('priority', 'Priority'),
  { key: 'pinned', header: 'Pinned', accessor: (r) => (r.pinned ? 'Yes' : 'No') },
  textCol('authorName', 'Author'),
  dateCol('publishedAt', 'Published'),
  { key: 'expiresAt', header: 'Expires', accessor: (r) => (r.expiresAt ? fmtDateTime(r.expiresAt) : 'Never'), render: (r) => (r.expiresAt && new Date(r.expiresAt) < new Date() ? <StatusBadge value="EXPIRED" /> : <span>{r.expiresAt ? fmtDateTime(r.expiresAt) : 'Never'}</span>) },
  { key: 'readCount', header: 'Read by', accessor: (r) => r.readCount ?? 0 },
];

const fields: FieldDef[] = [
  { name: 'title', label: 'Title', required: true, minLength: 3, wide: true },
  { name: 'body', label: 'Message', type: 'textarea', required: true, minLength: 3 },
  { name: 'audience', label: 'Audience', type: 'select', options: NOTICE_AUDIENCES, required: true, default: 'ALL' },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, required: true, default: 'MEDIUM' },
  { name: 'hostel', label: 'Hostel', type: 'select', remote: { endpoint: '/api/hostels', label: (h) => h.name }, hint: 'Leave blank to notify every hostel (cannot be cleared once set)' },
  { name: 'expiresAt', label: 'Expires at', type: 'datetime', hint: 'Optional. The notice is hidden from students after this time.' },
  { name: 'pinned', label: 'Pinned', type: 'checkbox', default: false, hint: 'Pin to the top of the notice board' },
];

export default function Notices() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Notices" subtitle="Publish announcements to students and wardens. Recipients are notified immediately." entity="Notice" endpoint="/api/notices" params={{ includeExpired: true }}
      columns={columns} fields={fields} filters={[enumFilter('audience', 'Audience', NOTICE_AUDIENCES), enumFilter('priority', 'Priority', PRIORITIES), hostel]}
      emptyDescription="Publish your first announcement."
      deleteMessage={(r) => `Delete "${r.title}"? It disappears from the notice board for everyone.`} />
  );
}
