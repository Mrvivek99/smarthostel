import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';

const schema = new Schema(
  {
    organization: orgField,
    user: { ...ref('User', true), unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    employeeId: String,
    hostels: [ref('Hostel')],
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostels: 1 });

export const Warden = defineModel('Warden', schema);
