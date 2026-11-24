'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { formatDateTime } from '@/lib/format';
import { useToast } from '@/components/ui/Toast';
import { Async } from '@/components/ui/States';

interface N { _id: string; title: string; message: string; link?: string; isRead: boolean; createdAt: string }

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const { data, loading, error, reload } = useApi<N[]>('/api/notifications', { limit: 15 });
  const unread = (data ?? []).filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function markAll() {
    try {
      await api.post('/api/notifications/read', { all: true });
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button className="btn-ghost relative px-2" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 mt-2 rounded-2xl border border-navy-100 bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96">
          <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unread > 0 && (
              <button className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline" onClick={markAll}>
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            <Async loading={loading} error={error} empty={!data?.length} emptyTitle="You're all caught up" emptyMessage="New alerts will show up here." onRetry={reload} rows={3}>
              <ul className="divide-y divide-navy-100">
                {(data ?? []).map((n) => {
                  const body = (
                    <div className={`px-4 py-3 text-sm hover:bg-navy-50 ${n.isRead ? '' : 'bg-brand-50/50'}`}>
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-navy-600">{n.message}</p>
                      <p className="mt-1 text-xs text-navy-400">{formatDateTime(n.createdAt)}</p>
                    </div>
                  );
                  return <li key={n._id}>{n.link ? <Link href={n.link} onClick={() => setOpen(false)}>{body}</Link> : body}</li>;
                })}
              </ul>
            </Async>
          </div>
        </div>
      )}
    </div>
  );
}
