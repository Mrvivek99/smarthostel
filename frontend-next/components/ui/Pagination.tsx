'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, limit, total, onChange }: { page: number; limit: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-navy-100 px-4 py-3 sm:flex-row">
      <p className="text-sm text-navy-500">
        Showing <span className="font-semibold text-navy-800">{from}-{to}</span> of <span className="font-semibold text-navy-800">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="min-w-[72px] text-center text-sm text-navy-600">Page {page} / {pages}</span>
        <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
