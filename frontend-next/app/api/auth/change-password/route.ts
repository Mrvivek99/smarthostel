import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { changePasswordSchema } from '@/lib/validation';
import { requireAuth } from '@/lib/auth/guard';
import { rateLimit } from '@/lib/rateLimit';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { User } from '@/lib/models';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  const auth = await requireAuth(req);
  rateLimit(req, 'auth:change-password', 10, 60 * 60 * 1000, auth.userId);
  const body = await parseBody(req, changePasswordSchema);
  const user: any = await User.findById(auth.userId).select('+passwordHash');
  if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) throw new ApiError(400, 'Current password is incorrect');
  if (body.currentPassword === body.newPassword) throw new ApiError(400, 'New password must be different from the current one');
  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  await audit(auth, 'PASSWORD_CHANGE', 'User', user._id, undefined, req);
  return ok({ message: 'Password changed' });
});
