'use client';
import { useState } from 'react';
import { CalendarCheck, CalendarX, Percent, Plane } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { formatDate, monthIST } from '@/lib/format';
import { AttendanceTable } from '@/components/cards/AttendanceTable';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async } from '@/components/ui/States';

const CELL: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800',
  ABSENT: 'bg-red-100 text-red-800',
  ON_LEAVE: 'bg-sky-100 text-sky-800',
};

export function AttendanceClient() {
  const [month, setMonth] = useState(monthIST());
  const list = useApi<any[]>('/api/attendance', { month, limit: 500 });
  const absences = useApi<any[]>('/api/attendance', { status: 'ABSENT', limit: 20 });
  const rows = (list.data ?? []).filter((r) => String(r.date).startsWith(month)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const s = list.meta?.summary as { present: number; absent: number; onLeave: number; total: number; percentage: number } | undefined;

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const byDay = new Map(rows.map((r) => [Number(String(r.date).slice(8, 10)), r.status as string]));

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Your daily and monthly attendance."
        actions={<input type="month" aria-label="Select month" className="input w-auto" value={month} max={monthIST()} onChange={(e) => e.target.value && setMonth(e.target.value)} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance" icon={Percent} loading={list.loading && !list.data} value={s && s.present + s.absent > 0 ? `${s.percentage}%` : '-'} hint="On-leave days are excused" />
        <StatCard label="Present" icon={CalendarCheck} tone="green" loading={list.loading && !list.data} value={s?.present ?? 0} />
        <StatCard label="Absent" icon={CalendarX} tone="red" loading={list.loading && !list.data} value={s?.absent ?? 0} />
        <StatCard label="On leave" icon={Plane} tone="navy" loading={list.loading && !list.data} value={s?.onLeave ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Section title="Monthly view" className="lg:col-span-2">
          <div className="p-5">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase text-navy-400">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5" aria-label="Attendance calendar">
              {Array.from({ length: firstDow }).map((_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const st = byDay.get(i + 1);
                return <span key={i} title={st ? st.replace('_', ' ').toLowerCase() : 'Not marked'} className={`flex aspect-square items-center justify-center rounded-lg text-xs font-medium ${st ? CELL[st] : 'bg-navy-50 text-navy-400'}`}>{i + 1}</span>;
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-navy-500">
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-200" /> Present</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-red-200" /> Absent</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-sky-200" /> On leave</span>
            </div>
          </div>
        </Section>

        <Section title="Daily records" className="lg:col-span-3">
          <Async loading={list.loading && !list.data} error={list.error} empty={rows.length === 0} emptyTitle="No records this month" emptyMessage="Attendance marked by your warden will show here." onRetry={list.reload} rows={5}>
            <div className="max-h-[420px] overflow-y-auto"><AttendanceTable rows={rows} /></div>
          </Async>
        </Section>
      </div>

      <Section title="Recent absences" className="mt-6">
        <Async loading={absences.loading && !absences.data} error={absences.error} empty={!absences.data?.length} emptyTitle="No absences recorded" emptyMessage="Great, you have no absence records." onRetry={absences.reload} rows={3}>
          <ul className="divide-y divide-navy-100">
            {(absences.data ?? []).map((a) => (
              <li key={a._id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="font-medium">{formatDate(a.date)}</span>
                <span className="text-navy-500">{a.remarks || 'No remarks'}</span>
              </li>
            ))}
          </ul>
        </Async>
      </Section>
    </>
  );
}
