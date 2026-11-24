import { User, Warden } from '@/lib/models';

/** User ids of the active organization admins. */
export async function adminUserIds(orgId: string): Promise<string[]> {
  const rows: any[] = await User.find({ organization: orgId, role: 'ADMIN', isActive: true }).select('_id').lean();
  return rows.map((r) => String(r._id));
}

/** User ids of the wardens assigned to a hostel. */
export async function wardenUserIds(orgId: string, hostelId: unknown): Promise<string[]> {
  if (!hostelId) return [];
  const rows: any[] = await Warden.find({ organization: orgId, hostels: hostelId }).select('user').lean();
  return rows.map((r) => String(r.user));
}
