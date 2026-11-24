import type { Row } from '../types';
import { nm } from '../lib/format';

export const ATTENDANCE_STATUSES = [
  { value: 'PRESENT', label: 'Present', cls: 'peer-checked:bg-emerald-600 peer-checked:text-white' },
  { value: 'ABSENT', label: 'Absent', cls: 'peer-checked:bg-rose-600 peer-checked:text-white' },
  { value: 'ON_LEAVE', label: 'On leave', cls: 'peer-checked:bg-amber-500 peer-checked:text-white' },
] as const;

interface Props { students: Row[]; marks: Record<string, string>; onChange: (studentId: string, status: string) => void }

export default function AttendanceTable({ students, marks, onChange }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50/70"><tr><th className="th">Student</th><th className="th">Room</th><th className="th">Status</th></tr></thead>
        <tbody className="divide-y divide-slate-50">
          {students.map((s) => (
            <tr key={s._id} className="hover:bg-slate-50/60">
              <td className="td"><p className="font-medium text-slate-800">{nm(s)}</p><p className="text-xs text-slate-400">{s.rollNumber ?? s.email}</p></td>
              <td className="td text-slate-500">{s.room?.roomNumber ? `Room ${s.room.roomNumber}` : s.roomNumber ?? '—'}</td>
              <td className="td">
                <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden" role="radiogroup" aria-label={`Attendance for ${nm(s)}`}>
                  {ATTENDANCE_STATUSES.map((o) => (
                    <label key={o.value} className="cursor-pointer">
                      <input type="radio" className="peer sr-only" name={`att-${s._id}`} checked={marks[s._id] === o.value} onChange={() => onChange(s._id, o.value)} />
                      <span className={`block px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 ${o.cls}`}>{o.label}</span>
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
