import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { PLANS, SUBSCRIPTION_STATUSES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    plan: { type: String, enum: PLANS, required: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'ACTIVE' },
    pricePerMonth: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    limits: { hostels: Number, students: Number, wardens: Number },
    billingHistory: [{ _id: false, date: { type: Date, default: Date.now }, amount: Number, reference: String, note: String }],
    createdBy: ref('User'),
  },
  { timestamps: true }
);
schema.index({ organization: 1, status: 1, endDate: -1 });
// At most one ACTIVE subscription per organization.
schema.index({ organization: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'uniq_active_subscription_per_org' });

export const Subscription = defineModel('Subscription', schema);
