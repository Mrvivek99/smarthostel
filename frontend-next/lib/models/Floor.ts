import { Schema } from 'mongoose';
import { defineModel, orgField, ref } from './_helpers';

const schema = new Schema(
  {
    organization: orgField,
    hostel: { ...ref('Hostel', true), index: true },
    building: { ...ref('Building', true), index: true },
    number: { type: Number, required: true, min: -2, max: 100 },
    label: String,
  },
  { timestamps: true }
);
schema.index({ building: 1, number: 1 }, { unique: true });

export const Floor = defineModel('Floor', schema);
