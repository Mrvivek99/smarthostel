import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { ApiError } from '@/lib/api';
import { AUTH_COOKIE, Role } from '@/lib/constants';
import { verifyToken } from '@/lib/auth/token';
import { Organization, User } from '@/lib/models';

export interface AuthContext {
  userId: string;
  role: Role;
  /** Empty string for SUPER_ADMIN (platform level, no tenant). Always taken from the DB-backed session. */
  organizationId: string;
  name: string;
  email: string;
}

const orgStatusCache = new Map<string, { status: string; at: number }>();

async function orgIsActive(orgId: string): Promise<boolean> {
  const hit = orgStatusCache.get(orgId);
  if (hit && Date.now() - hit.at < 60_000) return hit.status === 'ACTIVE';
  const org: any = await Organization.findById(orgId).select('status').lean();
  const status = org?.status ?? 'MISSING';
  orgStatusCache.set(orgId, { status, at: Date.now() });
  return status === 'ACTIVE';
}

/** Validates a JWT and re-loads the user so deactivated accounts / changed roles take effect immediately. */
export async function authenticateToken(token: string | undefined | null): Promise<AuthContext | null> {
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || !mongoose.isValidObjectId(payload.sub)) return null;
  const user: any = await User.findById(payload.sub).select('name email role organization isActive').lean();
  if (!user || !user.isActive) return null;
  const organizationId = user.organization ? String(user.organization) : '';
  if (user.role !== 'SUPER_ADMIN') {
    if (!organizationId) return null;
    if (!(await orgIsActive(organizationId))) return null;
  }
  return { userId: String(user._id), role: user.role, organizationId, name: user.name, email: user.email };
}

export function extractToken(req: NextRequest): string | null {
  const bearer = req.headers.get('authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) return bearer.slice(7).trim();
  return req.cookies.get(AUTH_COOKIE)?.value ?? null;
}

/**
 * Authenticates the request (httpOnly cookie first, bearer fallback) and enforces role membership.
 * Tenant id comes from the session, never from the request.
 */
export async function requireAuth(req: NextRequest, roles?: Role[]): Promise<AuthContext> {
  const auth = await authenticateToken(extractToken(req));
  if (!auth) throw new ApiError(401, 'Authentication required');
  if (roles && !roles.includes(auth.role)) throw new ApiError(403, 'You do not have permission to perform this action');
  return auth;
}
