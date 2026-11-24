import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { EXPENSE_CATEGORIES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    description: String,
    billUrl: String,
    createdBy: ref('User'),
  },
  { timestamps: true }
);
schema.index({ organization: 1, date: -1 });

export const Expense = defineModel('Expense', schema);
