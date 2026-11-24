'use client';
import { useState } from 'react';
import { Printer, Receipt } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { formatDateTime, formatINR, nameOf, titleCase } from '@/lib/format';
import { PaymentCard } from '@/components/cards/PaymentCard';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Async, StatusBadge } from '@/components/ui/States';

const LIMIT = 10;
const STATUSES = ['', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'];

export function PaymentsClient() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const list = useApi<any[]>('/api/payments/history', { page, limit: LIMIT, status });
  const receipt = useApi<any>(receiptId ? `/api/payments/${receiptId}` : null);
  const rows = list.data;

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Your transaction history and receipts."
        actions={
          <select aria-label="Filter by status" className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? titleCase(s) : 'All statuses'}</option>)}
          </select>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total paid" icon={Receipt} tone="green" loading={list.loading && !list.data} value={formatINR(list.meta?.totalPaid)} />
        <StatCard label="Total refunded" icon={Receipt} tone="navy" loading={list.loading && !list.data} value={formatINR(list.meta?.totalRefunded)} />
      </div>

      {/* Mobile: cards. Desktop: table. */}
      <div className="md:hidden">
        <Async loading={list.loading && !rows} error={list.error} empty={!!rows && rows.length === 0} emptyTitle="No payments yet" emptyMessage="Completed payments and their receipts will appear here." onRetry={list.reload} rows={4}>
          <div className="space-y-3">{(rows ?? []).map((p) => <PaymentCard key={p._id} p={p} onReceipt={(x) => setReceiptId(x._id)} />)}</div>
        </Async>
      </div>
      <div className="hidden md:block">
        <DataTable
          columns={[
            { key: 'fee', header: 'Fee', render: (p) => <span className="font-medium">{nameOf(p.fee, 'title')}</span> },
            { key: 'amount', header: 'Amount', render: (p) => formatINR(p.amount) },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            { key: 'date', header: 'Date', render: (p) => formatDateTime(p.paidAt ?? p.createdAt) },
            { key: 'receipt', header: 'Receipt', render: (p) => p.receiptNumber ? <button className="font-semibold text-brand-600 hover:underline" onClick={() => setReceiptId(p._id)}>{p.receiptNumber}</button> : '-' },
          ]}
          rows={rows} loading={list.loading} error={list.error} onRetry={list.reload}
          emptyTitle="No payments yet" emptyMessage="Completed payments and their receipts will appear here."
        />
      </div>
      {list.meta && <div className="card mt-3"><Pagination page={page} limit={LIMIT} total={list.meta.total} onChange={setPage} /></div>}

      <Modal
        open={!!receiptId}
        onClose={() => setReceiptId(null)}
        title="Payment receipt"
        footer={<><button className="btn-secondary" onClick={() => setReceiptId(null)}>Close</button><button className="btn-primary" disabled={!receipt.data} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / save as PDF</button></>}
      >
        <Async loading={receipt.loading} error={receipt.error} onRetry={receipt.reload} rows={4}>
          {receipt.data && (
            <div id="receipt" className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3 border-b border-navy-100 pb-3">
                <div>
                  <p className="text-base font-bold">{receipt.data.organizationInfo?.name ?? 'SmartHostel'}</p>
                  {receipt.data.organizationInfo?.address && <p className="text-xs text-navy-500">{receipt.data.organizationInfo.address}</p>}
                </div>
                <div className="text-right"><p className="text-xs text-navy-400">Receipt no.</p><p className="font-semibold">{receipt.data.receiptNumber ?? '-'}</p></div>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-xs text-navy-400">Student</dt><dd className="font-medium">{nameOf(receipt.data.student)}</dd></div>
                <div><dt className="text-xs text-navy-400">Enrollment no.</dt><dd className="font-medium">{receipt.data.student?.enrollmentNo ?? '-'}</dd></div>
                <div><dt className="text-xs text-navy-400">Fee</dt><dd className="font-medium">{nameOf(receipt.data.fee, 'title')}</dd></div>
                <div><dt className="text-xs text-navy-400">Paid on</dt><dd className="font-medium">{formatDateTime(receipt.data.paidAt)}</dd></div>
                <div><dt className="text-xs text-navy-400">Method</dt><dd className="font-medium">{titleCase(receipt.data.method) || '-'}</dd></div>
                <div><dt className="text-xs text-navy-400">Transaction ref.</dt><dd className="break-all font-medium">{receipt.data.razorpayPaymentId ?? '-'}</dd></div>
              </dl>
              <div className="flex items-center justify-between rounded-xl bg-navy-50 px-4 py-3">
                <span className="font-semibold">Amount paid</span><span className="text-lg font-bold">{formatINR(receipt.data.amount)}</span>
              </div>
              {receipt.data.refundedAmount > 0 && <p className="text-xs text-navy-500">Refunded: {formatINR(receipt.data.refundedAmount)}</p>}
            </div>
          )}
        </Async>
      </Modal>
    </>
  );
}
