import { FormEvent, useMemo, useState } from 'react';
import type { FieldDef, Option, Row } from '../types';
import FormField from './FormField';
import { useList } from '../hooks/useList';
import { ApiError, errMsg } from '../lib/api';
import { idOf, toDateInput, toLocalInput } from '../lib/format';

type Values = Record<string, any>;

function initialValue(f: FieldDef, src?: Row) {
  const raw = src ? src[f.name] : undefined;
  switch (f.type) {
    case 'checkbox': return raw ?? f.default ?? false;
    case 'multiselect': return Array.isArray(raw) ? raw.map(idOf) : Array.isArray(f.default) ? f.default : [];
    case 'select': return raw !== undefined && raw !== null ? idOf(raw) : f.default ?? '';
    case 'date': return raw ? toDateInput(raw) : f.default ?? '';
    case 'datetime': return raw ? toLocalInput(raw) : f.default ?? '';
    case 'number': return raw !== undefined && raw !== null ? String(raw) : f.default !== undefined ? String(f.default) : '';
    case 'lineitems': return Array.isArray(raw) && raw.length ? raw.map((x: Row) => ({ category: String(x.category ?? ''), label: String(x.label ?? ''), amount: String(x.amount ?? '') })) : f.default ?? [{ category: '', label: '', amount: '' }];
    default:
      if (Array.isArray(raw)) return raw.map(String).join(f.type === 'textarea' ? '\n' : ', ');
      return raw !== undefined && raw !== null ? String(raw) : f.default ?? '';
  }
}

function RemoteOptions({ f, values, children }: { f: FieldDef; values: Values; children: (opts: Option[], loading: boolean, error: string | null) => JSX.Element }) {
  const r = f.remote!;
  const dep = r.dependsOn ? values[r.dependsOn.field] : undefined;
  const params = { ...(r.params ?? {}), ...(r.dependsOn && dep ? { [r.dependsOn.param]: dep } : {}) };
  const { items, loading, error } = useList(r.endpoint, params);
  const opts = useMemo(() => (r.filter ? items.filter(r.filter) : items).map((it) => ({ value: String(it[r.value ?? '_id'] ?? it.id), label: r.label(it) })), [items, r]);
  return children(opts, loading, error);
}

interface Props {
  fields: FieldDef[];
  initial?: Row;
  mode?: 'create' | 'edit';
  submitLabel?: string;
  onSubmit: (payload: Row) => Promise<void>;
  onCancel: () => void;
  intro?: React.ReactNode;
}

export default function EntityForm({ fields, initial, mode = 'create', submitLabel, onSubmit, onCancel, intro }: Props) {
  const active = useMemo(() => fields.filter((f) => !(f.createOnly && mode === 'edit') && !(f.editOnly && mode === 'create')), [fields, mode]);
  const [values, setValues] = useState<Values>(() => Object.fromEntries(active.map((f) => [f.name, initialValue(f, initial)])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const set = (name: string, v: any) => {
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      for (const f of active) if (f.remote?.dependsOn?.field === name) next[f.name] = f.type === 'multiselect' ? [] : '';
      return next;
    });
    setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    for (const f of active) {
      const v = values[f.name];
      const empty = v === '' || v === undefined || v === null || (Array.isArray(v) && !v.length);
      if (f.type === 'lineitems') {
        const rows = (v as Row[]).filter((x) => x.category || x.label || x.amount !== '');
        if (!rows.length) { errs[f.name] = 'Add at least one line item'; continue; }
        if (rows.some((x) => !x.category)) { errs[f.name] = 'Choose a category for every line item'; continue; }
        if (rows.some((x) => x.amount === '' || Number.isNaN(Number(x.amount)) || Number(x.amount) < 0)) { errs[f.name] = 'Enter a valid amount (0 or more) for every line item'; continue; }
        continue;
      }
      const required = f.required;
      if (f.type !== 'checkbox' && required && empty && !(f.name === 'password' && mode === 'edit')) { errs[f.name] = `${f.label} is required`; continue; }
      if (empty || f.type === 'checkbox') continue;
      const s = String(v);
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) errs[f.name] = 'Enter a valid email address';
      else if (f.type === 'number') {
        const n = Number(s);
        if (Number.isNaN(n)) errs[f.name] = 'Enter a valid number';
        else if (f.min !== undefined && n < f.min) errs[f.name] = `Must be at least ${f.min}`;
        else if (f.max !== undefined && n > f.max) errs[f.name] = `Must be at most ${f.max}`;
      } else if (f.minLength && s.length < f.minLength) errs[f.name] = `Must be at least ${f.minLength} characters`;
      else if (f.pattern && !f.pattern.test(s)) errs[f.name] = f.patternMessage || 'Invalid format';
      if (!errs[f.name] && f.validate) { const m = f.validate(v, values); if (m) errs[f.name] = m; }
    }
    return errs;
  };

  const buildPayload = (): Row => {
    const out: Row = {};
    for (const f of active) {
      const v = values[f.name];
      if (f.type === 'checkbox') { out[f.name] = !!v; continue; }
      if (f.type === 'multiselect') { out[f.name] = v; continue; }
      if (f.type === 'lineitems') {
        out[f.name] = (v as Row[]).filter((x) => x.category || x.label || x.amount !== '')
          .map((x) => ({ category: x.category, ...(String(x.label).trim() ? { label: String(x.label).trim() } : {}), amount: Number(x.amount) }));
        continue;
      }
      // Empty optional values are omitted: the API schemas treat missing as "unchanged" and reject null.
      if (v === '' || v === undefined) continue;
      if (f.type === 'number') out[f.name] = Number(v);
      else if (f.type === 'datetime') out[f.name] = new Date(v).toISOString();
      else out[f.name] = typeof v === 'string' ? v.trim() : v;
    }
    return out;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setFormErr(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSubmit(buildPayload());
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors((p) => ({ ...p, ...err.fields }));
      setFormErr(errMsg(err));
    } finally { setBusy(false); }
  };

  const renderControl = (f: FieldDef, opts?: Option[], loading?: boolean) => {
    const id = `f-${f.name}`;
    const cls = `input ${errors[f.name] ? 'input-error' : ''}`;
    const v = values[f.name];
    const options = opts ?? f.options ?? [];
    switch (f.type) {
      case 'textarea':
        return <textarea id={id} className={cls} rows={3} value={v} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />;
      case 'select':
        return (
          <select id={id} className={cls} value={v} onChange={(e) => set(f.name, e.target.value)} disabled={loading}>
            <option value="">{loading ? 'Loading…' : 'Select…'}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      case 'multiselect':
        return (
          <div className={`rounded-xl border p-2 max-h-40 overflow-y-auto space-y-1 ${errors[f.name] ? 'border-rose-400' : 'border-slate-200'}`}>
            {loading && <p className="text-xs text-slate-400 p-1">Loading…</p>}
            {!loading && !options.length && <p className="text-xs text-slate-400 p-1">No options available</p>}
            {options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={(v as string[]).includes(o.value)}
                  onChange={(e) => set(f.name, e.target.checked ? [...v, o.value] : (v as string[]).filter((x) => x !== o.value))} />
                {o.label}
              </label>
            ))}
          </div>
        );
      case 'lineitems': {
        const rows = v as { category: string; label: string; amount: string }[];
        const upd = (i: number, k: string, val: string) => set(f.name, rows.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
        return (
          <div className={`rounded-xl border p-3 space-y-2 ${errors[f.name] ? 'border-rose-400' : 'border-slate-200'}`}>
            {rows.map((x, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select className="input col-span-12 sm:col-span-4" aria-label={`Item ${i + 1} category`} value={x.category} onChange={(e) => upd(i, 'category', e.target.value)}>
                  <option value="">Category…</option>
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="input col-span-7 sm:col-span-4" aria-label={`Item ${i + 1} label`} placeholder="Label (optional)" value={x.label} onChange={(e) => upd(i, 'label', e.target.value)} />
                <input className="input col-span-4 sm:col-span-3" type="number" min={0} step="any" aria-label={`Item ${i + 1} amount`} placeholder="Amount" value={x.amount} onChange={(e) => upd(i, 'amount', e.target.value)} />
                <button type="button" className="btn-ghost btn-sm !px-2 col-span-1 !text-rose-600" aria-label={`Remove item ${i + 1}`} disabled={rows.length <= 1} onClick={() => set(f.name, rows.filter((_, j) => j !== i))}>&times;</button>
              </div>
            ))}
            <button type="button" className="btn-secondary btn-sm" onClick={() => set(f.name, [...rows, { category: '', label: '', amount: '' }])}>+ Add line item</button>
            <p className="text-xs text-slate-500">Total: {rows.reduce((a, x) => a + (Number(x.amount) || 0), 0).toLocaleString('en-IN')}</p>
          </div>
        );
      }
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer py-2">
            <input id={id} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} />
            {f.hint ?? f.label}
          </label>
        );
      case 'datetime':
        return <input id={id} type="datetime-local" className={cls} value={v} onChange={(e) => set(f.name, e.target.value)} />;
      case 'date':
        return <input id={id} type="date" className={cls} value={v} onChange={(e) => set(f.name, e.target.value)} />;
      case 'number':
        return <input id={id} type="number" step="any" min={f.min} max={f.max} className={cls} value={v} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />;
      default:
        return <input id={id} type={f.type ?? 'text'} className={cls} value={v} placeholder={f.placeholder} autoComplete={f.type === 'password' ? 'new-password' : 'off'} onChange={(e) => set(f.name, e.target.value)} />;
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {intro}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {active.map((f) => {
          const wide = f.wide || f.type === 'textarea' || f.type === 'multiselect' || f.type === 'lineitems';
          const req = f.required && !(f.name === 'password' && mode === 'edit');
          return (
            <FormField key={f.name} label={f.type === 'checkbox' ? '' : f.label} htmlFor={`f-${f.name}`} error={errors[f.name]} hint={f.type === 'checkbox' ? undefined : f.hint} required={req && f.type !== 'checkbox'} className={wide ? 'sm:col-span-2' : ''}>
              {f.remote ? (
                <RemoteOptions f={f} values={values}>
                  {(opts, loading, error) => (<>{renderControl(f, opts, loading)}{error && <p className="text-xs text-rose-600 mt-1">{error}</p>}</>)}
                </RemoteOptions>
              ) : renderControl(f)}
            </FormField>
          );
        })}
      </div>
      {formErr && <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm px-3 py-2" role="alert">{formErr}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel ?? (mode === 'edit' ? 'Save changes' : 'Create')}</button>
      </div>
    </form>
  );
}
