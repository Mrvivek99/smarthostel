import { ApiError } from '@/lib/api';
import { PLAN_CONFIG } from '@/lib/constants';
import { Hostel, Organization, Student, Subscription, Warden } from '@/lib/models';

type Resource = 'hostels' | 'students' | 'wardens';

export async function getLimits(orgId: string) {
  const sub: any = await Subscription.findOne({ organization: orgId, status: 'ACTIVE' }).lean();
  if (sub?.limits) return { plan: sub.plan as keyof typeof PLAN_CONFIG, ...sub.limits, endDate: sub.endDate as Date | undefined };
  const org: any = await Organization.findById(orgId).select('plan').lean();
  const plan = (org?.plan ?? 'STARTER') as keyof typeof PLAN_CONFIG;
  return { plan, ...PLAN_CONFIG[plan], endDate: undefined as Date | undefined };
}

export async function usage(orgId: string) {
  const [hostels, students, wardens] = await Promise.all([
    Hostel.countDocuments({ organization: orgId }),
    Student.countDocuments({ organization: orgId, status: { $ne: 'INACTIVE' } }),
    Warden.countDocuments({ organization: orgId }),
  ]);
  return { hostels, students, wardens };
}

/** Throws 402 when creating one more `resource` would exceed the organization's plan. */
export async function assertWithinPlan(orgId: string, resource: Resource): Promise<void> {
  const limits: any = await getLimits(orgId);
  if (limits.endDate && new Date(limits.endDate) < new Date())
    throw new ApiError(402, 'Your subscription has expired. Renew it to add more records.');
  const limit = limits[resource] as number;
  if (limit < 0) return;
  const u = await usage(orgId);
  if (u[resource] >= limit) throw new ApiError(402, `Plan limit reached: your ${limits.plan} plan allows ${limit} ${resource}. Upgrade to add more.`);
}

/** Switches an organization to a new plan (previous ACTIVE subscription is cancelled). Downgrades are checked against usage. */
export async function changePlan(orgId: string, by: string, plan: keyof typeof PLAN_CONFIG, durationMonths: number, customPrice?: number) {
  const cfg = PLAN_CONFIG[plan];
  const u = await usage(orgId);
  for (const r of ['hostels', 'students', 'wardens'] as Resource[]) {
    if (cfg[r] >= 0 && u[r] > cfg[r]) throw new ApiError(409, `Cannot move to ${plan}: you currently use ${u[r]} ${r} but the plan allows ${cfg[r]}`);
  }
  const price = plan === 'ENTERPRISE' ? customPrice ?? 0 : cfg.price;
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);
  await Subscription.updateMany({ organization: orgId, status: 'ACTIVE' }, { status: 'CANCELLED' });
  const sub = await Subscription.create({
    organization: orgId,
    plan,
    status: 'ACTIVE',
    pricePerMonth: price,
    startDate: start,
    endDate: end,
    limits: { hostels: cfg.hostels, students: cfg.students, wardens: cfg.wardens },
    billingHistory: [{ date: start, amount: price * durationMonths, reference: `SUB-${Date.now()}`, note: `${plan} x ${durationMonths} month(s) - invoice issued, settle offline` }],
    createdBy: by,
  });
  await Organization.updateOne({ _id: orgId }, { plan });
  return sub;
}
