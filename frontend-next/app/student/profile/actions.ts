'use server';
import { revalidatePath } from 'next/cache';
import { studentSelfUpdateSchema } from '@/lib/validation';
import { requireServerAuth } from '@/lib/auth/session';
import { Student, User } from '@/lib/models';
import { compact } from '@/lib/forms';
import { audit } from '@/lib/audit';

export interface ProfileState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

const FIELDS = ['name', 'phone', 'dob', 'enrollmentNo', 'course', 'year', 'department', 'address', 'guardianName', 'guardianPhone', 'guardianRelation', 'emergencyContactName', 'emergencyContactPhone', 'gender'] as const;

/** Server Action: a student updates their own profile. Session-derived identity; zod-validated; tenant-scoped. */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const auth = await requireServerAuth('STUDENT');
  const raw: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (typeof v === 'string') raw[f] = v.trim();
  }
  const parsed = studentSelfUpdateSchema.safeParse(compact(raw));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: 'Please fix the highlighted fields.', errors };
  }
  try {
    const me: any = await Student.findOne({ organization: auth.organizationId, user: auth.userId });
    if (!me) return { ok: false, message: 'Student profile not found.' };
    me.set(parsed.data);
    await me.save();
    const userSet: Record<string, unknown> = {};
    if (parsed.data.name) userSet.name = parsed.data.name;
    if (parsed.data.phone) userSet.phone = parsed.data.phone;
    if (Object.keys(userSet).length) await User.updateOne({ _id: auth.userId }, userSet);
    await audit(auth, 'UPDATE', 'Student', me._id, { fields: Object.keys(parsed.data), via: 'server-action' });
    revalidatePath('/student/profile');
    revalidatePath('/student', 'layout');
    return { ok: true, message: 'Profile updated.' };
  } catch (e) {
    if ((e as { code?: number })?.code === 11000) return { ok: false, message: 'That enrollment number is already registered.', errors: { enrollmentNo: 'Already in use' } };
    console.error('[profile] update failed', e);
    return { ok: false, message: 'Could not save your profile. Please try again.' };
  }
}
