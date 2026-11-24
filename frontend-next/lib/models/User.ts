import { Schema } from 'mongoose';
import { defineModel } from './_helpers';
import { ROLES } from '../constants';

const schema = new Schema(
  {
    // Not required: SUPER_ADMIN is a platform-level user without a tenant.
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    phone: { type: String, trim: true },
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);
schema.index({ organization: 1, role: 1, isActive: 1 });

export const User = defineModel('User', schema);
