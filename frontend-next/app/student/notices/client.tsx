'use client';
import { useState } from 'react';
import { ChevronDown, Megaphone, Pin } from 'lucide-react';
import { api } from '@/lib/client';
import { useApi, useDebounced } from '@/lib/hooks';
import { formatDateTime } from '@/lib/format';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBar } from '@/components/ui/SearchBar';
import { PageHeader } from '@/components/ui/PageHeader';
import { Async, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const LIMIT = 10;

export function NoticesClient() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useApi<any[]>('/api/notices', { page, limit: LIMIT, q: dq });
  const [open, setOpen] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(new Set());

  async function toggle(n: any) {
    const opening = open !== n._id;
    setOpen(opening ? n._id : null);
    if (opening && !n.isRead && !read.has(n._id)) {
      setRead((s) => new Set(s).add(n._id));
      try {
        await api.patch(`/api/notices/${n._id}`, { read: true });
      } catch (e) {
        setRead((s) => { const c = new Set(s); c.delete(n._id); return c; });
        toast.error((e as Error).message);
      }
    }
  }

  const rows = list.data;
  return (
    <>
      <PageHeader title="Notices" subtitle="Announcements from your hostel office." actions={<SearchBar className="w-full sm:w-72" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search notices" />} />
      <Async loading={list.loading && !rows} error={list.error} empty={!!rows && rows.length === 0} emptyTitle={dq ? 'No matching notices' : 'No notices yet'} emptyMessage={dq ? 'Try a different search term.' : 'New announcements will appear here.'} onRetry={list.reload} rows={4}>
        <ul className={`space-y-3 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
          {(rows ?? []).map((n) => {
            const unread = !n.isRead && !read.has(n._id);
            const expanded = open === n._id;
            return (
              <li key={n._id} className={`card ${unread ? 'border-brand-200' : ''}`}>
                <button className="flex w-full items-start gap-3 p-5 text-left" aria-expanded={expanded} onClick={() => toggle(n)}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${unread ? 'bg-brand-600 text-white' : 'bg-navy-100 text-navy-500'}`}><Megaphone className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold">{n.title}</span>
                      {n.pinned && <Pin className="h-3.5 w-3.5 text-brand-600" aria-label="Pinned" />}
                      {n.priority && n.priority !== 'MEDIUM' && <StatusBadge status={n.priority} />}
                      {unread && <span className="badge bg-brand-50 text-brand-700">New</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-navy-400">{n.authorName ?? 'Hostel office'} · {formatDateTime(n.publishedAt ?? n.createdAt)}{n.hostel?.name ? ` · ${n.hostel.name}` : ''}</span>
                    {!expanded && <span className="mt-2 line-clamp-2 block text-sm text-navy-600">{n.body}</span>}
                  </span>
                  <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-navy-400 transition ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && <div className="whitespace-pre-line border-t border-navy-100 px-5 py-4 text-sm text-navy-700">{n.body}</div>}
              </li>
            );
          })}
        </ul>
        {list.meta && <div className="card mt-4"><Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /></div>}
      </Async>
    </>
  );
}
