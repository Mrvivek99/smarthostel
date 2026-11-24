'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { api, ApiClientError } from '@/lib/client';
import { Spinner } from '@/components/ui/States';
import { AuthShell } from '@/components/site/AuthShell';

export function VerifyEmail() {
  const token = useSearchParams().get('token');
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'error'; message: string }>({ status: token ? 'loading' : 'error', message: token ? '' : 'This verification link is missing its token.' });

  useEffect(() => {
    if (!token) return;
    api.post<{ message?: string }>('/api/auth/verify-email', { token })
      .then((r) => setState({ status: 'ok', message: r.data?.message ?? 'Your email address is verified.' }))
      .catch((e) => setState({ status: 'error', message: e instanceof ApiClientError ? e.message : 'Verification failed.' }));
  }, [token]);

  return (
    <AuthShell title="Email verification" footer={<Link href="/login" className="font-semibold text-brand-600 hover:underline">Go to log in</Link>}>
      <div className="flex flex-col items-center text-center" role="status">
        {state.status === 'loading' && <><Spinner className="h-10 w-10 text-brand-600" /><p className="mt-3 text-sm text-navy-500">Verifying...</p></>}
        {state.status === 'ok' && <><CheckCircle2 className="h-12 w-12 text-emerald-500" /><p className="mt-3 text-sm text-navy-600">{state.message}</p></>}
        {state.status === 'error' && <><AlertCircle className="h-12 w-12 text-red-500" /><p className="mt-3 text-sm text-navy-600">{state.message}</p></>}
      </div>
    </AuthShell>
  );
}
