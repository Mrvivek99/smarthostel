import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/constants';
import { cookieOptions, signToken } from '@/lib/auth/token';
import { appUrl } from '@/lib/env';
import { randomToken, sha256 } from '@/lib/auth/password';
import { sendMail } from '@/lib/mailer';
import { User } from '@/lib/models';

export function publicUser(u: any, org?: any) {
  return {
    _id: String(u._id),
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    emailVerified: Boolean(u.emailVerified),
    organization: u.organization ? String(u.organization) : undefined,
    organizationId: u.organization ? String(u.organization) : undefined,
    ...(org ? { organizationInfo: { _id: String(org._id), name: org.name, slug: org.slug, logoUrl: org.logoUrl, brandColor: org.brandColor, plan: org.plan } } : {}),
  };
}

export async function issueSession(user: any): Promise<{ token: string; setCookie: (res: NextResponse) => NextResponse }> {
  const token = await signToken({ sub: String(user._id), role: user.role, org: user.organization ? String(user.organization) : '' });
  return {
    token,
    setCookie: (res) => {
      res.cookies.set(AUTH_COOKIE, token, cookieOptions());
      return res;
    },
  };
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(AUTH_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  return res;
}

/** Creates an e-mail verification token (stored hashed) and mails the link. Returns true when delivered by SMTP. */
export async function sendVerificationEmail(user: { _id: unknown; email: string; name: string }): Promise<boolean> {
  const token = randomToken(32);
  await User.updateOne({ _id: user._id }, { emailVerifyTokenHash: sha256(token), emailVerifyExpires: new Date(Date.now() + 24 * 3600 * 1000) });
  const link = `${appUrl()}/verify-email?token=${token}`;
  return sendMail({
    to: user.email,
    subject: 'Verify your SmartHostel email',
    text: `Hi ${user.name},\n\nConfirm your email address by opening this link (valid for 24 hours):\n${link}\n\nIf you did not create this account you can ignore this message.`,
  });
}
