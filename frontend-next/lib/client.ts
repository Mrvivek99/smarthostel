/** Small browser-side fetch helper for the SmartHostel API contract: { success, data, error, meta }. */
export interface Meta {
  page: number;
  limit: number;
  total: number;
  [k: string]: unknown;
}
export interface ApiResult<T> {
  data: T;
  meta?: Meta;
}

export class ApiClientError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(message: string, status = 0, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.fields = fields;
  }
}

/** Converts zod issue details ({path, message}[]) into a field -> message map. */
function fieldsFromDetails(details: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const d of details) {
      const path = Array.isArray(d?.path) ? d.path.join('.') : '';
      if (path && !out[path] && typeof d?.message === 'string') out[path] = d.message;
    }
  }
  return out;
}

export function qs(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: 'no-store',
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiClientError('Cannot reach the server. Check your connection and try again.');
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok || !json || json.success === false) {
    const isAuthCall = /^\/api\/auth\//.test(path);
    if (res.status === 401 && !isAuthCall && typeof window !== 'undefined') {
      window.location.assign('/login?expired=1');
    }
    throw new ApiClientError(
      (json && typeof json.error === 'string' && json.error) || `Request failed (${res.status})`,
      res.status,
      fieldsFromDetails(json?.details)
    );
  }
  return { data: json.data as T, meta: json.meta };
}

export const api = {
  get: <T = any>(path: string, params?: Record<string, string | number | boolean | undefined | null>, signal?: AbortSignal) =>
    request<T>('GET', path + qs(params), undefined, signal),
  post: <T = any>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T = any>(path: string) => request<T>('DELETE', path),
};

export interface UploadedFile {
  url: string;
  publicId?: string;
  type?: string;
}

/** Signed direct upload to Cloudinary: server signs (POST /api/upload), the browser uploads the file. */
export async function uploadFile(file: File, folder: 'avatars' | 'documents' | 'complaints' | 'leave' | 'receipts' | 'misc' = 'misc'): Promise<UploadedFile> {
  const { data: sig } = await api.post<{
    cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; allowedFormats: string; uploadUrl: string; maxBytes: number;
  }>('/api/upload', { folder });
  if (file.size > sig.maxBytes) throw new ApiClientError(`File is too large (max ${Math.round(sig.maxBytes / 1024 / 1024)} MB)`);
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('allowed_formats', sig.allowedFormats);
  let res: Response;
  try {
    res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new ApiClientError('Upload failed. Check your connection and try again.');
  }
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.secure_url) throw new ApiClientError(json?.error?.message || 'Upload failed. Allowed: JPG, PNG, WEBP, PDF.');
  return { url: json.secure_url, publicId: json.public_id, type: json.resource_type };
}

// ---------- Razorpay Checkout ----------
export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (r: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}
export interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', cb: (r: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => RazorpayInstance;
  }
}

let rzpLoader: Promise<void> | null = null;
export function loadRazorpay(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'));
  if (window.Razorpay) return Promise.resolve();
  if (rzpLoader) return rzpLoader;
  rzpLoader = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      rzpLoader = null;
      s.remove();
      reject(new ApiClientError('Could not load the payment gateway. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return rzpLoader;
}
