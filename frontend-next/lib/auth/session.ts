import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { AUTH_COOKIE, Role } from '@/lib/constants';
import { authenticateToken, AuthContext } from '@/lib/auth/guard';

/** For Server Components and Server Actions. */
export async function getServerAuth(): Promise<AuthContext | null> {
  await connectDB();
  const token = cookies().get(AUTH_COOKIE)?.value;
  return authenticateToken(token);
}

export async function requireServerAuth(role: Role): Promise<AuthContext> {
  const auth = await getServerAuth();
  if (!auth || auth.role !== role) redirect('/login');
  return auth;
}
