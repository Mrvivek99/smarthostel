import { handler, ok, parseBody, ApiError } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { hashPassword, sha256 } from '@/lib/auth/password';
import { User } from '@/lib/models';
import { audit } from '@/lib/audit';

export const POST = handler(async (req) => {
  rateLimit(req, 'auth:reset', 10, 60 * 60 * 1000);
  const body = await parseBody(req, resetPasswordSchema);
  const user: any = await User.findOne({ resetTokenHash: sha256(body.token), resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires');
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired');
  user.passwordHash = await hashPassword(body.password);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  await audit({ userId: String(user._id), role: user.role, organizationId: user.organization ? String(user.organization) : '' }, 'PASSWORD_RESET', 'User', user._id, undefined, req);
  return ok({ message: 'Password updated. You can now sign in.' });
});
