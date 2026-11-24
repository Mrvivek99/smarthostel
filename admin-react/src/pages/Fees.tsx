import { useState } from 'react';
import { BellRing, CircleDollarSign, Clock, Wallet, XCircle, Zap, ListChecks, Layers } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import ConfirmButton from '../components/ConfirmButton';
import EntityForm from '../components/EntityForm';
import StatCard from '../components/StatCard';
import Tabs from '../components/Tabs';
import { PageHeader, StatusBadge } from '../components/States';
import { useToast } from '../context/ToastContext';
import { apiPatch, apiPost, errMsg } from '../lib/api';
import { dateCol, enumCol, moneyCol, refCol, textCol } from '../lib/cols';
import { FEE_CATEGORIES, FEE_FREQUENCIES, hostelField, opts, ROOM_TYPES } from '../lib/fields';
import { inr, label, num } from '../lib/format';
import { enumFilter, intRule, isoMonth, studentLabel, useHostelFilter } from '../lib/pageKit';
import type { Column, FieldDef, Row } from '../types';

/* ---------------- Fee structures ---------------- */
const structureColumns: Column[] = [
  textCol('name', 'Name'),
  { key: 'hostel', header: 'Hostel', accessor: (r) => label(r.hostel) || 'All hostels' },
  { key: 'roomType', header: 'Room type', accessor: (r) => (r.roomType ? r.roomType.charAt(0) + r.roomType.slice(1).toLowerCase() : 'All types') },
  { key: 'total', header: 'Total', accessor: (r) => (r.items ?? []).reduce((s: number, i: Row) => s + (Number(i.amount) || 0), 0), render: (r) => inr((r.items ?? []).reduce((s: number, i: Row) => s + (Number(i.amount) || 0), 0)) },
  { key: 'items', header: 'Items', accessor: (r) => (r.items ?? []).map((i: Row) => `${i.label || i.category} (${inr(i.amount)})`).join(', ') },
  { key: 'frequency', header: 'Frequency', accessor: (r) => (r.frequency === 'ONE_TIME' ? 'One time' : 'Monthly') },
  { key: 'dueDay', header: 'Due day', accessor: (r) => r.dueDay },
  moneyCol('lateFeePerDay', 'Late fee / day'),
  { key: 'isActive', header: 'Status', accessor: (r) => (r.isActive === false ? 'Inactive' : 'Active'), render: (r) => <StatusBadge value={r.isActive !== false} /> },
];

const structureFields: FieldDef[] = [
  { name: 'name', label: 'Structure name', required: true, hint: 'Must be unique, e.g. "Monthly hostel fee - Double"' },
  { ...hostelField(false), hint: 'Leave blank to apply to every hostel (cannot be cleared once set)' },
  { name: 'roomType', label: 'Room type', type: 'select', options: ROOM_TYPES, hint: 'Leave blank to apply to every room type' },
  { name: 'items', label: 'Fee items', type: 'lineitems', options: FEE_CATEGORIES },
  { name: 'frequency', label: 'Frequency', type: 'select', options: FEE_FREQUENCIES, required: true, default: 'MONTHLY' },
  { name: 'dueDay', label: 'Due day of month', type: 'number', min: 1, max: 28, default: 10, validate: intRule, hint: '1 to 28' },
  { name: 'lateFeePerDay', label: 'Late fee per day (₹)', type: 'number', min: 0, default: 0 },
  { name: 'allowPartial', label: 'Allow partial payments', type: 'checkbox', default: false, hint: 'Allow partial payments' },
  { name: 'isActive', label: 'Active', type: 'checkbox', default: true, hint: 'Active (can be used to generate fees)' },
];

function Structures() {
  const hostel = useHostelFilter();
  return (
    <CrudPage hideHeader title="Fee structures" entity="Fee structure" endpoint="/api/fee-structures" columns={structureColumns} fields={structureFields}
      filters={[hostel, enumFilter('frequency', 'Frequency', FEE_FREQUENCIES), enumFilter('roomType', 'Room type', ROOM_TYPES)]}
      emptyDescription="Define what you charge, then generate fees for allocated students."
      deleteMessage={(r) => `Delete "${r.name}"? Structures that already generated fees cannot be deleted; deactivate them instead.`} />
  );
}

/* ---------------- Student fees ---------------- */
const FEE_STATUS_OPTIONS = opts('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');
const effective = (r: Row) => (r.overdue && r.status !== 'PAID' ? 'OVERDUE' : r.status);

const feeColumns: Column[] = [
  refCol('student', 'Student'),
  textCol('title', 'Fee'),
  textCol('period', 'Period'),
  moneyCol('amount', 'Amount'),
  moneyCol('lateFee', 'Late fee'),
  moneyCol('paidAmount', 'Paid'),
  moneyCol('balance', 'Balance'),
  dateCol('dueDate', 'Due date'),
  { key: 'status', header: 'Status', accessor: (r) => effective(r), render: (r) => <StatusBadge value={effective(r)} /> },
];

const feeFields: FieldDef[] = [
  { name: 'student', label: 'Student', type: 'select', required: true, createOnly: true, remote: { endpoint: '/api/students', filter: (s) => s.status !== 'INACTIVE', label: studentLabel } },
  { name: 'title', label: 'Title', required: true, createOnly: true, placeholder: 'e.g. Damage charge' },
  { name: 'category', label: 'Category', type: 'select', options: FEE_CATEGORIES, createOnly: true, default: 'OTHER' },
  { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, createOnly: true, min: 0.01, max: 10000000 },
  { name: 'dueDate', label: 'Due date', type: 'date', required: true },
  { name: 'lateFeePerDay', label: 'Late fee per day (₹)', type: 'number', min: 0, default: 0 },
  { name: 'allowPartial', label: 'Allow partial payments', type: 'checkbox', createOnly: true, default: false, hint: 'Allow partial payments' },
];

function StudentFees() {
  const hostel = useHostelFilter();
  return (
    <CrudPage hideHeader title="Student fees" entity="Fee" endpoint="/api/fees" columns={feeColumns} fields={feeFields} canDelete={false}
      canEdit={(r) => r.status === 'PENDING' || r.status === 'PARTIAL'}
      filters={[enumFilter('status', 'Status', FEE_STATUS_OPTIONS), { key: 'overdue', label: 'Due', options: [{ value: 'Overdue', label: 'Overdue' }, { value: 'On track', label: 'Not overdue' }], accessor: (r) => (r.overdue ? 'Overdue' : 'On track') }, hostel]}
      emptyDescription="Generate fees from a fee structure, or add a one-off charge for a student."
      summary={(rows) => {
        const live = rows.filter((r) => r.status !== 'CANCELLED');
        const billed = live.reduce((s, r) => s + (Number(r.amount) || 0) + (Number(r.lateFee) || 0), 0);
        const paid = live.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
        const outstanding = live.reduce((s, r) => s + (Number(r.balance) || 0), 0);
        const overdue = live.filter((r) => r.overdue).length;
        return (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
            <StatCard label="Billed" value={inr(billed)} icon={<Wallet className="h-6 w-6" />} tone="navy" hint={`${num(live.length)} fees`} />
            <StatCard label="Collected" value={inr(paid)} icon={<CircleDollarSign className="h-6 w-6" />} tone="green" />
            <StatCard label="Outstanding" value={inr(outstanding)} icon={<Clock className="h-6 w-6" />} tone="amber" />
            <StatCard label="Overdue fees" value={num(overdue)} icon={<XCircle className="h-6 w-6" />} tone="rose" />
          </div>
        );
      }}
      rowActions={(r, reload) => (r.status === 'PENDING' || r.status === 'PARTIAL') && !(Number(r.paidAmount) > 0) ? (
        <ConfirmButton label="Cancel fee" title="Cancel this fee?" message={`"${r.title}" will be cancelled and removed from the student's dues. Fees with payments must be refunded first.`} confirmLabel="Cancel fee"
          successMessage="Fee cancelled" onConfirm={() => apiPatch(`/api/fees/${r._id}`, { status: 'CANCELLED' })} onDone={reload} />
      ) : null} />
  );
}

/* ---------------- Generate ---------------- */
const generateFields: FieldDef[] = [
  { name: 'feeStructure', label: 'Fee structure', type: 'select', required: true, remote: { endpoint: '/api/fee-structures', params: { active: true }, label: (s) => `${s.name}${s.hostel?.name ? ` · ${s.hostel.name}` : ''}` }, hint: 'Only active structures are listed' },
  { name: 'period', label: 'Period', required: true, default: isoMonth(), pattern: /^(\d{4}-\d{2}|[A-Z_]{3,20})$/, patternMessage: 'Use YYYY-MM (e.g. 2026-11) or an uppercase label such as ADMISSION', hint: 'YYYY-MM for monthly fees, or an uppercase label like ADMISSION for one-time fees' },
  { name: 'dueDate', label: 'Due date (optional)', type: 'date', hint: 'Defaults to the structure due day for monthly periods' },
  { name: 'hostel', label: 'Limit to hostel (optional)', type: 'select', remote: { endpoint: '/api/hostels', label: (h) => h.name }, hint: 'Leave blank to bill every hostel the structure applies to' },
];

function Generate() {
  const [key, setKey] = useState(0);
  const [result, setResult] = useState<{ targeted: number; created: number; skipped: number } | null>(null);
  const toast = useToast();
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="card p-6 lg:col-span-2">
        <h2 className="font-semibold text-navy-900">Generate fees</h2>
        <p className="text-sm text-slate-500 mt-1 mb-5">Creates one fee per actively allocated student for the chosen structure and period. Running it again for the same period is safe: existing fees are skipped.</p>
        <EntityForm key={key} fields={generateFields} submitLabel="Generate fees" onCancel={() => { setKey((k) => k + 1); setResult(null); }}
          onSubmit={async (p) => {
            const r = await apiPost('/api/fees/generate', p);
            setResult(r);
            toast.success(r.created ? `${r.created} fee${r.created === 1 ? '' : 's'} generated` : 'No new fees were generated');
          }} />
      </div>
      <div className="card p-6 h-fit">
        <h2 className="font-semibold text-navy-900">Result</h2>
        {result ? (
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Students targeted</dt><dd className="font-semibold">{num(result.targeted)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Fees created</dt><dd className="font-semibold text-emerald-600">{num(result.created)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Already existed (skipped)</dt><dd className="font-semibold">{num(result.skipped ?? Math.max(0, result.targeted - result.created))}</dd></div>
          </dl>
        ) : <p className="text-sm text-slate-400 mt-3">Run a generation to see how many students were billed.</p>}
      </div>
    </div>
  );
}

function ReminderButton() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn-secondary" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const r = await apiPost('/api/fees/reminders?days=3');
        toast.success(r.reminded ? `Reminders sent for ${r.reminded} fee${r.reminded === 1 ? '' : 's'}` : 'No fees need a reminder right now');
      } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
    }}><BellRing className="h-4 w-4" />{busy ? 'Sending…' : 'Send reminders'}</button>
  );
}

export default function Fees() {
  const [tab, setTab] = useState('fees');
  return (
    <div>
      <PageHeader title="Fees" subtitle="Define fee structures, bill students and track what is collected." actions={<ReminderButton />} />
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: 'fees', label: 'Student fees', icon: <ListChecks className="h-4 w-4" /> },
        { id: 'structures', label: 'Fee structures', icon: <Layers className="h-4 w-4" /> },
        { id: 'generate', label: 'Generate fees', icon: <Zap className="h-4 w-4" /> },
      ]} />
      {tab === 'fees' && <StudentFees />}
      {tab === 'structures' && <Structures />}
      {tab === 'generate' && <Generate />}
    </div>
  );
}
