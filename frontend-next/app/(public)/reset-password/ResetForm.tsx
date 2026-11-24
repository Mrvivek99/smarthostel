'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiClientError } from '@/lib/client';
import { resetPasswordSchema } from '@/lib/validation';
import { validate, type FieldErrors } from '@/lib/forms';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { AuthShell } from '@/components/site/AuthShell';

export function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(resetPasswordSchema, { token, password });
    const errs: FieldErrors = v.ok ? {} : { ...v.errors };
    if (confirm !== password) errs.confirm = 'Passwords do not match';
    if (errs.token) errs.password = errs.password ?? 'This reset link is invalid. Request a new one.';
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      toast.success('Password updated. You can now log in.');
      router.replace('/login');
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" footer={<Link href="/forgot-password" className="font-semibold text-brand-600 hover:underline">Request a new link</Link>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="8+ characters with a letter and a number" />
        <FormField label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Update password</button>
      </form>
    </AuthShell>
  );
}
