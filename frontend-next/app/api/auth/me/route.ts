import { handler, ok } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { Organization, Student, User, Warden } from '@/lib/models';
import { publicUser } from '@/lib/auth/respond';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req);
  const [user, org, student, warden] = await Promise.all([
    User.findById(auth.userId).lean(),
    auth.organizationId ? Organization.findById(auth.organizationId).lean() : null,
    auth.role === 'STUDENT'
      ? Student.findOne({ organization: auth.organizationId, user: auth.userId })
          .populate('hostel', 'name code type')
          .populate('room', 'roomNumber type')
          .populate('bed', 'bedNumber')
          .lean()
      : null,
    auth.role === 'WARDEN' ? Warden.findOne({ organization: auth.organizationId, user: auth.userId }).populate('hostels', 'name code type').lean() : null,
  ]);
  return ok({ user: publicUser(user, org), student: student ?? undefined, warden: warden ?? undefined });
});
