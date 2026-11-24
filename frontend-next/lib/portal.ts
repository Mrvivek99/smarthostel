import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth/session';
import type { AuthContext } from '@/lib/auth/guard';
import type { Role } from '@/lib/constants';

/**
 * Server-side session check for the student / warden portals.
 * - no/invalid session  -> /login
 * - another role        -> that role's own home (admins go to the admin SPA)
 */
export async function guardPortal(role: Extract<Role, 'STUDENT' | 'WARDEN'>): Promise<AuthContext> {
  let auth: AuthContext | null = null;
  try {
    auth = await getServerAuth();
  } catch (e) {
    console.error('[portal] session check failed:', e);
    redirect('/login?error=session');
  }
  if (!auth) redirect('/login');
  if (auth.role !== role) {
    if (auth.role === 'STUDENT') redirect('/student/dashboard');
    if (auth.role === 'WARDEN') redirect('/warden/dashboard');
    redirect(process.env.NEXT_PUBLIC_ADMIN_URL || '/login');
  }
  return auth;
}
