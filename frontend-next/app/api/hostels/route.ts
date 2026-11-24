import { handler, ok, parseBody, getPaging } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { hostelSchema } from '@/lib/validation';
import { HOSTEL_TYPES } from '@/lib/constants';
import { Hostel, Student, Warden } from '@/lib/models';
import { scoped, hostelScope, wardenHostelIds } from '@/lib/services/scope';
import { assertWithinPlan } from '@/lib/services/subscription';
import { bedStatsByHostel, emptyBedStats, syncHostelWardens } from '@/lib/services/hostels';
import { and, boolParam, enumParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN', 'WARDEN', 'STUDENT']);
  const { page, limit, skip } = getPaging(req, 50, 200);
  let filter: Record<string, any> = scoped(auth);
  const type = enumParam(req, 'type', HOSTEL_TYPES);
  if (type) filter.type = type;
  const active = boolParam(req, 'active');
  if (active !== undefined) filter.isActive = active;
  if (auth.role === 'WARDEN') filter._id = { $in: await wardenHostelIds(auth) };
  if (auth.role === 'STUDENT') filter.isActive = true; // students may browse active hostels (admission form)
  filter = and(filter, searchFilter(qp(req, 'q'), ['name', 'code', 'city']));

  const [items, total] = await Promise.all([Hostel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(), Hostel.countDocuments(filter)]);
  const stats = auth.role === 'STUDENT' ? {} : await bedStatsByHostel(auth.organizationId, items.map((h: any) => h._id));
  const data = items.map((h: any) => (auth.role === 'STUDENT' ? { _id: h._id, name: h.name, code: h.code, type: h.type, city: h.city, address: h.address, rules: h.rules } : { ...h, beds: stats[String(h._id)] ?? emptyBedStats }));
  return ok(data, { meta: { page, limit, total } });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const { wardenIds, ...body } = await parseBody(req, hostelSchema);
  await assertWithinPlan(auth.organizationId, 'hostels');
  const hostel: any = await Hostel.create({ ...body, organization: auth.organizationId });
  if (wardenIds?.length) await syncHostelWardens(auth.organizationId, String(hostel._id), wardenIds);
  await audit(auth, 'CREATE', 'Hostel', hostel._id, { name: hostel.name }, req);
  return ok(hostel, { status: 201 });
});
