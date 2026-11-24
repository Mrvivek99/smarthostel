'use client';
import Link from 'next/link';
import { MailCheck, MailWarning } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { nameOf } from '@/lib/format';
import { ChangePasswordForm } from '@/components/cards/ChangePasswordForm';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async, Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

export function SettingsClient() {
  const me = useApi<any>('/api/auth/me');
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const u = me.data?.user;
  const s = me.data?.student;

  async function resend() {
    setSending(true);
    try {
      await api.post('/api/auth/verify-email');
      toast.success('Verification email sent. Check your inbox.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Account, security and support." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Account">
          <Async loading={me.loading && !me.data} error={me.error} onRetry={me.reload} rows={3}>
            {u && (
              <dl className="space-y-4 p-5 text-sm">
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Name</dt><dd className="mt-0.5 font-medium">{u.name}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Email</dt><dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium">{u.email}{u.emailVerified ? <span className="badge bg-emerald-50 text-emerald-700"><MailCheck className="mr-1 h-3 w-3" />Verified</span> : <span className="badge bg-amber-50 text-amber-700"><MailWarning className="mr-1 h-3 w-3" />Not verified</span>}</dd></div>
                {!u.emailVerified && <button className="btn-secondary btn-sm" onClick={resend} disabled={sending}>{sending && <Spinner className="h-3.5 w-3.5" />} Resend verification email</button>}
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Organisation</dt><dd className="mt-0.5 font-medium">{u.organizationInfo?.name ?? '-'}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Hostel</dt><dd className="mt-0.5 font-medium">{s?.hostel ? nameOf(s.hostel) : 'Not allocated'}</dd></div>
                <div><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Student status</dt><dd className="mt-1"><StatusBadge status={s?.status} /></dd></div>
                <p className="border-t border-navy-100 pt-3 text-xs text-navy-500">Update your personal details on the <Link href="/student/profile" className="font-semibold text-brand-600 hover:underline">Profile</Link> page.</p>
              </dl>
            )}
          </Async>
        </Section>

        <div className="space-y-6">
          <Section title="Change password"><ChangePasswordForm /></Section>
          <Section title="Contact your warden">
            <div className="space-y-3 p-5 text-sm text-navy-600">
              <p>Need help with your room, fees or a personal matter? Raise a complaint so your warden is notified and you can track the reply, or write to the SmartHostel team.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/student/complaints" className="btn-primary btn-sm">Raise a complaint</Link>
                <Link href="/contact" className="btn-secondary btn-sm">Contact the SmartHostel team</Link>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
