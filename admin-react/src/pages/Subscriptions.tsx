import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, CalendarClock, Check, RefreshCw } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ActionDialog from '../components/ActionDialog';
import DataTable from '../components/DataTable';
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, errMsg } from '../lib/api';
import { dateCol, enumCol, moneyCol, refCol } from '../lib/cols';
import { opts } from '../lib/fields';
import { fmtDate, inr, num, titleCase } from '../lib/format';
import { enumFilter } from '../lib/pageKit';
import type { Column, FieldDef, Row } from '../types';

const PLAN_ORDER = ['STARTER', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'] as const;
const PLAN_COPY: Record<string, string> = {
  STARTER: 'For a single small hostel getting started.',
  STANDARD: 'For growing operations with a few hostels.',
  PROFESSIONAL: 'For large institutions running many hostels.',
  ENTERPRISE: 'Unlimited scale with custom pricing and support.',
};
const limitText = (n: number, unit: string) => (n < 0 ? `Unlimited ${unit}` : `Up to ${num(n)} ${unit}`);

const durationFields: FieldDef[] = [
  { name: 'durationMonths', label: 'Duration (months)', type: 'number', required: true, min: 1, max: 36, default: 1, validate: (v) => (Number.isInteger(Number(v)) ? undefined : 'Enter a whole number'), hint: '1 to 36 months' },
];

/* ---------------- Organization admin view ---------------- */
function OrgView() {
  const [data, setData] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await apiGet<Row>('/api/subscriptions')); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const billing = useMemo(() => {
    const out: Row[] = [];
    for (const s of (data?.history ?? []) as Row[]) for (const b of s.billingHistory ?? []) out.push({ ...b, plan: s.plan, subStatus: s.status, key: `${s._id}-${b.reference}` });
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);
  const billingCols: Column[] = [
    { key: 'date', header: 'Date', accessor: (r) => fmtDate(r.date) },
    { key: 'reference', header: 'Invoice ref.', accessor: (r) => r.reference ?? '' },
    { key: 'plan', header: 'Plan', accessor: (r) => titleCase(r.plan) },
    { key: 'amount', header: 'Amount', accessor: (r) => Number(r.amount) || 0, render: (r) => inr(r.amount) },
    { key: 'note', header: 'Note', accessor: (r) => r.note ?? '', className: 'max-w-sm truncate' },
  ];

  if (loading) return <div className="card"><LoadingState /></div>;
  if (error || !data) return <div className="card"><ErrorState message={error ?? 'Could not load subscription'} onRetry={load} /></div>;

  const plans: Record<string, { price: number; hostels: number; students: number; wardens: number }> = data.plans ?? {};
  const current: string = data.plan;
  const cur = data.current as Row | undefined;
  const rank = (p: string) => PLAN_ORDER.indexOf(p as (typeof PLAN_ORDER)[number]);
  const meters: [string, number, number][] = [['Hostels', data.usage?.hostels ?? 0, data.limits?.hostels ?? -1], ['Students', data.usage?.students ?? 0, data.limits?.students ?? -1], ['Wardens', data.usage?.wardens ?? 0, data.limits?.wardens ?? -1]];

  return (
    <div className="space-y-6">
      {(data.expired || data.expiringSoon) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm flex items-center gap-2 ${data.expired ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-800'}`} role="alert">
          <CalendarClock className="h-4 w-4 shrink-0" />
          {data.expired ? 'Your subscription has expired. Renew it to keep adding records.' : `Your subscription ends in ${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}. Renew to avoid interruption.`}
        </div>
      )}

      <div className="card p-6 grid lg:grid-cols-3 gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Current plan</p>
          <p className="text-2xl font-bold text-navy-900 mt-1">{titleCase(current)}</p>
          {cur ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge value={data.expired ? 'EXPIRED' : cur.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Price</dt><dd className="font-medium">{inr(cur.pricePerMonth)} / month</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Started</dt><dd>{fmtDate(cur.startDate)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Renews / ends</dt><dd>{fmtDate(cur.endDate)}</dd></div>
              {data.daysRemaining !== undefined && <div className="flex justify-between"><dt className="text-slate-500">Days remaining</dt><dd>{Math.max(0, data.daysRemaining)}</dd></div>}
            </dl>
          ) : <p className="text-sm text-slate-500 mt-3">No active subscription is recorded. Choose a plan below to start one.</p>}
          {current !== 'ENTERPRISE' && (
            <div className="mt-4">
              <ActionDialog label="Renew current plan" icon={<RefreshCw className="h-3.5 w-3.5" />} title={`Renew ${titleCase(current)}`} subtitle={`${inr(plans[current]?.price ?? 0)} per month. An invoice is issued and settled offline.`}
                fields={durationFields} submitLabel="Renew" successMessage="Subscription renewed" onSubmit={(p) => apiPost('/api/subscriptions', { plan: current, durationMonths: p.durationMonths ?? 1 })} onDone={load} />
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-3">Usage against plan limits</p>
          <div className="space-y-4">
            {meters.map(([name, used, limit]) => {
              const pct = limit < 0 ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{name}</span><span className="text-slate-500">{num(used)} / {limit < 0 ? 'Unlimited' : num(limit)}</span></div>
                  <div className="h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={limit < 0 ? undefined : pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${name} usage`}>
                    <div className={`h-2 rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: `${limit < 0 ? 4 : pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Plans</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLAN_ORDER.map((p) => {
            const cfg = plans[p];
            const isCurrent = p === current;
            const enterprise = p === 'ENTERPRISE';
            const dir = rank(p) > rank(current) ? 'Upgrade' : 'Downgrade';
            return (
              <div key={p} className={`card p-5 flex flex-col ${isCurrent ? 'ring-2 ring-brand-500' : ''}`}>
                <div className="flex items-center justify-between"><h3 className="font-semibold text-navy-900">{titleCase(p)}</h3>{isCurrent && <span className="text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">Current</span>}</div>
                <p className="mt-3"><span className="text-3xl font-bold text-navy-900">{enterprise ? 'Custom' : inr(cfg?.price ?? 0)}</span>{!enterprise && <span className="text-sm text-slate-500"> / month</span>}</p>
                <p className="text-sm text-slate-500 mt-2">{PLAN_COPY[p]}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600 flex-1">
                  {cfg && [limitText(cfg.hostels, 'hostels'), limitText(cfg.students, 'students'), limitText(cfg.wardens, 'wardens')].map((t) => <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{t}</li>)}
                </ul>
                <div className="mt-5">
                  {isCurrent ? <p className="text-sm text-slate-400 text-center py-1.5">Your current plan</p>
                    : enterprise ? <p className="text-xs text-slate-500">Enterprise plans are arranged with the platform owner.</p>
                    : (
                      <ActionDialog label={`${dir} to ${titleCase(p)}`} icon={dir === 'Upgrade' ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />} variant={dir === 'Upgrade' ? 'primary' : 'secondary'}
                        title={`${dir} to ${titleCase(p)}`} subtitle={`${inr(cfg?.price ?? 0)} per month. Replaces your current plan today. A downgrade is refused if your usage exceeds the new limits.`}
                        fields={durationFields} submitLabel={dir} successMessage={`Plan changed to ${titleCase(p)}`} onSubmit={(v) => apiPost('/api/subscriptions', { plan: p, durationMonths: v.durationMonths ?? 1 })} onDone={load} />
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-navy-900 mb-3">Billing history</h2>
        <DataTable columns={billingCols} rows={billing} rowKey={(r) => r.key} exportName="billing-history" searchPlaceholder="Search invoices…" emptyTitle="No invoices yet" emptyDescription="Invoices are listed here whenever your plan is started or renewed." />
      </div>
    </div>
  );
}

/* ---------------- Platform owner view ---------------- */
const adminFields: FieldDef[] = [
  { name: 'organization', label: 'Organization', type: 'select', required: true, remote: { endpoint: '/api/organizations', label: (o) => `${o.name} (${o.slug})` } },
  { name: 'plan', label: 'Plan', type: 'select', required: true, options: opts('STARTER', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'), default: 'STANDARD' },
  ...durationFields,
  { name: 'customPrice', label: 'Custom price per month (₹, Enterprise only)', type: 'number', min: 0, hint: 'Ignored for other plans' },
];
const adminColumns: Column[] = [
  refCol('organization', 'Organization'),
  enumCol('plan', 'Plan'),
  { key: 'status', header: 'Status', accessor: (r) => r.status, render: (r) => <StatusBadge value={r.status} /> },
  moneyCol('pricePerMonth', 'Price / month'),
  dateCol('startDate', 'Start'),
  dateCol('endDate', 'End'),
  { key: 'limits', header: 'Limits (hostels / students / wardens)', accessor: (r) => (r.limits ? [r.limits.hostels, r.limits.students, r.limits.wardens].map((n: number) => (n < 0 ? '∞' : n)).join(' / ') : '') },
];

function PlatformView() {
  return (
    <CrudPage hideHeader title="Subscriptions" entity="Subscription" endpoint="/api/subscriptions" columns={adminColumns} fields={adminFields} canEdit={false} canDelete={false}
      filters={[enumFilter('plan', 'Plan', opts('STARTER', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE')), enumFilter('status', 'Status', opts('ACTIVE', 'EXPIRED', 'CANCELLED'))]}
      transform={(p) => ({ organization: p.organization, plan: p.plan, durationMonths: p.durationMonths ?? 1, ...(p.plan === 'ENTERPRISE' && p.customPrice !== undefined ? { customPrice: p.customPrice } : {}) })}
      emptyDescription="Subscriptions appear here when organizations start a plan." />
  );
}

export default function Subscriptions() {
  const { user } = useAuth();
  const platform = user?.role === 'SUPER_ADMIN';
  return (
    <div>
      <PageHeader title="Subscriptions" subtitle={platform ? 'Plans and billing across all organizations.' : 'Your plan, usage and billing history.'} />
      {platform ? <PlatformView /> : <OrgView />}
    </div>
  );
}
