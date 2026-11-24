import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password';
import { Organization, User } from '@/lib/models';
import { issueSession, publicUser } from '@/lib/auth/respond';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  rateLimit(req, 'auth:login', 30, 15 * 60 * 1000);
  const body = await parseBody(req, loginSchema);
  rateLimit(req, 'auth:login-account', 8, 15 * 60 * 1000, body.email);

  const user: any = await User.findOne({ email: body.email }).select('+passwordHash');
  const valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new ApiError(401, 'Invalid email or password');
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated. Contact your administrator.');

  let org: any = null;
  if (user.role !== 'SUPER_ADMIN') {
    org = user.organization ? await Organization.findById(user.organization).lean() : null;
    if (!org || org.status !== 'ACTIVE') throw new ApiError(403, 'This organization is not active');
  }
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
  await audit({ userId: String(user._id), role: user.role, organizationId: user.organization ? String(user.organization) : '' }, 'LOGIN', 'User', user._id, undefined, req);

  const session = await issueSession(user);
  return session.setCookie(ok({ user: publicUser(user, org), token: session.token }));
});
