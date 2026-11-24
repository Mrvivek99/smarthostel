import { handler, ok, parseBody } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { randomToken, sha256 } from '@/lib/auth/password';
import { User } from '@/lib/models';
import { appUrl } from '@/lib/env';
import { sendMail } from '@/lib/mailer';

const GENERIC = { message: 'If an account exists for that email, a reset link has been sent.' };

export const POST = handler(async (req) => {
  rateLimit(req, 'auth:forgot', 10, 60 * 60 * 1000);
  const { email } = await parseBody(req, forgotPasswordSchema);
  rateLimit(req, 'auth:forgot-account', 3, 60 * 60 * 1000, email);
  const user: any = await User.findOne({ email, isActive: true }).select('name email');
  if (user) {
    const token = randomToken(32);
    await User.updateOne({ _id: user._id }, { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) });
    await sendMail({
      to: user.email,
      subject: 'Reset your SmartHostel password',
      text: `Hi ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${appUrl()}/reset-password?token=${token}\n\nIf you did not request this, ignore this email.`,
    }).catch((e) => console.error('[forgot-password] mail failed', e));
  }
  // Same response whether or not the account exists (no user enumeration).
  return ok(GENERIC);
});
