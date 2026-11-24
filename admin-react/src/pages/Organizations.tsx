import { Ban, CheckCircle2, Crown } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ConfirmButton from '../components/ConfirmButton';
import ActionDialog from '../components/ActionDialog';
import { apiPatch, apiPost } from '../lib/api';
import { enumCol, statusCol, textCol } from '../lib/cols';
import { opts, phoneRule, passwordRule, urlRule } from '../lib/fields';
import { enumFilter } from '../lib/pageKit';
import type { Column, FieldDef, Row } from '../types';

const PLAN_OPTIONS = [
  { value: 'STARTER', label: 'Starter (₹499/mo)' },
  { value: 'STANDARD', label: 'Standard (₹999/mo)' },
  { value: 'PROFESSIONAL', label: 'Professional (₹1,999/mo)' },
  { value: 'ENTERPRISE', label: 'Enterprise (custom)' },
];
const ORG_STATUSES = opts('ACTIVE', 'SUSPENDED');

const columns: Column[] = [
  textCol('name', 'Organization'),
  textCol('slug', 'Code (slug)'),
  textCol('email', 'Email'),
  textCol('phone', 'Phone'),
  enumCol('plan', 'Plan'),
  statusCol(),
  { key: 'createdAt', header: 'Created', accessor: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '') },
];

const fields: FieldDef[] = [
  { name: 'name', label: 'Organization name', required: true },
  { name: 'slug', label: 'Slug / organization code', required: true, createOnly: true, pattern: /^[a-zA-Z0-9-]{2,40}$/, patternMessage: 'Use 2-40 letters, numbers or dashes', hint: 'Students use this code to register. Cannot be changed later.' },
  { name: 'email', label: 'Contact email', type: 'email' },
  { name: 'phone', label: 'Contact phone', type: 'tel', ...phoneRule },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'plan', label: 'Initial plan', type: 'select', options: PLAN_OPTIONS, required: true, createOnly: true, default: 'STARTER' },
  { name: 'adminName', label: 'Admin name', required: true, createOnly: true, minLength: 2 },
  { name: 'adminEmail', label: 'Admin email', type: 'email', required: true, createOnly: true },
  { name: 'adminPassword', label: 'Admin password', type: 'password', required: true, createOnly: true, ...passwordRule },
  { name: 'logoUrl', label: 'Logo URL', editOnly: true, ...urlRule },
  { name: 'brandColor', label: 'Brand colour', editOnly: true, placeholder: '#6a3ae6', pattern: /^#[0-9a-fA-F]{6}$/, patternMessage: 'Use a 6 digit hex colour such as #6a3ae6' },
  { name: 'status', label: 'Status', type: 'select', options: ORG_STATUSES, editOnly: true, required: true, hint: 'Suspending blocks every user of this organization.' },
];

const changePlanFields: FieldDef[] = [
  { name: 'plan', label: 'Plan', type: 'select', options: PLAN_OPTIONS, required: true },
  { name: 'durationMonths', label: 'Duration (months)', type: 'number', min: 1, max: 36, default: 1, required: true, validate: (v) => (Number.isInteger(Number(v)) ? undefined : 'Enter a whole number') },
  { name: 'customPrice', label: 'Custom price per month (₹, Enterprise only)', type: 'number', min: 0, hint: 'Ignored for non-Enterprise plans' },
];

export default function Organizations() {
  return (
    <CrudPage title="Organizations" subtitle="Onboard and manage tenant organizations on the platform." entity="Organization" endpoint="/api/organizations"
      columns={columns} fields={fields} canDelete={false}
      filters={[enumFilter('status', 'Status', ORG_STATUSES), enumFilter('plan', 'Plan', PLAN_OPTIONS.map((p) => ({ value: p.value, label: p.value.charAt(0) + p.value.slice(1).toLowerCase() })))]}
      transform={(p, mode) => (mode === 'create' ? { ...p, slug: String(p.slug).toLowerCase() } : p)}
      emptyDescription="Create the first organization to get started."
      rowActions={(r: Row, reload) => (
        <>
          <ActionDialog label="Plan" icon={<Crown className="h-3.5 w-3.5" />} title={`Change plan for ${r.name}`} subtitle="Cancels the current subscription and starts a new one today."
            fields={changePlanFields} initial={{ plan: r.plan, durationMonths: 1 }} submitLabel="Change plan" successMessage="Plan updated"
            onSubmit={(p) => apiPost('/api/subscriptions', { organization: r._id, plan: p.plan, durationMonths: p.durationMonths ?? 1, ...(p.plan === 'ENTERPRISE' && p.customPrice !== undefined ? { customPrice: p.customPrice } : {}) })}
            onDone={reload} />
          {r.status === 'SUSPENDED' ? (
            <ConfirmButton label="Reactivate" icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Reactivate organization?" message={`${r.name} and all its users will regain access.`} confirmLabel="Reactivate" danger={false}
              successMessage="Organization reactivated" onConfirm={() => apiPatch(`/api/organizations/${r._id}`, { status: 'ACTIVE' })} onDone={reload} />
          ) : (
            <ConfirmButton label="Suspend" icon={<Ban className="h-3.5 w-3.5" />} title="Suspend organization?" message={`All users of ${r.name} will be blocked until it is reactivated (may take up to a minute to apply).`} confirmLabel="Suspend"
              successMessage="Organization suspended" onConfirm={() => apiPatch(`/api/organizations/${r._id}`, { status: 'SUSPENDED' })} onDone={reload} />
          )}
        </>
      )} />
  );
}
