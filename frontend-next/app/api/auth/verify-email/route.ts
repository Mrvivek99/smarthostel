import { NextRequest } from 'next/server';
import { handler, ok, ApiError } from '@/lib/api';
import { verifyEmailSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { sha256 } from '@/lib/auth/password';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/auth/guard';
import { sendVerificationEmail } from '@/lib/auth/respond';
import { audit } from '@/lib/audit';

async function confirm(req: NextRequest, token: string) {
  const user: any = await User.findOne({ emailVerifyTokenHash: sha256(token), emailVerifyExpires: { $gt: new Date() } }).select('+emailVerifyTokenHash +emailVerifyExpires');
  if (!user) throw new ApiError(400, 'This verification link is invalid or has expired');
  user.emailVerified = true;
  user.emailVerifyTokenHash = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  await audit({ userId: String(user._id), role: user.role, organizationId: user.organization ? String(user.organization) : '' }, 'EMAIL_VERIFIED', 'User', user._id, undefined, req);
  return ok({ verified: true });
}

/** POST { token } confirms the address; POST without a token (signed in) re-sends the verification mail. */
export const POST = handler(async (req) => {
  rateLimit(req, 'auth:verify-email', 20, 60 * 60 * 1000);
  const text = await req.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError(400, 'Request body must be valid JSON');
    }
  }
  const { token } = verifyEmailSchema.parse(json);
  if (token) return confirm(req, token);

  const auth = await requireAuth(req);
  const user: any = await User.findById(auth.userId).select('name email emailVerified');
  if (user.emailVerified) return ok({ verified: true, message: 'Email is already verified' });
  rateLimit(req, 'auth:verify-resend', 3, 60 * 60 * 1000, auth.userId);
  await sendVerificationEmail(user);
  return ok({ sent: true, message: 'Verification email sent' });
});

/** GET ?token= so the emailed link can be confirmed directly. */
export const GET = handler(async (req) => {
  rateLimit(req, 'auth:verify-email', 20, 60 * 60 * 1000);
  const token = verifyEmailSchema.parse({ token: req.nextUrl.searchParams.get('token') || undefined }).token;
  if (!token) throw new ApiError(400, 'Verification token is required');
  return confirm(req, token);
});
