import type { Row } from '../types';
import { fmtDateTime, inr, label, nm, titleCase } from './format';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Opens a printable receipt for a payment (client-side rendering of server data). */
export function printReceipt(p: Row): boolean {
  const w = window.open('', '_blank', 'width=720,height=860');
  if (!w) return false;
  const rows: [string, string][] = [
    ['Receipt no.', p.receiptNumber ?? '—'],
    ['Student', nm(p.student) || label(p.student)],
    ['Fee', label(p.fee) || p.fee?.title || '—'],
    ['Amount paid', inr(p.amount)],
    ['Refunded', inr(p.refundedAmount ?? 0)],
    ['Status', titleCase(p.status ?? '')],
    ['Method', titleCase(p.method ?? '—')],
    ['Razorpay payment id', p.razorpayPaymentId ?? '—'],
    ['Razorpay order id', p.razorpayOrderId ?? '—'],
    ['Paid on', fmtDateTime(p.paidAt ?? p.createdAt)],
  ];
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(p.receiptNumber ?? '')}</title>
<style>body{font-family:system-ui,sans-serif;color:#131c3b;padding:40px}h1{margin:0 0 4px}small{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:10px 0;border-bottom:1px solid #e2e8f0}td:first-child{color:#64748b;width:40%}.t{font-size:22px;font-weight:700}</style></head>
<body><h1>SmartHostel</h1><small>Payment receipt</small><table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td${k === 'Amount paid' ? ' class="t"' : ''}>${esc(v)}</td></tr>`).join('')}</table>
<p style="margin-top:32px;color:#64748b;font-size:12px">This is a computer generated receipt.</p><script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}
