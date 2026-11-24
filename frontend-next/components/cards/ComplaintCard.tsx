import { formatDateTime, titleCase, nameOf } from '@/lib/format';
import { StatusBadge } from '@/components/ui/States';

export function ComplaintCard({ c, actions, showStudent }: { c: any; actions?: React.ReactNode; showStudent?: boolean }) {
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{c.title}</h3>
          <p className="mt-0.5 text-xs text-navy-400">
            {titleCase(c.category)} · {formatDateTime(c.createdAt)}
            {showStudent && c.student ? ` · ${nameOf(c.student)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5"><StatusBadge status={c.priority} /><StatusBadge status={c.status} /></div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-navy-600">{c.description}</p>
      {Array.isArray(c.images) && c.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.images.map((f: any, i: number) => (
            <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:underline">Attachment {i + 1}</a>
          ))}
        </div>
      )}
      {c.assignedToName && <p className="mt-3 text-xs text-navy-500">Assigned to <span className="font-semibold">{c.assignedToName}</span></p>}
      {c.resolutionNotes && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="text-xs font-semibold uppercase tracking-wide">Resolution</p>
          <p className="mt-0.5 whitespace-pre-line">{c.resolutionNotes}</p>
          {Array.isArray(c.resolutionImages) && c.resolutionImages.map((f: any, i: number) => (
            <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="mr-2 text-xs font-medium underline">Evidence {i + 1}</a>
          ))}
        </div>
      )}
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}
