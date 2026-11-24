import { formatDateTime, formatINR, nameOf } from '@/lib/format';
import { StatusBadge } from '@/components/ui/States';

export function PaymentCard({ p, onReceipt }: { p: any; onReceipt?: (p: any) => void }) {
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold">{nameOf(p.fee, 'title')}</p>
        <p className="text-xs text-navy-400">{p.paidAt ? formatDateTime(p.paidAt) : formatDateTime(p.createdAt)}{p.receiptNumber ? ` · ${p.receiptNumber}` : ''}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-bold">{formatINR(p.amount)}</span>
        <StatusBadge status={p.status} />
        {onReceipt && p.receiptNumber && <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={() => onReceipt(p)}>Receipt</button>}
      </div>
    </div>
  );
}
