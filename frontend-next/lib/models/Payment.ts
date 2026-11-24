import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { PAYMENT_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    student: { ...ref('Student', true), index: true },
    fee: { ...ref('StudentFee', true), index: true },
    amount: { type: Number, required: true, min: 0.01 }, // rupees
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'CREATED' },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: String,
    razorpaySignature: { type: String, select: false },
    method: String,
    receiptNumber: String,
    paidAt: Date,
    source: { type: String, enum: ['VERIFY', 'WEBHOOK'] },
    refundedAmount: { type: Number, default: 0 },
    refunds: [
      {
        _id: false,
        razorpayRefundId: String,
        amount: Number,
        reason: String,
        by: ref('User'),
        createdAt: { type: Date, default: Date.now },
      },
    ],
    failureReason: String,
  },
  { timestamps: true }
);
// Idempotency: a Razorpay payment id can be recorded on at most one Payment.
schema.index({ razorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } });
schema.index({ receiptNumber: 1 }, { unique: true, partialFilterExpression: { receiptNumber: { $type: 'string' } } });
schema.index({ organization: 1, status: 1, paidAt: -1 });

export const Payment = defineModel('Payment', schema);
