import { handler, ok, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { ROLES } from '@/lib/constants';
import { User } from '@/lib/models';
import { and, boolParam, enumParam, idParam, qp, searchFilter } from '@/lib/crud';

/** Organization users (any role). SUPER_ADMIN lists platform-wide, optionally with ?organization=. */
export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['SUPER_ADMIN', 'ADMIN']);
  const filter: Record<string, any> = {};
  if (auth.role === 'ADMIN') {
    filter.organization = auth.organizationId;
    filter.role = { $ne: 'SUPER_ADMIN' };
  } else {
    const org = idParam(req, 'organization');
    if (org) filter.organization = org;
  }
  const role = enumParam(req, 'role', ROLES);
  if (role) {
    if (auth.role === 'ADMIN' && role === 'SUPER_ADMIN') throw new ApiError(403, 'You do not have permission to perform this action');
    filter.role = role;
  }
  const active = boolParam(req, 'active');
  if (active !== undefined) filter.isActive = active;
  return paginate(User, and(filter, searchFilter(qp(req, 'q') ?? qp(req, 'search'), ['name', 'email', 'phone'])), req, {
    sort: { name: 1 },
    select: 'name email role phone isActive emailVerified lastLoginAt organization createdAt',
  });
});
