import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/env';
import type { Role } from '@/lib/constants';

// Edge-runtime safe (used by middleware): only depends on `jose`.
export interface TokenPayload {
  sub: string;
  role: Role;
  org: string;
}

export async function signToken(p: TokenPayload): Promise<string> {
  return new SignJWT({ role: p.role, org: p.org })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(p.sub)
    .setIssuedAt()
    .setIssuer('smarthostel')
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: 'smarthostel', algorithms: ['HS256'] });
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as Role, org: String(payload.org ?? '') };
  } catch {
    return null;
  }
}

export function cookieOptions() {
  const prod = process.env.NODE_ENV === 'production';
  const forced = (process.env.COOKIE_SAMESITE || '').toLowerCase();
  let sameSite: 'lax' | 'strict' | 'none' = prod && process.env.ADMIN_ORIGIN ? 'none' : 'lax';
  if (forced === 'lax' || forced === 'strict' || forced === 'none') sameSite = forced;
  return {
    httpOnly: true,
    secure: prod || sameSite === 'none',
    sameSite,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  } as const;
}
