import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { ApiError, oid } from '@/lib/api';
import { escapeRegex, toCsv } from '@/lib/utils';
import { assertHostelAccess, hostelScope, studentOf } from '@/lib/services/scope';
import type { AuthContext } from '@/lib/auth/guard';

/** Remove keys whose value is `undefined` (so partial zod objects can be used in $set). */
export function defined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

export function qp(req: NextRequest, key: string): string | undefined {
  const v = req.nextUrl.searchParams.get(key);
  return v === null || v === '' ? undefined : v.trim();
}

export function idParam(req: NextRequest, key: string): string | undefined {
  const v = qp(req, key);
  return v ? oid(v, key) : undefined;
}

export function enumParam<T extends string>(req: NextRequest, key: string, values: readonly T[]): T | undefined {
  const v = qp(req, key);
  if (v === undefined) return undefined;
  if (!values.includes(v as T)) throw new ApiError(400, `Invalid ${key}. Allowed: ${values.join(', ')}`);
  return v as T;
}

export function boolParam(req: NextRequest, key: string): boolean | undefined {
  const v = qp(req, key);
  if (v === undefined) return undefined;
  return v === 'true' || v === '1';
}

/** Case-insensitive "contains" search over several fields. */
export function searchFilter(q: string | undefined, fields: string[]): Record<string, any> | undefined {
  if (!q) return undefined;
  const rx = new RegExp(escapeRegex(q.slice(0, 80)), 'i');
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

/** `from` / `to` query params (ISO or YYYY-MM-DD) -> range filter on a date field. */
export function dateRange(req: NextRequest, field: string, fromKey = 'from', toKey = 'to'): Record<string, any> {
  const from = qp(req, fromKey);
  const to = qp(req, toKey);
  const range: Record<string, Date> = {};
  if (from) {
    const d = new Date(from);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, `Invalid ${fromKey} date`);
    range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, `Invalid ${toKey} date`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) d.setUTCHours(23, 59, 59, 999);
    range.$lte = d;
  }
  return Object.keys(range).length ? { [field]: range } : {};
}

/** Combine optional partial filters (undefined entries are ignored). */
export function and(...parts: Array<Record<string, any> | undefined>): Record<string, any> {
  const list = parts.filter((p): p is Record<string, any> => !!p && Object.keys(p).length > 0);
  if (!list.length) return {};
  if (list.length === 1) return list[0];
  return { $and: list };
}

/** Finds a tenant-owned document by id (organization from the session) or throws 404. Returns a hydrated document. */
export async function findInOrg(model: mongoose.Model<any>, auth: AuthContext, id: string, label = 'Record', extra: Record<string, any> = {}): Promise<any> {
  if (!auth.organizationId) throw new ApiError(403, 'This action requires an organization context');
  const doc = await model.findOne({ _id: oid(id), organization: auth.organizationId, ...extra });
  if (!doc) throw new ApiError(404, `${label} not found`);
  return doc;
}

/** Ensures each referenced id exists in the caller's organization. Throws 400 naming the bad reference. */
export async function assertRefs(auth: AuthContext, checks: Array<[mongoose.Model<any>, string | undefined | null, string, Record<string, any>?]>): Promise<any[]> {
  const out: any[] = [];
  for (const [model, id, label, extra] of checks) {
    if (!id) {
      out.push(null);
      continue;
    }
    const doc = await model.findOne({ _id: id, organization: auth.organizationId, ...(extra ?? {}) }).lean();
    if (!doc) throw new ApiError(400, `${label} not found in your organization`);
    out.push(doc);
  }
  return out;
}

interface ScopeOpts {
  hostelField?: string | null;
  studentField?: string | null;
}

/**
 * Applies per-role row scoping to a list filter:
 *  STUDENT -> own records only, WARDEN -> assigned hostels, ADMIN -> whole organization.
 */
export async function roleScopedFilter(auth: AuthContext, filter: Record<string, any>, opts: ScopeOpts = {}): Promise<Record<string, any>> {
  const hostelField = opts.hostelField === undefined ? 'hostel' : opts.hostelField;
  const studentField = opts.studentField === undefined ? 'student' : opts.studentField;
  if (auth.role === 'STUDENT') {
    if (!studentField) throw new ApiError(403, 'You do not have permission to perform this action');
    const me = await studentOf(auth);
    return { ...filter, [studentField]: me._id };
  }
  if (hostelField) return hostelScope(auth, filter, hostelField);
  return filter;
}

/** Single-record access check consistent with roleScopedFilter. Students get 404 for foreign records. */
export async function assertRecordAccess(auth: AuthContext, doc: any, opts: ScopeOpts = {}): Promise<void> {
  const hostelField = opts.hostelField === undefined ? 'hostel' : opts.hostelField;
  const studentField = opts.studentField === undefined ? 'student' : opts.studentField;
  if (auth.role === 'STUDENT') {
    const me = await studentOf(auth);
    if (!studentField || String(doc[studentField]) !== String(me._id)) throw new ApiError(404, 'Record not found');
    return;
  }
  if (auth.role === 'WARDEN' && hostelField) await assertHostelAccess(auth, doc[hostelField]);
}

export function csvResponse(filename: string, columns: { key: string; label: string }[], rows: Record<string, unknown>[]): Response {
  return new NextResponse(toCsv(columns, rows), {
    status: 200,
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename.replace(/[^\w.\-]/g, '_')}"`, 'Cache-Control': 'no-store' },
  });
}

export const toObjectId = (id: string | mongoose.Types.ObjectId) => new mongoose.Types.ObjectId(String(id));

export const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
