import { useMemo, useState } from 'react';
import { ArrowRightLeft, LogOut, Sparkles } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ActionDialog from '../components/ActionDialog';
import ConfirmButton from '../components/ConfirmButton';
import Modal from '../components/Modal';
import { LoadingState } from '../components/States';
import { apiGet, apiPatch, apiPost, errMsg } from '../lib/api';
import { dateCol, statusCol, textCol } from '../lib/cols';
import { opts, ROOM_TYPES } from '../lib/fields';
import { bedLabel, nm, titleCase } from '../lib/format';
import { enumFilter, studentLabel, useHostelFilter } from '../lib/pageKit';
import { useList } from '../hooks/useList';
import type { Column, FieldDef, Row } from '../types';

const ALLOCATION_STATUSES = opts('ACTIVE', 'CHECKED_OUT', 'TRANSFERRED');

const columns: Column[] = [
  { key: 'student', header: 'Student', accessor: (r) => nm(r.student) },
  { key: 'enrollmentNo', header: 'Enrollment no.', accessor: (r) => r.student?.enrollmentNo ?? '' },
  { key: 'hostel', header: 'Hostel', accessor: (r) => r.hostel?.name ?? '' },
  { key: 'room', header: 'Room', accessor: (r) => (r.room?.roomNumber ? `Room ${r.room.roomNumber}` : '') },
  { key: 'bed', header: 'Bed', accessor: (r) => r.bed?.bedNumber ?? '' },
  dateCol('checkInDate', 'Check-in'),
  dateCol('checkOutDate', 'Check-out'),
  statusCol(),
  textCol('remarks', 'Remarks'),
];

const allocateFields: FieldDef[] = [
  { name: 'student', label: 'Student', type: 'select', required: true, remote: { endpoint: '/api/students', params: { status: 'ACTIVE' }, filter: (s) => !s.bed, label: studentLabel }, hint: 'Only active students without a bed are listed. Gender must match the hostel type.' },
  { name: 'bed', label: 'Bed', type: 'select', required: true, remote: { endpoint: '/api/beds', params: { status: 'AVAILABLE' }, label: bedLabel } },
  { name: 'remarks', label: 'Remarks', type: 'textarea', validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
];

const checkoutFields: FieldDef[] = [
  { name: 'remarks', label: 'Remarks', type: 'textarea', validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
];
const transferFields: FieldDef[] = [
  { name: 'bed', label: 'New bed', type: 'select', required: true, remote: { endpoint: '/api/beds', params: { status: 'AVAILABLE' }, label: bedLabel } },
  ...checkoutFields,
];

interface Candidate { bedId: string; roomId: string; hostelId: string; roomType: string; occupied: number; capacity: number; floorNumber: number; bedNumber: string; roomNumber: string; hostelName: string; score: number }

function SuggestDialog({ open, onClose, onAllocated }: { open: boolean; onClose: () => void; onAllocated: () => void }) {
  const students = useList(open ? '/api/students' : null, { status: 'ACTIVE' });
  const hostels = useList(open ? '/api/hostels' : null);
  const [student, setStudent] = useState('');
  const [hostel, setHostel] = useState('');
  const [roomType, setRoomType] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Candidate[] | null>(null);
  const unallocated = useMemo(() => students.items.filter((s) => !s.bed), [students.items]);

  const search = async () => {
    setBusy(true); setErr(null); setResults(null);
    try {
      const params: Row = { student, limit: 10 };
      if (hostel) params.hostel = hostel;
      if (roomType) params.roomType = roomType;
      setResults(await apiGet<Candidate[]>('/api/allocations/suggest', params));
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Suggest beds" subtitle="Ranks free beds by preference, filling partly used rooms first and respecting hostel gender rules." size="lg">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="sg-student">Student <span className="text-rose-500">*</span></label>
          <select id="sg-student" className="input" value={student} onChange={(e) => { setStudent(e.target.value); setResults(null); }} disabled={students.loading}>
            <option value="">{students.loading ? 'Loading…' : 'Select student…'}</option>
            {unallocated.map((s) => <option key={s._id} value={s._id}>{studentLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="sg-hostel">Preferred hostel</label>
          <select id="sg-hostel" className="input" value={hostel} onChange={(e) => setHostel(e.target.value)}>
            <option value="">Any</option>
            {hostels.items.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="sg-type">Preferred room type</label>
          <select id="sg-type" className="input" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            <option value="">Any</option>
            {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex items-end"><button className="btn-primary w-full" disabled={!student || busy} onClick={search}><Sparkles className="h-4 w-4" />{busy ? 'Searching…' : 'Find beds'}</button></div>
      </div>
      {err && <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm px-3 py-2" role="alert">{err}</div>}
      {busy && <LoadingState text="Ranking beds…" />}
      {results && (
        <div className="mt-5">
          {results.length === 0 ? <p className="text-sm text-slate-500">No eligible free beds were found for this student.</p> : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/70"><tr><th className="th">Hostel</th><th className="th">Room</th><th className="th">Bed</th><th className="th">Type</th><th className="th">Room fill</th><th className="th">Score</th><th className="th" /></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {results.map((c) => (
                    <tr key={c.bedId}>
                      <td className="td">{c.hostelName}</td>
                      <td className="td">Room {c.roomNumber} <span className="text-xs text-slate-400">(floor {c.floorNumber})</span></td>
                      <td className="td">{c.bedNumber}</td>
                      <td className="td">{titleCase(c.roomType)}</td>
                      <td className="td">{c.occupied} / {c.capacity}</td>
                      <td className="td">{c.score}</td>
                      <td className="td text-right">
                        <ConfirmButton label="Allocate" variant="primary" danger={false} title="Allocate this bed?" message={`Allocate room ${c.roomNumber}, bed ${c.bedNumber} (${c.hostelName}) to the selected student.`}
                          successMessage="Bed allocated" onConfirm={() => apiPost('/api/allocations', { student, bed: c.bedId })} onDone={() => { onAllocated(); onClose(); }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function Allocations() {
  const hostel = useHostelFilter();
  const [suggest, setSuggest] = useState(false);
  const [version, setVersion] = useState(0);
  const filters = useMemo(() => [enumFilter('status', 'Status', ALLOCATION_STATUSES), hostel], [hostel]);
  return (
    <>
      <CrudPage key={version} title="Allocations" subtitle="Assign students to beds, transfer them, or check them out." entity="Allocation" endpoint="/api/allocations"
        columns={columns} fields={allocateFields} filters={filters} canEdit={false} canDelete={false}
        headerActions={<button className="btn-secondary" onClick={() => setSuggest(true)}><Sparkles className="h-4 w-4" /> Suggest beds</button>}
        emptyDescription="Allocate a bed to an approved student to get started."
        rowActions={(r, reload) => r.status !== 'ACTIVE' ? null : (
          <>
            <ActionDialog label="Transfer" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} title={`Transfer ${nm(r.student)}`} subtitle="Releases the current bed and occupies the new one in a single step."
              fields={transferFields} submitLabel="Transfer" successMessage="Student transferred" onSubmit={(p) => apiPatchAction(r._id, { action: 'transfer', ...p })} onDone={reload} />
            <ActionDialog label="Check out" icon={<LogOut className="h-3.5 w-3.5" />} variant="danger" title={`Check out ${nm(r.student)}`} subtitle="Frees the bed and ends this allocation."
              fields={checkoutFields} submitLabel="Check out" successMessage="Student checked out" onSubmit={(p) => apiPatchAction(r._id, { action: 'checkout', ...p })} onDone={reload} />
          </>
        )} />
      <SuggestDialog open={suggest} onClose={() => setSuggest(false)} onAllocated={() => setVersion((v) => v + 1)} />
    </>
  );
}

const apiPatchAction = (id: string, body: Row) => apiPatch(`/api/allocations/${id}`, body);
