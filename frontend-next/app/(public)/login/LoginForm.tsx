'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { api, ApiClientError } from '@/lib/client';
import { loginSchema } from '@/lib/validation';
import { validate, type FieldErrors } from '@/lib/forms';
import { ROLE_HOME } from '@/lib/constants';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { AuthShell } from '@/components/site/AuthShell';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sp.get('expired')) toast.info('Your session has expired. Please log in again.');
    if (sp.get('error') === 'session') toast.error('We could not verify your session. Please log in again.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const v = validate(loginSchema, { email, password });
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      const { data } = await api.post<{ user: { role: string; name: string }; token: string }>('/api/auth/login', { email: v.data.email, password });
      const role = data.user.role;
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      if (ROLE_HOME[role]) {
        const next = sp.get('next');
        router.replace(next && next.startsWith('/') && !next.startsWith('//') && next.startsWith(role === 'WARDEN' ? '/warden' : '/student') ? next : ROLE_HOME[role]);
        router.refresh();
      } else {
        // ADMIN / SUPER_ADMIN: hand the session to the admin app. The token travels in the URL fragment,
        // which is never sent to a server, so it works even when browsers block cross-site cookies.
        const admin = (process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:5173').replace(/\/$/, '');
        window.location.assign(`${admin}/admin/sso#token=${encodeURIComponent(data.token)}`);
        return;
      }
    } catch (err) {
      const m = err instanceof ApiClientError ? err.message : 'Could not log in. Please try again.';
      setFormError(m);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="One login for students, wardens and administrators" footer={<>New student? <Link href="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <div role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{formError}</div>}
        <FormField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <div>
          <div className="relative">
            <FormField label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
            <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] text-navy-400 hover:text-navy-700">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1.5 text-right"><Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">Forgot password?</Link></div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} {busy ? 'Logging in...' : 'Log in'}</button>
      </form>
    </AuthShell>
  );
}
