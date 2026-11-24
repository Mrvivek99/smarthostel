import { handler, ok, parseBody, ApiError, oid } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { organizationUpdateSchema } from '@/lib/validation';
import { Organization, Subscription, User } from '@/lib/models';
import { getLimits, usage } from '@/lib/services/subscription';
import { defined } from '@/lib/crud';
import { audit } from '@/lib/audit';

async function load(id: string) {
  const org = await Organization.findById(oid(id));
  if (!org) throw new ApiError(404, 'Organization not found');
  return org;
}

export const GET = handler(async (req, { params }) => {
  await requireAuth(req, ['SUPER_ADMIN']);
  const org = await load(params.id);
  const [used, limits, sub, admins] = await Promise.all([
    usage(String(org._id)),
    getLimits(String(org._id)),
    Subscription.findOne({ organization: org._id, status: 'ACTIVE' }).lean(),
    User.find({ organization: org._id, role: 'ADMIN' }).select('name email isActive lastLoginAt').lean(),
  ]);
  return ok({ ...org.toObject(), usage: used, limits: { hostels: limits.hostels, students: limits.students, wardens: limits.wardens }, subscription: sub, admins });
});

/** Edit details; status SUSPENDED blocks every user of the tenant (enforced in requireAuth, cached up to 60s). */
export const PATCH = handler(async (req, { params }) => {
  const auth = await requireAuth(req, ['SUPER_ADMIN']);
  const body = await parseBody(req, organizationUpdateSchema);
  const org = await load(params.id);
  org.set(defined(body));
  await org.save();
  await audit({ ...auth, organizationId: String(org._id) }, 'UPDATE', 'Organization', org._id, { fields: Object.keys(body) }, req);
  return ok(org);
});
