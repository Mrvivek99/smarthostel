import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { NOTIFICATION_TYPES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    user: { ...ref('User', true), index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'SYSTEM' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);
schema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = defineModel('Notification', schema);
