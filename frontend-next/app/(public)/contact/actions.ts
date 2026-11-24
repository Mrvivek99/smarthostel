'use server';
import { contactSchema } from '@/lib/validation';
import { isMailConfigured, sendMail } from '@/lib/mailer';

export interface ContactState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

/** Server Action: validates the contact form with zod and emails the support inbox. */
export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: 'Please fix the highlighted fields.', errors };
  }
  const { name, email, subject, message } = parsed.data;
  const to = process.env.CONTACT_EMAIL || 'support@smarthostel.local';
  try {
    if (!isMailConfigured() && process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'Messaging is temporarily unavailable. Please try again later.' };
    }
    const sent = await sendMail({
      to,
      subject: `[Contact] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    if (!sent && process.env.NODE_ENV === 'production') return { ok: false, message: 'We could not send your message. Please try again later.' };
    return { ok: true, message: 'Thanks! Your message has been sent. We will reply by email soon.' };
  } catch (e) {
    console.error('[contact] send failed:', e);
    return { ok: false, message: 'We could not send your message. Please try again later.' };
  }
}
