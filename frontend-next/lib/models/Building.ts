import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    description: String,
  },
  { timestamps: true }
);
schema.index({ hostel: 1, name: 1 }, { unique: true });

export const Building = defineModel('Building', schema);
