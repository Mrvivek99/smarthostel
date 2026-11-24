import { handler, ok, parseBody, paginate, ApiError } from '@/lib/api';
import { requireAuth } from '@/lib/auth/guard';
import { wardenCreateSchema } from '@/lib/validation';
import { Hostel, User, Warden } from '@/lib/models';
import { hashPassword } from '@/lib/auth/password';
import { scoped } from '@/lib/services/scope';
import { assertWithinPlan } from '@/lib/services/subscription';
import { and, assertRefs, idParam, qp, searchFilter } from '@/lib/crud';
import { audit } from '@/lib/audit';

export const GET = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const filter: Record<string, any> = scoped(auth);
  const hostel = idParam(req, 'hostel');
  if (hostel) filter.hostels = hostel;
  return paginate(Warden, and(filter, searchFilter(qp(req, 'q'), ['name', 'email', 'employeeId'])), req, {
    sort: { name: 1 },
    populate: [{ path: 'hostels', select: 'name code' }, { path: 'user', select: 'isActive lastLoginAt' }],
  });
});

export const POST = handler(async (req) => {
  const auth = await requireAuth(req, ['ADMIN']);
  const body = await parseBody(req, wardenCreateSchema);
  for (const h of body.hostels) await assertRefs(auth, [[Hostel, h, 'Hostel']]);
  await assertWithinPlan(auth.organizationId, 'wardens');
  if (await User.exists({ email: body.email })) throw new ApiError(409, 'An account with this email already exists');
  const user: any = await User.create({
    organization: auth.organizationId,
    name: body.name,
    email: body.email,
    passwordHash: await hashPassword(body.password),
    role: 'WARDEN',
    phone: body.phone,
    emailVerified: true,
  });
  try {
    const warden = await Warden.create({ organization: auth.organizationId, user: user._id, name: body.name, email: body.email, phone: body.phone, employeeId: body.employeeId, hostels: body.hostels });
    await audit(auth, 'CREATE', 'Warden', warden._id, { email: body.email }, req);
    return ok(warden, { status: 201 });
  } catch (e) {
    await User.deleteOne({ _id: user._id });
    throw e;
  }
});
