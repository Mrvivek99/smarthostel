'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { BadgeCheck, Camera, MailWarning } from 'lucide-react';
import { api, uploadFile } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { toInputDate } from '@/lib/format';
import { FormField, SelectField, TextareaField } from '@/components/ui/FormField';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async, Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { updateProfile, type ProfileState } from './actions';

const initial: ProfileState = { ok: false, message: '' };

function Save() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn-primary" disabled={pending}>{pending && <Spinner className="h-4 w-4" />} {pending ? 'Saving...' : 'Save changes'}</button>;
}

export function ProfileClient() {
  const me = useApi<any>('/api/auth/me');
  const toast = useToast();
  const [state, action] = useFormState(updateProfile, initial);
  const [uploading, setUploading] = useState(false);
  const [resending, setResending] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const shown = useRef<ProfileState | null>(null);

  useEffect(() => {
    if (!state.message || shown.current === state) return;
    shown.current = state;
    if (state.ok) {
      toast.success(state.message);
      me.reload();
    } else toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const user = me.data?.user;
  const s = me.data?.student ?? {};
  const e = state.errors ?? {};

  async function pickAvatar(f?: File) {
    if (!f) return;
    setUploading(true);
    try {
      const up = await uploadFile(f, 'avatars');
      await api.patch('/api/students/me', { avatarUrl: up.url });
      toast.success('Profile picture updated');
      me.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = '';
    }
  }

  async function resend() {
    setResending(true);
    try {
      await api.post('/api/auth/verify-email');
      toast.success('Verification email sent. Check your inbox.');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResending(false);
    }
  }

  const initials = (user?.name ?? '?').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <PageHeader title="My profile" subtitle="Keep your personal, guardian and emergency details up to date." />
      <Async loading={me.loading && !me.data} error={me.error} onRetry={me.reload} rows={6}>
        {me.data && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <Section className="p-6 text-center">
                <div className="relative mx-auto h-24 w-24">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="Profile" className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-100" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-navy-700 text-2xl font-bold text-white">{initials}</div>
                  )}
                  <button type="button" aria-label="Change profile picture" onClick={() => file.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow hover:bg-brand-700">
                    {uploading ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(ev) => pickAvatar(ev.target.files?.[0])} />
                </div>
                <h2 className="mt-3 text-lg font-semibold">{user?.name}</h2>
                <p className="text-sm text-navy-500">{user?.email}</p>
                <div className="mt-3 flex justify-center gap-2"><StatusBadge status={s.status} /></div>
              </Section>
              <Section title="Verification" className="p-0">
                <div className="space-y-3 p-5 text-sm">
                  {user?.emailVerified ? (
                    <p className="flex items-center gap-2 font-medium text-emerald-700"><BadgeCheck className="h-5 w-5" /> Email verified</p>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 font-medium text-amber-700"><MailWarning className="h-5 w-5" /> Email not verified</p>
                      <button className="btn-secondary btn-sm" onClick={resend} disabled={resending}>{resending && <Spinner className="h-3.5 w-3.5" />} Resend verification email</button>
                    </>
                  )}
                  <p className="text-navy-500">Student status: <span className="font-semibold">{(s.status ?? 'PENDING').toLowerCase()}</span>. Your warden activates your account after admission approval.</p>
                </div>
              </Section>
            </div>

            <form action={action} className="card space-y-6 p-5 sm:p-6 lg:col-span-2" noValidate key={s.updatedAt ?? 'form'}>
              <fieldset className="space-y-4">
                <legend className="mb-1 text-base font-semibold">Personal</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full name" name="name" required defaultValue={s.name ?? user?.name ?? ''} error={e.name} />
                  <FormField label="Phone" name="phone" type="tel" defaultValue={s.phone ?? ''} error={e.phone} />
                  <FormField label="Date of birth" name="dob" type="date" defaultValue={toInputDate(s.dob)} error={e.dob} />
                  <SelectField label="Gender" name="gender" defaultValue={s.gender ?? ''} placeholder="Select" error={e.gender} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
                </div>
                <TextareaField label="Address" name="address" rows={2} defaultValue={s.address ?? ''} error={e.address} />
              </fieldset>
              <fieldset className="space-y-4">
                <legend className="mb-1 text-base font-semibold">Academic</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Enrollment no." name="enrollmentNo" defaultValue={s.enrollmentNo ?? ''} error={e.enrollmentNo} />
                  <FormField label="Course" name="course" defaultValue={s.course ?? ''} error={e.course} />
                  <FormField label="Year" name="year" type="number" min={1} max={10} defaultValue={s.year ?? ''} error={e.year} />
                  <FormField label="Department" name="department" defaultValue={s.department ?? ''} error={e.department} />
                </div>
              </fieldset>
              <fieldset className="space-y-4">
                <legend className="mb-1 text-base font-semibold">Guardian and emergency contact</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Guardian name" name="guardianName" defaultValue={s.guardianName ?? ''} error={e.guardianName} />
                  <FormField label="Guardian phone" name="guardianPhone" type="tel" defaultValue={s.guardianPhone ?? ''} error={e.guardianPhone} />
                  <FormField label="Relation" name="guardianRelation" defaultValue={s.guardianRelation ?? ''} error={e.guardianRelation} />
                  <span className="hidden sm:block" />
                  <FormField label="Emergency contact name" name="emergencyContactName" defaultValue={s.emergencyContactName ?? ''} error={e.emergencyContactName} />
                  <FormField label="Emergency contact phone" name="emergencyContactPhone" type="tel" defaultValue={s.emergencyContactPhone ?? ''} error={e.emergencyContactPhone} />
                </div>
              </fieldset>
              <div className="flex justify-end"><Save /></div>
            </form>
          </div>
        )}
      </Async>
    </>
  );
}
