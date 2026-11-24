import { handler, ok, parseBody } from '@/lib/api';
import { contactSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { sendMail } from '@/lib/mailer';

/** Public contact form. Delivered to CONTACT_EMAIL (logged to the console when SMTP is not configured). */
export const POST = handler(async (req) => {
  rateLimit(req, 'contact', 5, 60 * 60 * 1000);
  const b = await parseBody(req, contactSchema);
  await sendMail({
    to: process.env.CONTACT_EMAIL || 'support@smarthostel.local',
    subject: `[Contact] ${b.subject}`,
    text: `From: ${b.name} <${b.email}>\n\n${b.message}`,
  });
  return ok({ message: 'Thanks for reaching out. We will get back to you soon.' }, { status: 201 });
});
