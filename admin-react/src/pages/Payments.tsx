import { CircleDollarSign, Printer, RotateCcw, Undo2 } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ActionDialog from '../components/ActionDialog';
import StatCard from '../components/StatCard';
import { PaymentCard } from '../components/cards';
import { useToast } from '../context/ToastContext';
import { apiPost } from '../lib/api';
import { dateTimeCol, enumCol, moneyCol, refCol, statusCol, textCol } from '../lib/cols';
import { inr, label, num } from '../lib/format';
import { opts } from '../lib/fields';
import { enumFilter } from '../lib/pageKit';
import { printReceipt } from '../lib/receipt';
import type { Column, FieldDef, Row } from '../types';

const PAYMENT_STATUSES = opts('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'CREATED');
const refundable = (r: Row) => (r.status === 'PAID' || r.status === 'PARTIALLY_REFUNDED') && !!r.razorpayPaymentId;
const left = (r: Row) => Math.max(0, Math.round(((Number(r.amount) || 0) - (Number(r.refundedAmount) || 0)) * 100) / 100);
const hasReceipt = (r: Row) => ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(r.status);

const columns: Column[] = [
  textCol('receiptNumber', 'Receipt'),
  refCol('student', 'Student'),
  { key: 'fee', header: 'Fee', accessor: (r) => label(r.fee) },
  moneyCol('amount', 'Amount'),
  moneyCol('refundedAmount', 'Refunded'),
  enumCol('method', 'Method'),
  textCol('razorpayPaymentId', 'Razorpay payment'),
  dateTimeCol('paidAt', 'Paid on'),
  statusCol(),
];

export default function Payments() {
  const toast = useToast();
  return (
    <CrudPage title="Payments" subtitle="Transaction history, receipts and refunds." entity="Payment" endpoint="/api/payments/history"
      columns={columns} fields={[]} canEdit={false} canDelete={false} canCreate={false}
      filters={[enumFilter('status', 'Status', PAYMENT_STATUSES), enumFilter('method', 'Method', opts('card', 'upi', 'netbanking', 'wallet', 'emi'))]}
      card={(r, actions) => <PaymentCard p={r} actions={actions} />}
      emptyDescription="Payments appear here once students pay their fees."
      summary={(rows) => {
        const paid = rows.filter((r) => ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(r.status)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const refunded = rows.reduce((s, r) => s + (Number(r.refundedAmount) || 0), 0);
        return (
          <div className="grid gap-4 sm:grid-cols-3 mb-5">
            <StatCard label="Collected" value={inr(paid)} icon={<CircleDollarSign className="h-6 w-6" />} tone="green" hint={`${num(rows.length)} transactions`} />
            <StatCard label="Refunded" value={inr(refunded)} icon={<Undo2 className="h-6 w-6" />} tone="purple" />
            <StatCard label="Net" value={inr(paid - refunded)} icon={<CircleDollarSign className="h-6 w-6" />} tone="navy" />
          </div>
        );
      }}
      rowActions={(r, reload) => {
        const refundFields: FieldDef[] = [
          { name: 'amount', label: `Refund amount (₹, max ${left(r)})`, type: 'number', min: 0.01, max: left(r), hint: 'Leave blank to refund the full remaining amount' },
          { name: 'reason', label: 'Reason', type: 'textarea', required: true, validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
        ];
        return (
          <>
            {hasReceipt(r) && (
              <button className="btn-secondary btn-sm" onClick={() => { if (!printReceipt(r)) toast.error('Allow pop-ups to open the receipt'); }}><Printer className="h-3.5 w-3.5" />Receipt</button>
            )}
            {refundable(r) && left(r) > 0 && (
              <ActionDialog label="Refund" icon={<RotateCcw className="h-3.5 w-3.5" />} variant="danger" title="Refund payment" subtitle={`${inr(r.amount)} paid by ${label(r.student)}. ${inr(left(r))} can still be refunded.`}
                fields={refundFields} submitLabel="Issue refund" successMessage="Refund issued"
                onSubmit={(p) => apiPost('/api/payments/refund', { paymentId: r._id, reason: p.reason, ...(p.amount !== undefined ? { amount: p.amount } : {}) })} onDone={reload} />
            )}
          </>
        );
      }} />
  );
}
