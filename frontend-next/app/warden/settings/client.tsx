'use client';
import { Building2 } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { ChangePasswordForm } from '@/components/cards/ChangePasswordForm';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async } from '@/components/ui/States';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt><dd className="mt-0.5 font-medium">{children}</dd></div>;
}

export function SettingsClient() {
  const me = useApi<any>('/api/auth/me');
  const u = me.data?.user;
  const w = me.data?.warden;
  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile and account security." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Profile">
          <Async loading={me.loading && !me.data} error={me.error} onRetry={me.reload} rows={3}>
            {u && (
              <dl className="space-y-4 p-5 text-sm">
                <Row label="Name">{w?.name ?? u.name}</Row>
                <Row label="Email">{u.email}</Row>
                <Row label="Phone">{w?.phone || u.phone || '-'}</Row>
                <Row label="Employee ID">{w?.employeeId || '-'}</Row>
                <Row label="Organisation">{u.organizationInfo?.name ?? '-'}</Row>
                <Row label="Assigned hostels">
                  {w?.hostels?.length ? (
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {w.hostels.map((h: any) => <li key={h._id} className="badge bg-brand-50 text-brand-700"><Building2 className="mr-1 h-3 w-3" />{h.name}{h.code ? ` (${h.code})` : ''}</li>)}
                    </ul>
                  ) : 'None assigned'}
                </Row>
                <p className="border-t border-navy-100 pt-3 text-xs text-navy-500">Contact your administrator to change profile details or hostel assignments.</p>
              </dl>
            )}
          </Async>
        </Section>
        <Section title="Change password"><ChangePasswordForm /></Section>
      </div>
    </>
  );
}
