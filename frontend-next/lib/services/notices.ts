import { Student, Warden } from '@/lib/models';
import type { AuthContext } from '@/lib/auth/guard';

/** Visibility filter for notices: audience by role, hostel by placement, not expired. */
export async function noticeVisibility(auth: AuthContext, includeExpired = false): Promise<Record<string, any>> {
  const and: Record<string, any>[] = [];
  if (auth.role !== 'ADMIN') {
    and.push({ audience: { $in: ['ALL', auth.role === 'STUDENT' ? 'STUDENTS' : 'WARDENS'] } });
    let hostels: unknown[] = [];
    if (auth.role === 'STUDENT') {
      const s: any = await Student.findOne({ organization: auth.organizationId, user: auth.userId }).select('hostel').lean();
      hostels = s?.hostel ? [s.hostel] : [];
    } else {
      const w: any = await Warden.findOne({ organization: auth.organizationId, user: auth.userId }).select('hostels').lean();
      hostels = w?.hostels ?? [];
    }
    and.push({ $or: [{ hostel: { $exists: false } }, { hostel: null }, { hostel: { $in: hostels } }] });
  }
  if (!includeExpired) and.push({ $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
  return and.length ? { $and: and } : {};
}
