import nodemailer from 'nodemailer';

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

/**
 * Sends an email via SMTP. When SMTP is not configured the message is logged to the server console
 * (useful in development) and `false` is returned so callers can tell it was not delivered.
 */
export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }): Promise<boolean> {
  if (!isMailConfigured()) {
    console.log(`[mail:not-configured] to=${opts.to} subject="${opts.subject}"\n${opts.text}`);
    return false;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || 'SmartHostel <no-reply@smarthostel.local>', ...opts });
  return true;
}
