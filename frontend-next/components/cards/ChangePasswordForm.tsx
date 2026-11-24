'use client';
import { useState } from 'react';
import { api, ApiClientError } from '@/lib/client';
import { changePasswordSchema } from '@/lib/validation';
import { validate, type FieldErrors } from '@/lib/forms';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

export function ChangePasswordForm() {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(changePasswordSchema, { currentPassword: f.currentPassword, newPassword: f.newPassword });
    const errs: FieldErrors = v.ok ? {} : { ...v.errors };
    if (f.confirm !== f.newPassword) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) return setErrors(errs);
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: f.currentPassword, newPassword: f.newPassword });
      toast.success('Password changed successfully');
      setF({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      if (err instanceof ApiClientError && /current password/i.test(err.message)) setErrors({ currentPassword: err.message });
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-5" noValidate>
      <FormField label="Current password" type="password" autoComplete="current-password" required value={f.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
      <FormField label="New password" type="password" autoComplete="new-password" required value={f.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="At least 8 characters with a letter and a number" />
      <FormField label="Confirm new password" type="password" autoComplete="new-password" required value={f.confirm} onChange={set('confirm')} error={errors.confirm} />
      <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} {busy ? 'Updating...' : 'Update password'}</button>
    </form>
  );
}
