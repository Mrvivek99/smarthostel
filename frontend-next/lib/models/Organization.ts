import { Schema } from 'mongoose';
import { defineModel } from './_helpers';
import { PLANS } from '../constants';

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]{2,40}$/ },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    address: String,
    logoUrl: String,
    brandColor: { type: String, default: '#6a3ae6' },
    plan: { type: String, enum: PLANS, default: 'STARTER' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
    settings: {
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
  },
  { timestamps: true }
);

export const Organization = defineModel('Organization', schema);
