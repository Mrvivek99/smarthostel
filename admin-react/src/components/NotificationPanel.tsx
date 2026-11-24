import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { apiGet, apiPatch, errMsg, toItems } from '../lib/api';
import type { Row } from '../types';
import { EmptyState, ErrorState, LoadingState } from './States';
import { fmtDateTime } from '../lib/format';

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(toItems(await apiGet('/api/notifications', { limit: 20 }))); }
    catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const isRead = (n: Row) => !!(n.isRead ?? n.read);
  const unread = items.filter((n) => !isRead(n)).length;

  const markRead = async (n: Row) => {
    if (isRead(n)) return;
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true, read: true } : x)));
    try { await apiPatch(`/api/notifications/${n._id}`, { isRead: true }); } catch { /* keep optimistic state */ }
  };
  const markAll = async () => { await Promise.all(items.filter((n) => !isRead(n)).map(markRead)); };

  return (
    <div className="relative" ref={ref}>
      <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => { setOpen((o) => !o); if (!open) load(); }} aria-label="Notifications" aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="fixed sm:absolute right-2 left-2 sm:left-auto top-16 sm:top-full sm:mt-2 sm:w-96 card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-navy-900">Notifications</h3>
            {unread > 0 && <button className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1" onClick={markAll}><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && !items.length ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : !items.length ? <EmptyState title="You're all caught up" description="New notifications will appear here." /> : (
              <ul className="divide-y divide-slate-50">
                {items.map((n) => (
                  <li key={n._id}>
                    <button onClick={() => markRead(n)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex gap-3 ${isRead(n) ? '' : 'bg-brand-50/40'}`}>
                      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${isRead(n) ? 'bg-slate-200' : 'bg-brand-500'}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">{n.title ?? 'Notification'}</span>
                        {(n.message ?? n.body) && <span className="block text-xs text-slate-500 mt-0.5">{n.message ?? n.body}</span>}
                        <span className="block text-[11px] text-slate-400 mt-1">{fmtDateTime(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
