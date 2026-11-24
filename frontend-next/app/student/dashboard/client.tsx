'use client';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Bed, CalendarCheck, Megaphone, Wallet } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { attendanceSummary } from '@/lib/forms';
import { formatDate, formatINR, monthIST, nameOf } from '@/lib/format';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async, StatusBadge } from '@/components/ui/States';

const OPEN_COMPLAINT = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'];

export function StudentDashboard() {
  const month = monthIST();
  const me = useApi<any>('/api/auth/me');
  const fees = useApi<any[]>('/api/fees', { limit: 100 });
  const att = useApi<any[]>('/api/attendance', { month, limit: 100 });
  const complaints = useApi<any[]>('/api/complaints', { limit: 100 });
  const notices = useApi<any[]>('/api/notices', { limit: 4 });

  const student = me.data?.student;
  const dues = (fees.data ?? []).filter((f) => f.status !== 'PAID' && f.status !== 'CANCELLED');
  const totalDue = dues.reduce((s, f) => s + (f.balance ?? Math.max(0, f.amount - (f.paidAmount ?? 0))), 0);
  const sum = attendanceSummary((att.data ?? []).filter((r) => String(r.date).startsWith(month)));
  const open = (complaints.data ?? []).filter((c) => OPEN_COMPLAINT.includes(c.status)).length;
  const firstName = (me.data?.user?.name ?? '').split(' ')[0];

  return (
    <>
      <PageHeader title={firstName ? `Hello, ${firstName}` : 'Dashboard'} subtitle="Here is what is happening with your hostel stay." />

      {student && student.status === 'PENDING' && !student.bed && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-brand-800">Complete your hostel admission</p>
            <p className="text-sm text-brand-700">Submit your application so the warden can review it and allocate a bed.</p>
          </div>
          <Link href="/student/admission" className="btn-primary">Start application <ArrowRight className="h-4 w-4" /></Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My room" icon={Bed} loading={me.loading} value={student?.room ? `${nameOf(student.room, 'roomNumber')}` : 'Not allocated'} hint={student?.bed ? `Bed ${nameOf(student.bed, 'bedNumber')} · ${nameOf(student.hostel)}` : undefined} />
        <StatCard label="Pending dues" icon={Wallet} tone={totalDue > 0 ? 'amber' : 'green'} loading={fees.loading} value={formatINR(totalDue)} hint={`${dues.length} open fee${dues.length === 1 ? '' : 's'}`} />
        <StatCard label="Attendance this month" icon={CalendarCheck} tone="green" loading={att.loading} value={sum.percent === null ? '-' : `${sum.percent}%`} hint={`${sum.present} present · ${sum.absent} absent`} />
        <StatCard label="Open complaints" icon={AlertTriangle} tone={open ? 'red' : 'navy'} loading={complaints.loading} value={open} hint="Awaiting resolution" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Upcoming dues" actions={<Link href="/student/fees" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>}>
          <Async loading={fees.loading} error={fees.error} empty={dues.length === 0} emptyTitle="No pending fees" emptyMessage="You are all paid up." onRetry={fees.reload} rows={3}>
            <ul className="divide-y divide-navy-100">
              {dues.slice(0, 4).map((f) => (
                <li key={f._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{f.title}</p>
                    <p className={`text-xs ${f.overdue ? 'text-red-600' : 'text-navy-400'}`}>{f.overdue ? 'Overdue since ' : 'Due '}{formatDate(f.dueDate)}</p>
                  </div>
                  <span className="text-sm font-bold">{formatINR(f.balance ?? f.amount)}</span>
                </li>
              ))}
            </ul>
          </Async>
        </Section>

        <Section title="Latest notices" actions={<Link href="/student/notices" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>}>
          <Async loading={notices.loading} error={notices.error} empty={!notices.data?.length} emptyTitle="No notices" emptyMessage="Announcements from your warden will appear here." onRetry={notices.reload} rows={3}>
            <ul className="divide-y divide-navy-100">
              {(notices.data ?? []).map((n) => (
                <li key={n._id} className="flex gap-3 px-5 py-3">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <p className="line-clamp-1 text-xs text-navy-500">{n.body}</p>
                  </div>
                  {n.priority && n.priority !== 'MEDIUM' && <span className="ml-auto"><StatusBadge status={n.priority} /></span>}
                </li>
              ))}
            </ul>
          </Async>
        </Section>
      </div>
    </>
  );
}
