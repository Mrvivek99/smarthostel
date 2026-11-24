import { Notification } from '@/lib/models';

type N = { type?: string; title: string; message: string; link?: string };

/** Creates in-app notifications. Never throws (notifications are best-effort). */
export async function notify(orgId: string, userIds: unknown[], n: N): Promise<void> {
  const ids = Array.from(new Set(userIds.filter(Boolean).map(String)));
  if (!ids.length) return;
  try {
    for (let i = 0; i < ids.length; i += 500) {
      await Notification.insertMany(
        ids.slice(i, i + 500).map((user) => ({ organization: orgId, user, type: n.type ?? 'SYSTEM', title: n.title, message: n.message, link: n.link })),
        { ordered: false }
      );
    }
  } catch (e) {
    console.error('[notify] failed', e);
  }
}
