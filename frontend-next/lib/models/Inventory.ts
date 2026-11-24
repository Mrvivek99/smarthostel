import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { INVENTORY_CATEGORIES, INVENTORY_CONDITIONS } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: INVENTORY_CATEGORIES, required: true },
    quantity: { type: Number, required: true, min: 0 },
    condition: { type: String, enum: INVENTORY_CONDITIONS, default: 'GOOD' },
    assignedRoom: ref('Room'),
    notes: String,
    maintenanceLog: [{ _id: false, date: { type: Date, default: Date.now }, note: String, cost: { type: Number, min: 0 }, by: ref('User') }],
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostel: 1, category: 1 });

export const Inventory = defineModel('Inventory', schema);
