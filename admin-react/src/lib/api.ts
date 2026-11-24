import axios, { AxiosError } from 'axios';
import type { Meta, Row } from '../types';
import { goToLogin } from './loginUrl';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status = 0, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const TOKEN_KEY = 'sh_admin_token';
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.set('Authorization', `Bearer ${t}`);
  return cfg;
});

function normalise(err: unknown): ApiError {
  const e = err as AxiosError<any>;
  if (e?.response) {
    const body = e.response.data;
    let fields: Record<string, string> | undefined;
    const details = body?.details ?? body?.errors ?? body?.fields;
    if (details && typeof details === 'object' && !Array.isArray(details)) {
      fields = {};
      for (const [k, v] of Object.entries(details)) fields[k] = Array.isArray(v) ? String(v[0]) : String(v);
    }
    const msg = typeof body?.error === 'string' ? body.error : body?.message || `Request failed (${e.response.status})`;
    return new ApiError(msg, e.response.status, fields);
  }
  if (e?.code === 'ECONNABORTED') return new ApiError('The request timed out. Please try again.');
  if (e?.request) return new ApiError('Cannot reach the server. Check your connection or VITE_API_URL.');
  return new ApiError((err as Error)?.message || 'Unexpected error');
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const apiErr = normalise(err);
    const url: string = err?.config?.url || '';
    const isAuthProbe = /\/api\/auth\/(login|me|logout)/.test(url);
    if (apiErr.status === 401 && !isAuthProbe) {
      tokenStore.set(null);
      goToLogin(true);
    }
    return Promise.reject(apiErr);
  },
);

interface Envelope<T> { success: boolean; data?: T; error?: string; meta?: Meta }

function unwrap<T>(body: Envelope<T>, status: number): Envelope<T> {
  if (!body || typeof body !== 'object' || body.success === false) {
    throw new ApiError(body?.error || 'Request failed', status);
  }
  return body;
}

export async function apiGet<T = any>(url: string, params?: Row): Promise<T> {
  const r = await api.get<Envelope<T>>(url, { params });
  return unwrap(r.data, r.status).data as T;
}
export async function apiPost<T = any>(url: string, body?: Row): Promise<T> {
  const r = await api.post<Envelope<T>>(url, body ?? {});
  return unwrap(r.data, r.status).data as T;
}
export async function apiPatch<T = any>(url: string, body?: Row): Promise<T> {
  const r = await api.patch<Envelope<T>>(url, body ?? {});
  return unwrap(r.data, r.status).data as T;
}
export async function apiDelete<T = any>(url: string): Promise<T> {
  const r = await api.delete<Envelope<T>>(url);
  return unwrap(r.data, r.status).data as T;
}

export function toItems(data: any): Row[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const k of ['items', 'rows', 'results', 'docs', 'data']) if (Array.isArray(data[k])) return data[k];
  }
  return [];
}

/** Fetch every page of a list endpoint (limit 100 per request, max 30 pages). */
export async function apiListAll(url: string, params: Row = {}): Promise<Row[]> {
  const limit = 100;
  const all: Row[] = [];
  for (let page = 1; page <= 30; page++) {
    const r = await api.get<Envelope<any>>(url, { params: { ...params, page, limit } });
    const body = unwrap(r.data, r.status);
    const items = toItems(body.data);
    all.push(...items);
    const total = body.meta?.total;
    if (items.length < limit) break;
    if (total != null && all.length >= total) break;
  }
  return all;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
