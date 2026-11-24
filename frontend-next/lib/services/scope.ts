import mongoose from 'mongoose';
import { ApiError } from '@/lib/api';
import { Student, Warden } from '@/lib/models';
import type { AuthContext } from '@/lib/auth/guard';

export const toOid = (id: string) => new mongoose.Types.ObjectId(id);

/** Tenant filter: organization always from the session. */
export function scoped(auth: AuthContext, filter: Record<string, any> = {}): Record<string, any> {
  if (!auth.organizationId) throw new ApiError(403, 'This action requires an organization context');
  return { ...filter, organization: auth.organizationId };
}

export async function wardenHostelIds(auth: AuthContext): Promise<string[]> {
  const w: any = await Warden.findOne({ organization: auth.organizationId, user: auth.userId }).select('hostels').lean();
  return (w?.hostels ?? []).map(String);
}

/** Adds the hostel restriction for wardens (hostel field filter); admins are unrestricted. */
export async function hostelScope(auth: AuthContext, filter: Record<string, any>, field = 'hostel'): Promise<Record<string, any>> {
  if (auth.role !== 'WARDEN') return filter;
  const ids = await wardenHostelIds(auth);
  const requested = filter[field];
  if (requested) {
    if (!ids.includes(String(requested))) throw new ApiError(403, 'You are not assigned to this hostel');
    return filter;
  }
  return { ...filter, [field]: { $in: ids } };
}

export async function assertHostelAccess(auth: AuthContext, hostelId: unknown): Promise<void> {
  if (auth.role !== 'WARDEN') return;
  const ids = await wardenHostelIds(auth);
  if (!hostelId || !ids.includes(String(hostelId))) throw new ApiError(403, 'You are not assigned to this hostel');
}

export async function studentOf(auth: AuthContext): Promise<any> {
  const s = await Student.findOne({ organization: auth.organizationId, user: auth.userId });
  if (!s) throw new ApiError(404, 'Student profile not found');
  return s;
}
