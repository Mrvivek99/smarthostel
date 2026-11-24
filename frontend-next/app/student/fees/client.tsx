'use client';
import { useState } from 'react';
import { CheckCircle2, ChevronDown, CreditCard, Wallet } from 'lucide-react';
import { api, ApiClientError, loadRazorpay, type RazorpaySuccess } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { formatDate, formatINR, titleCase } from '@/lib/format';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async, Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const TABS = [
  { v: '', label: 'All' },
  { v: 'PENDING', label: 'Pending' },
  { v: 'PARTIAL', label: 'Partial' },
  { v: 'PAID', label: 'Paid' },
] as const;

interface OrderResponse {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

export function FeesClient() {
  const toast = useToast();
  const [tab, setTab] = useState<string>('');
  const fees = useApi<any[]>('/api/fees', { limit: 100, status: tab });
  const all = useApi<any[]>('/api/fees', { limit: 100 });
  const [open, setOpen] = useState<string | null>(null);
  const [payFee, setPayFee] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);

  const rows = fees.data ?? [];
  const everything = all.data ?? [];
  const due = everything.filter((f) => f.status === 'PENDING' || f.status === 'PARTIAL').reduce((s, f) => s + (f.balance ?? 0), 0);
  const overdue = everything.filter((f) => f.overdue).length;
  const paid = everything.reduce((s, f) => s + (f.paidAmount ?? 0), 0);

  function refresh() {
    fees.reload();
    all.reload();
  }

  /** Starts checkout. Step 1 create-order (server), step 2 Razorpay Checkout, step 3 verify (server). */
  async function startPayment(fee: any, chosen?: number) {
    setPaying(fee._id);
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        setPaying(null);
      }
    };
    try {
      const { data: order } = await api.post<OrderResponse>('/api/payments/create-order', { feeId: fee._id, ...(chosen ? { amount: chosen } : {}) });
      await loadRazorpay();
      if (!window.Razorpay) throw new ApiClientError('Payment gateway is unavailable. Please try again.');
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'SmartHostel',
        description: order.description ?? fee.title,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: '#5b3df5' },
        handler: async (r: RazorpaySuccess) => {
          try {
            const { data } = await api.post<{ receiptNumber?: string }>('/api/payments/verify', {
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            });
            toast.success(`Payment successful${data.receiptNumber ? `. Receipt ${data.receiptNumber}` : ''}`);
          } catch (e) {
            toast.error(`${(e as Error).message}. If money was deducted it will be reconciled automatically; check Payments shortly.`);
          } finally {
            refresh();
            release();
          }
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled. You have not been charged.');
            release();
          },
        },
      });
      rzp.on('payment.failed', (resp) => {
        toast.error(resp.error?.description || 'Payment failed. Please try again.');
        release();
      });
      rzp.open();
    } catch (e) {
      toast.error((e as Error).message);
      release();
    }
  }

  function onPay(fee: any) {
    if (fee.allowPartial) {
      setPayFee(fee);
      setAmount(String(fee.balance));
      setAmountError('');
    } else void startPayment(fee);
  }

  function confirmPartial(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setAmountError('Enter a valid amount');
    if (n > payFee.balance) return setAmountError(`Amount cannot exceed the balance of ${formatINR(payFee.balance)}`);
    const fee = payFee;
    setPayFee(null);
    void startPayment(fee, n === fee.balance ? undefined : n);
  }

  return (
    <>
      <PageHeader title="Fees" subtitle="Your fee structure, dues and payments." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total due" icon={Wallet} tone={due > 0 ? 'amber' : 'green'} loading={all.loading && !all.data} value={formatINR(due)} hint="Includes late fees" />
        <StatCard label="Overdue fees" icon={Wallet} tone={overdue ? 'red' : 'navy'} loading={all.loading && !all.data} value={overdue} />
        <StatCard label="Total paid" icon={CheckCircle2} tone="green" loading={all.loading && !all.data} value={formatINR(paid)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter fees">
        {TABS.map((t) => (
          <button key={t.v} role="tab" aria-selected={tab === t.v} onClick={() => setTab(t.v)} className={tab === t.v ? 'btn-navy btn-sm' : 'btn-secondary btn-sm'}>{t.label}</button>
        ))}
      </div>

      <Section className="mt-4">
        <Async loading={fees.loading && !fees.data} error={fees.error} empty={rows.length === 0} emptyTitle="No fees found" emptyMessage={tab ? 'No fees match this filter.' : 'Fees raised by the hostel office will appear here.'} onRetry={fees.reload} rows={4}>
          <ul className="divide-y divide-navy-100">
            {rows.map((f) => {
              const payable = (f.status === 'PENDING' || f.status === 'PARTIAL') && f.balance > 0;
              const expanded = open === f._id;
              return (
                <li key={f._id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{f.title}</h3>
                        <StatusBadge status={f.status} />
                        {f.overdue && <span className="badge bg-red-50 text-red-700">Overdue</span>}
                      </div>
                      <p className="mt-1 text-xs text-navy-500">
                        Due {formatDate(f.dueDate)} · Total {formatINR(f.amount)}
                        {f.lateFee > 0 ? ` · Late fee ${formatINR(f.lateFee)}` : ''}
                        {f.paidAmount > 0 ? ` · Paid ${formatINR(f.paidAmount)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-navy-400">Balance</p>
                        <p className="text-lg font-bold">{formatINR(f.balance)}</p>
                      </div>
                      {payable && (
                        <button className="btn-primary" disabled={paying !== null} onClick={() => onPay(f)}>
                          {paying === f._id ? <Spinner className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />} Pay now
                        </button>
                      )}
                      <button className="btn-ghost px-2" aria-expanded={expanded} aria-label="Toggle fee breakdown" onClick={() => setOpen(expanded ? null : f._id)}>
                        <ChevronDown className={`h-5 w-5 transition ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-4 rounded-xl bg-navy-50/70 p-4 text-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">Fee breakdown</p>
                      <ul className="space-y-1.5">
                        {(f.items ?? []).map((it: any, i: number) => (
                          <li key={i} className="flex justify-between gap-3"><span>{it.label || titleCase(it.category)}</span><span className="font-medium">{formatINR(it.amount)}</span></li>
                        ))}
                        {f.lateFee > 0 && <li className="flex justify-between gap-3 text-red-700"><span>Late fee</span><span className="font-medium">{formatINR(f.lateFee)}</span></li>}
                        <li className="flex justify-between gap-3 border-t border-navy-200 pt-1.5 font-semibold"><span>Total payable</span><span>{formatINR(f.amount + (f.lateFee ?? 0))}</span></li>
                      </ul>
                      {f.allowPartial && <p className="mt-2 text-xs text-navy-500">Partial payments are allowed for this fee.</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Async>
      </Section>

      <Modal
        open={!!payFee}
        onClose={() => setPayFee(null)}
        title="Choose amount to pay"
        description={payFee?.title}
        size="sm"
        footer={<><button className="btn-secondary" onClick={() => setPayFee(null)}>Cancel</button><button className="btn-primary" type="submit" form="pay-form">Continue to payment</button></>}
      >
        <form id="pay-form" onSubmit={confirmPartial} noValidate>
          <FormField label="Amount (INR)" type="number" inputMode="decimal" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} error={amountError} hint={payFee ? `Outstanding balance ${formatINR(payFee.balance)}` : undefined} />
        </form>
      </Modal>
    </>
  );
}
