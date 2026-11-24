import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodTypeAny, z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export type Meta = { page: number; limit: number; total: number } & Record<string, unknown>;

export function ok<T>(data: T, opts: { status?: number; meta?: Meta } = {}) {
  return NextResponse.json({ success: true, data, ...(opts.meta ? { meta: opts.meta } : {}) }, { status: opts.status ?? 200 });
}

export function fail(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error, ...(details !== undefined ? { details } : {}) }, { status });
}

export function handleError(e: unknown) {
  if (e instanceof ApiError) return fail(e.message, e.status, e.details);
  if (e instanceof ZodError) {
    const msg = e.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return fail(msg || 'Validation failed', 400, e.issues);
  }
  const err = e as { code?: number; name?: string; keyPattern?: Record<string, unknown>; message?: string };
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyPattern ?? {}).join(', ');
    return fail(`Duplicate record${fields ? ` (${fields})` : ''}`, 409);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return fail(Object.values(err.errors).map((x) => x.message).join('; '), 400);
  }
  if (err instanceof mongoose.Error.CastError) return fail('Invalid identifier or value', 400);
  console.error('[api] unhandled error:', e);
  return fail('Internal server error', 500);
}

type Ctx = { params: Record<string, string> };

/** Wraps a route handler: connects to Mongo and maps every thrown error to the standard response shape. */
export function handler(fn: (req: NextRequest, ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      await connectDB();
      return await fn(req, ctx);
    } catch (e) {
      return handleError(e);
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON');
  }
  return schema.parse(json);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

const OID = /^[a-f\d]{24}$/i;
export function oid(id: string | undefined | null, label = 'id'): string {
  if (!id || !OID.test(id)) throw new ApiError(400, `Invalid ${label}`);
  return id;
}
export function optionalOid(id: string | null | undefined, label = 'id'): string | undefined {
  return id ? oid(id, label) : undefined;
}

export function getPaging(req: NextRequest, defaultLimit = 20, maxLimit = 100) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(sp.get('limit') || String(defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

interface PaginateOpts {
  sort?: Record<string, 1 | -1>;
  populate?: any;
  select?: string;
  defaultLimit?: number;
  maxLimit?: number;
  extraMeta?: Record<string, unknown>;
  map?: (item: any) => any;
}

/** Standard paginated list response. */
export async function paginate(model: mongoose.Model<any>, filter: Record<string, any>, req: NextRequest, opts: PaginateOpts = {}) {
  const { page, limit, skip } = getPaging(req, opts.defaultLimit ?? 20, opts.maxLimit ?? 100);
  let q = model.find(filter).sort(opts.sort ?? { createdAt: -1 }).skip(skip).limit(limit);
  if (opts.select) q = q.select(opts.select);
  if (opts.populate) q = q.populate(opts.populate);
  const [items, total] = await Promise.all([q.lean(), model.countDocuments(filter)]);
  return ok(opts.map ? items.map(opts.map) : items, { meta: { page, limit, total, ...(opts.extraMeta ?? {}) } });
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
