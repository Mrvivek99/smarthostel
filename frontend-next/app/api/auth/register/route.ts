import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { registerSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { hashPassword } from '@/lib/auth/password';
import { Organization, Student, User } from '@/lib/models';
import { assertWithinPlan } from '@/lib/services/subscription';
import { audit } from '@/lib/audit';
import { issueSession, publicUser, sendVerificationEmail } from '@/lib/auth/respond';

/** Student self-registration into an organization identified by its code (slug). */
export const POST = handler(async (req) => {
  rateLimit(req, 'auth:register', 10, 60 * 60 * 1000);
  const body = await parseBody(req, registerSchema);
  const org: any = await Organization.findOne({ slug: body.organizationCode, status: 'ACTIVE' }).lean();
  if (!org) throw new ApiError(404, 'Organization code not found');
  await assertWithinPlan(String(org._id), 'students');
  if (await User.exists({ email: body.email })) throw new ApiError(409, 'An account with this email already exists');

  const user: any = await User.create({
    organization: org._id,
    name: body.name,
    email: body.email,
    passwordHash: await hashPassword(body.password),
    role: 'STUDENT',
    phone: body.phone,
  });
  try {
    await Student.create({ organization: org._id, user: user._id, name: body.name, email: body.email, phone: body.phone, gender: body.gender, status: 'PENDING' });
  } catch (e) {
    await User.deleteOne({ _id: user._id });
    throw e;
  }
  await sendVerificationEmail(user).catch((e) => console.error('[register] verification mail failed', e));
  await audit({ userId: String(user._id), role: 'STUDENT', organizationId: String(org._id) }, 'REGISTER', 'User', user._id, undefined, req);

  const session = await issueSession(user);
  return session.setCookie(ok({ user: publicUser(user, org), token: session.token }, { status: 201 }));
});
