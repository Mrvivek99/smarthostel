import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';
import { NOTICE_AUDIENCES, PRIORITIES } from '../constants';

const schema = new Schema(
  {
    organization: orgField,
    hostel: ref('Hostel'), // empty = all hostels
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 8000 },
    audience: { type: String, enum: NOTICE_AUDIENCES, default: 'ALL' },
    priority: { type: String, enum: PRIORITIES, default: 'MEDIUM' },
    pinned: { type: Boolean, default: false },
    author: ref('User', true),
    authorName: String,
    publishedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    readBy: [ref('User')],
  },
  { timestamps: true }
);
schema.index({ organization: 1, hostel: 1, publishedAt: -1 });

export const Notice = defineModel('Notice', schema);
