'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { api, ApiClientError } from '@/lib/client';
import { forgotPasswordSchema } from '@/lib/validation';
import { validate } from '@/lib/forms';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { AuthShell } from '@/components/site/AuthShell';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate(forgotPasswordSchema, { email });
    if (!v.ok) return setError(v.errors.email ?? 'Invalid email');
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post<{ message: string }>('/api/auth/forgot-password', { email: v.data.email });
      setDone(data.message);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Forgot password" subtitle="We will email you a reset link" footer={<Link href="/login" className="font-semibold text-brand-600 hover:underline">Back to log in</Link>}>
      {done ? (
        <div role="status" className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="mt-3 text-sm text-navy-600">{done}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Send reset link</button>
        </form>
      )}
    </AuthShell>
  );
}
