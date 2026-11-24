'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client';
import { registerSchema } from '@/lib/validation';
import { validate, compact, type FieldErrors } from '@/lib/forms';
import { FormField, SelectField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { AuthShell } from '@/components/site/AuthShell';

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ name: '', email: '', phone: '', gender: '', organizationCode: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const { confirm, ...body } = v;
    const parsed = validate(registerSchema, compact(body));
    const errs: FieldErrors = parsed.ok ? {} : { ...parsed.errors };
    if (confirm !== v.password) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/auth/register', parsed.ok ? parsed.data : body);
      toast.success('Account created! Check your email to verify your address.');
      router.replace('/student/dashboard');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && Object.keys(err.fields).length) setErrors(err.fields);
      setFormError(err instanceof ApiClientError ? err.message : 'Could not create your account.');
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Students register with their hostel organization code" footer={<>Already registered? <Link href="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <div role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>}
        <FormField label="Full name" autoComplete="name" required value={v.name} onChange={set('name')} error={errors.name} />
        <FormField label="Email" type="email" autoComplete="email" required value={v.email} onChange={set('email')} error={errors.email} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone" type="tel" autoComplete="tel" value={v.phone} onChange={set('phone')} error={errors.phone} />
          <SelectField label="Gender" required value={v.gender} onChange={set('gender')} placeholder="Select" error={errors.gender} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
        </div>
        <FormField label="Organization code" required value={v.organizationCode} onChange={set('organizationCode')} error={errors.organizationCode} hint="Ask your hostel office for this code" />
        <FormField label="Password" type="password" autoComplete="new-password" required value={v.password} onChange={set('password')} error={errors.password} hint="8+ characters with a letter and a number" />
        <FormField label="Confirm password" type="password" autoComplete="new-password" required value={v.confirm} onChange={set('confirm')} error={errors.confirm} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} {busy ? 'Creating account...' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
