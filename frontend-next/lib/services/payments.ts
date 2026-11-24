import crypto from 'crypto';
import { ApiError } from '@/lib/api';
import { withTransaction } from '@/lib/db';
import { Payment, Student, StudentFee } from '@/lib/models';
import { computeBalance, computeLateFee, deriveFeeStatus, round2, toPaise, validatePayAmount } from '@/lib/services/feeMath';
import { createRazorpayOrder, razorpayKeyId, refundRazorpayPayment } from '@/lib/services/razorpay';
import { notify } from '@/lib/services/notify';

const ss = (s: any) => s ?? null;

function receiptNumber() {
  const d = new Date();
  return `RCP-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Step 1: server creates the Razorpay order and stores Payment{CREATED}. */
export async function createPaymentOrder(p: { orgId: string; studentId: string; feeId: string; amount?: number }) {
  const fee: any = await StudentFee.findOne({ _id: p.feeId, organization: p.orgId, student: p.studentId });
  if (!fee) throw new ApiError(404, 'Fee not found');
  if (fee.status === 'CANCELLED') throw new ApiError(409, 'This fee has been cancelled');
  const lateFee = Math.max(fee.lateFee ?? 0, computeLateFee(fee.dueDate, new Date(), fee.lateFeePerDay ?? 0));
  const balance = computeBalance(fee.amount, lateFee, fee.paidAmount);
  const check = validatePayAmount(p.amount, balance, fee.allowPartial);
  if (!check.ok) throw new ApiError(400, check.message);
  const keyId = razorpayKeyId();

  if (lateFee !== fee.lateFee) await StudentFee.updateOne({ _id: fee._id }, { lateFee });
  const order = await createRazorpayOrder(toPaise(check.amount), `fee_${String(fee._id).slice(-12)}_${Date.now().toString(36)}`, {
    feeId: String(fee._id),
    studentId: p.studentId,
    organizationId: p.orgId,
  });
  const payment: any = await Payment.create({
    organization: p.orgId,
    student: p.studentId,
    fee: fee._id,
    amount: check.amount,
    currency: order.currency,
    status: 'CREATED',
    razorpayOrderId: order.id,
  });
  return { paymentId: String(payment._id), orderId: order.id, amountPaise: order.amount, currency: order.currency, keyId, description: fee.title };
}

/**
 * Marks a CREATED payment as PAID exactly once. Safe to call from both /verify and the webhook:
 * the CREATED -> PAID flip is a single atomic update, only its winner applies the fee update.
 */
export async function markPaymentPaid(p: { paymentId: string; razorpayPaymentId: string; signature?: string; method?: string; source: 'VERIFY' | 'WEBHOOK' }) {
  const out = await withTransaction(async (session) => {
    const undo: Array<() => Promise<unknown>> = [];
    try {
      const flipped: any = await Payment.findOneAndUpdate(
        { _id: p.paymentId, status: 'CREATED' },
        { $set: { status: 'PAID', razorpayPaymentId: p.razorpayPaymentId, razorpaySignature: p.signature, method: p.method, paidAt: new Date(), source: p.source, receiptNumber: receiptNumber() } },
        { new: true, session: ss(session) }
      );
      if (!flipped) {
        const existing: any = await Payment.findById(p.paymentId).session(ss(session));
        if (existing && existing.status === 'PAID' && existing.razorpayPaymentId === p.razorpayPaymentId) return { payment: existing, alreadyProcessed: true };
        throw new ApiError(409, `Payment cannot be completed (current state: ${existing?.status ?? 'unknown'})`);
      }
      undo.push(() => Payment.updateOne({ _id: flipped._id }, { status: 'CREATED', $unset: { razorpayPaymentId: 1, paidAt: 1, receiptNumber: 1 } }));

      const fee: any = await StudentFee.findOneAndUpdate({ _id: flipped.fee }, { $inc: { paidAmount: flipped.amount } }, { new: true, session: ss(session) });
      if (!fee) throw new ApiError(404, 'Fee not found for payment');
      undo.push(() => StudentFee.updateOne({ _id: fee._id }, { $inc: { paidAmount: -flipped.amount } }));
      const late = Math.max(fee.lateFee ?? 0, computeLateFee(fee.dueDate, new Date(), fee.lateFeePerDay ?? 0));
      const status = fee.status === 'CANCELLED' ? 'CANCELLED' : deriveFeeStatus(fee.amount, late, fee.paidAmount);
      await StudentFee.updateOne({ _id: fee._id }, { $set: { status, lateFee: late } }, { session: ss(session) });
      return { payment: flipped, alreadyProcessed: false };
    } catch (e) {
      if (!session) for (const u of undo.reverse()) await u().catch(() => undefined);
      throw e;
    }
  });
  if (!out.alreadyProcessed) {
    const student: any = await Student.findById(out.payment.student).select('user').lean();
    await notify(String(out.payment.organization), [student?.user], {
      type: 'PAYMENT',
      title: 'Payment received',
      message: `We received Rs. ${out.payment.amount}. Receipt ${out.payment.receiptNumber}.`,
      link: '/student/payments',
    });
  }
  return out;
}

/** Applies a refund idempotently (keyed by the Razorpay refund id). Returns null if it was already applied. */
export async function applyRefund(p: { paymentId: string; refundId: string; amount: number; reason: string; by?: string }) {
  return withTransaction(async (session) => {
    const pay: any = await Payment.findOneAndUpdate(
      { _id: p.paymentId, status: { $in: ['PAID', 'PARTIALLY_REFUNDED'] }, 'refunds.razorpayRefundId': { $ne: p.refundId } },
      { $push: { refunds: { razorpayRefundId: p.refundId, amount: p.amount, reason: p.reason, by: p.by, createdAt: new Date() } }, $inc: { refundedAmount: p.amount } },
      { new: true, session: ss(session) }
    );
    if (!pay) return null;
    const status = pay.refundedAmount + 0.001 >= pay.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await Payment.updateOne({ _id: pay._id }, { status }, { session: ss(session) });
    const fee: any = await StudentFee.findOne({ _id: pay.fee }).session(ss(session));
    if (fee) {
      const paid = Math.max(0, round2(fee.paidAmount - p.amount));
      const next = fee.status === 'CANCELLED' ? 'CANCELLED' : deriveFeeStatus(fee.amount, fee.lateFee ?? 0, paid);
      await StudentFee.updateOne({ _id: fee._id }, { paidAmount: paid, refundedAmount: round2((fee.refundedAmount ?? 0) + p.amount), status: next }, { session: ss(session) });
    }
    return { ...pay.toObject(), status };
  });
}

export async function refundPayment(p: { orgId: string; paymentId: string; amount?: number; reason: string; by: string }) {
  const pay: any = await Payment.findOne({ _id: p.paymentId, organization: p.orgId });
  if (!pay) throw new ApiError(404, 'Payment not found');
  if (!['PAID', 'PARTIALLY_REFUNDED'].includes(pay.status) || !pay.razorpayPaymentId) throw new ApiError(409, 'Only paid payments can be refunded');
  const refundable = round2(pay.amount - (pay.refundedAmount ?? 0));
  const amount = p.amount === undefined ? refundable : round2(p.amount);
  if (amount <= 0 || amount > refundable + 0.001) throw new ApiError(400, `Refund amount must be between 0.01 and ${refundable}`);
  const refund = await refundRazorpayPayment(pay.razorpayPaymentId, toPaise(amount), { reason: p.reason, paymentId: String(pay._id) });
  const updated = await applyRefund({ paymentId: String(pay._id), refundId: refund.id, amount, reason: p.reason, by: p.by });
  const student: any = await Student.findById(pay.student).select('user').lean();
  await notify(p.orgId, [student?.user], { type: 'PAYMENT', title: 'Refund issued', message: `Rs. ${amount} has been refunded (${p.reason}).`, link: '/student/payments' });
  return updated ?? (await Payment.findById(pay._id).lean());
}
