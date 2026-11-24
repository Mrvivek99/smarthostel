import { handler, ok, parseBody, getPaging, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { subscriptionSchema } from '@/lib/validation';
import { PLAN_CONFIG } from '@/lib/constants';
import { Organization, Subscription } from '@/lib/models';
import { changePlan, getLimits, usage } from '@/lib/services/subscription';
import { idParam } from '@/lib/crud';
import { audit } from '@/lib/audit';

const daysLeft = (end?: Date) => (end ? Math.ceil((new Date(end).getTime() - Date.now()) / 86400000) : undefined);

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['SUPER_ADMIN', 'ADMIN']);
  if (auth.role === 'SUPER_ADMIN') {
    const { page, limit, skip } = getPaging(req, 20, 100);
    const org = idParam(req, 'organization');
    const f: Record<string, any> = org ? { organization: org } : {};
    const [items, total] = await Promise.all([
      Subscription.find(f).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('organization', 'name slug status').lean(),
      Subscription.countDocuments(f),
    ]);
    return ok(items, { meta: { page, limit, total } });
  }
  const orgId = auth.organizationId;
  const [current, history, limits, used] = await Promise.all([
    Subscription.findOne({ organization: orgId, status: 'ACTIVE' }).lean() as Promise<any>,
    Subscription.find({ organization: orgId }).sort({ createdAt: -1 }).limit(50).lean(),
    getLimits(orgId),
    usage(orgId),
  ]);
  const remaining = daysLeft(current?.endDate);
  return ok({
    current,
    plan: limits.plan,
    limits: { hostels: limits.hostels, students: limits.students, wardens: limits.wardens },
    usage: used,
    daysRemaining: remaining,
    expired: remaining !== undefined && remaining < 0,
    expiringSoon: remaining !== undefined && remaining >= 0 && remaining <= 14,
    history,
    plans: PLAN_CONFIG,
  });
});

/** Upgrade / downgrade / renew. Org admins pick STARTER..PROFESSIONAL; ENTERPRISE and custom pricing are SUPER_ADMIN only. */
export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['SUPER_ADMIN', 'ADMIN']);
  const body = await parseBody(req, subscriptionSchema);
  let orgId = auth.organizationId;
  if (auth.role === 'SUPER_ADMIN') {
    if (!body.organization) throw new ApiError(400, 'organization is required');
    if (!(await Organization.exists({ _id: body.organization }))) throw new ApiError(404, 'Organization not found');
    orgId = body.organization;
  } else if (body.plan === 'ENTERPRISE') {
    throw new ApiError(403, 'Enterprise plans are arranged with the platform owner');
  }
  const sub: any = await changePlan(orgId, auth.userId, body.plan, body.durationMonths, auth.role === 'SUPER_ADMIN' ? body.customPrice : undefined);
  await audit({ ...auth, organizationId: orgId }, 'CHANGE_PLAN', 'Subscription', sub._id, { plan: body.plan, months: body.durationMonths }, req);
  return ok(sub, { status: 201 });
});
