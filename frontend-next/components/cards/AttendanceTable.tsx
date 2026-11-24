import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/ui/States';

/** Compact per-day attendance list; `date` is a YYYY-MM-DD string. */
export function AttendanceTable({ rows }: { rows: { _id?: string; date: string; status: string; remarks?: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-left text-sm">
        <thead>
          <tr className="border-b border-navy-100 bg-navy-50/60 text-xs uppercase tracking-wide text-navy-500">
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Day</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100/70">
          {rows.map((r) => (
            <tr key={r._id ?? r.date}>
              <td className="px-4 py-2.5">{formatDate(r.date)}</td>
              <td className="px-4 py-2.5 text-navy-500">{new Date(r.date + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' })}</td>
              <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-2.5 text-navy-500">{r.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
