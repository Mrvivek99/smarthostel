import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { organizationCreateSchema } from '@/lib/validation';
import { Organization, User } from '@/lib/models';
import { hashPassword } from '@/lib/auth/password';
import { changePlan } from '@/lib/services/subscription';
import { and, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  await requireAuth(req, ['SUPER_ADMIN']);
  const filter: Record<string, any> = {};
  const status = qp(req, 'status');
  if (status === 'ACTIVE' || status === 'SUSPENDED') filter.status = status;
  return paginate(Organization, and(filter, searchFilter(qp(req, 'q'), ['name', 'slug', 'email'])), req, { sort: { createdAt: -1 } });
});

/** Onboards a new tenant: organization, its first ADMIN user and an initial 1-month subscription. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['SUPER_ADMIN']);
  const { adminName, adminEmail, adminPassword, plan, ...orgData } = await parseBody(req, organizationCreateSchema);
  if (await User.exists({ email: adminEmail })) throw new ApiError(409, 'An account with this email already exists');
  const org: any = await Organization.create({ ...orgData, plan });
  try {
    await User.create({ organization: org._id, name: adminName, email: adminEmail, passwordHash: await hashPassword(adminPassword), role: 'ADMIN', emailVerified: true });
    await changePlan(String(org._id), auth.userId, plan, 1);
  } catch (e) {
    await User.deleteMany({ organization: org._id });
    await Organization.deleteOne({ _id: org._id });
    throw e;
  }
  await audit({ ...auth, organizationId: String(org._id) }, 'CREATE', 'Organization', org._id, { slug: org.slug, plan }, req);
  return ok(org, { status: 201 });
});
