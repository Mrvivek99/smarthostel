'use client';
import Link from 'next/link';
import { AlertTriangle, Bed, Building2, CalendarCheck, Plane, Users } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { useWardenHostels } from '@/lib/useWardenHostels';
import { formatDateTime, titleCase, todayIST } from '@/lib/format';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async, EmptyState, StatusBadge } from '@/components/ui/States';

export function WardenDashboard() {
  const { me, hostels, hostel, setHostel } = useWardenHostels();
  const today = todayIST();
  const h = hostel || null;
  const hostelInfo = useApi<any[]>(h ? '/api/hostels' : null, { limit: 50 });
  const students = useApi<any[]>(h ? '/api/students' : null, { hostel: h, limit: 1 });
  const att = useApi<any[]>(h ? '/api/attendance' : null, { hostel: h, date: today, limit: 1 });
  const submitted = useApi<any[]>(h ? '/api/complaints' : null, { hostel: h, status: 'SUBMITTED', limit: 5 });
  const assigned = useApi<any[]>(h ? '/api/complaints' : null, { hostel: h, status: 'ASSIGNED', limit: 1 });
  const progress = useApi<any[]>(h ? '/api/complaints' : null, { hostel: h, status: 'IN_PROGRESS', limit: 1 });
  const leave = useApi<any[]>(h ? '/api/leave' : null, { hostel: h, status: 'PENDING', limit: 5 });
  const visitors = useApi<any[]>(h ? '/api/visitors' : null, { hostel: h, inside: true, limit: 1 });

  const info = (hostelInfo.data ?? []).find((x) => String(x._id) === h);
  const beds = info?.beds ?? { total: 0, occupied: 0, available: 0 };
  const sum = att.meta?.summary as { present: number; absent: number; onLeave: number; total: number } | undefined;
  const openComplaints = (submitted.meta?.total ?? 0) + (assigned.meta?.total ?? 0) + (progress.meta?.total ?? 0);
  const complaintsLoading = submitted.loading || assigned.loading || progress.loading;
  const marked = sum?.total ?? 0;
  const totalStudents = students.meta?.total ?? 0;

  const selector = hostels.length > 1 ? (
    <select aria-label="Select hostel" className="input w-auto" value={hostel} onChange={(e) => setHostel(e.target.value)}>
      {hostels.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
    </select>
  ) : undefined;

  if (me.loading && !me.data) return <><PageHeader title="Dashboard" /><div className="card"><Async loading error={null} rows={4}><span /></Async></div></>;
  if (me.error) return <><PageHeader title="Dashboard" /><div className="card"><Async loading={false} error={me.error} onRetry={me.reload}><span /></Async></div></>;
  if (!hostels.length) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="card"><EmptyState title="No hostel assigned" message="You have not been assigned to a hostel yet. Ask your administrator to assign one." icon={<Building2 className="h-6 w-6" />} /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Hello, ${(me.data?.user?.name ?? '').split(' ')[0] || 'Warden'}`} subtitle={info ? `${info.name} (${info.code}) · ${titleCase(info.type)}${info.city ? ` · ${info.city}` : ''}` : 'Overview of your hostel today.'} actions={selector} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" icon={Users} loading={students.loading && !students.data} value={totalStudents} hint="Currently allocated" />
        <StatCard label="Beds occupied" icon={Bed} tone="navy" loading={hostelInfo.loading && !hostelInfo.data} value={`${beds.occupied} / ${beds.total}`} hint={`${beds.available} available${beds.maintenance ? ` · ${beds.maintenance} in maintenance` : ''}`} />
        <StatCard label="Today's attendance" icon={CalendarCheck} tone="green" loading={att.loading && !att.data} value={marked ? `${sum?.present ?? 0} present` : 'Not marked'} hint={marked ? `${sum?.absent ?? 0} absent · ${sum?.onLeave ?? 0} on leave` : 'Mark today from Attendance'} />
        <StatCard label="Pending leave" icon={Plane} tone={leave.meta?.total ? 'amber' : 'navy'} loading={leave.loading && !leave.data} value={leave.meta?.total ?? 0} hint="Awaiting your decision" />
        <StatCard label="Open complaints" icon={AlertTriangle} tone={openComplaints ? 'red' : 'navy'} loading={complaintsLoading && !submitted.data} value={openComplaints} hint={`${submitted.meta?.total ?? 0} new · ${progress.meta?.total ?? 0} in progress`} />
        <StatCard label="Visitors inside" icon={Building2} loading={visitors.loading && !visitors.data} value={visitors.meta?.total ?? 0} hint="Not yet checked out" />
        <StatCard label="Available beds" icon={Bed} tone="green" loading={hostelInfo.loading && !hostelInfo.data} value={beds.available} hint={`Hostel capacity ${info?.capacity ?? beds.total}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="New complaints" actions={<Link href="/warden/complaints" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>}>
          <Async loading={submitted.loading && !submitted.data} error={submitted.error} empty={!submitted.data?.length} emptyTitle="No new complaints" emptyMessage="Everything raised has been picked up." onRetry={submitted.reload} rows={3}>
            <ul className="divide-y divide-navy-100">
              {(submitted.data ?? []).map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-navy-400">{c.student?.name ?? 'Student'} · {formatDateTime(c.createdAt)}</p>
                  </div>
                  <StatusBadge status={c.priority} />
                </li>
              ))}
            </ul>
          </Async>
        </Section>

        <Section title="Pending leave requests" actions={<Link href="/warden/leave" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>}>
          <Async loading={leave.loading && !leave.data} error={leave.error} empty={!leave.data?.length} emptyTitle="No pending requests" emptyMessage="You are all caught up." onRetry={leave.reload} rows={3}>
            <ul className="divide-y divide-navy-100">
              {(leave.data ?? []).map((l) => (
                <li key={l._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{l.student?.name ?? 'Student'}</p>
                    <p className="line-clamp-1 text-xs text-navy-500">{l.reason}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          </Async>
        </Section>
      </div>
    </>
  );
}
