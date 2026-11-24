import { CircleDollarSign, Receipt } from 'lucide-react';
import CrudPage from '../components/CrudPage';
import StatCard from '../components/StatCard';
import { enumCol, moneyCol } from '../lib/cols';
import { EXPENSE_CATEGORIES, hostelField, urlRule } from '../lib/fields';
import { fmtDate, inr, label, titleCase } from '../lib/format';
import { enumFilter, useHostelFilter } from '../lib/pageKit';
import type { Column, FieldDef } from '../types';

const columns: Column[] = [
  { key: 'date', header: 'Date', sortable: true, accessor: (r) => r.date, render: (r) => fmtDate(r.date) },
  { key: 'hostel', header: 'Hostel', accessor: (r) => label(r.hostel) },
  enumCol('category', 'Category'),
  moneyCol('amount', 'Amount'),
  { key: 'description', header: 'Description', accessor: (r) => r.description ?? '', className: 'max-w-xs truncate' },
  { key: 'billUrl', header: 'Bill', accessor: (r) => r.billUrl ?? '', render: (r) => (r.billUrl ? <a className="text-brand-700 hover:underline" href={r.billUrl} target="_blank" rel="noopener noreferrer">View bill</a> : <span className="text-slate-300">—</span>) },
];

const fields: FieldDef[] = [
  hostelField(true),
  { name: 'category', label: 'Category', type: 'select', options: EXPENSE_CATEGORIES, required: true },
  { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0.01, max: 10000000 },
  { name: 'date', label: 'Expense date', type: 'date', required: true },
  { name: 'description', label: 'Description', type: 'textarea', validate: (v) => (String(v).length > 300 ? 'Maximum 300 characters' : undefined) },
  { name: 'billUrl', label: 'Bill URL', placeholder: 'https://…', hint: 'Optional link to the bill or receipt', ...urlRule },
];

export default function Expenses() {
  const hostel = useHostelFilter();
  return (
    <CrudPage title="Expenses" subtitle="Operating costs for each hostel." entity="Expense" endpoint="/api/expenses"
      columns={columns} fields={fields} filters={[hostel, enumFilter('category', 'Category', EXPENSE_CATEGORIES)]}
      emptyDescription="Record electricity, water, maintenance and other costs here."
      summary={(rows) => {
        const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        const byCat = new Map<string, number>();
        rows.forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + (Number(r.amount) || 0)));
        const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];
        return (
          <div className="grid gap-4 sm:grid-cols-3 mb-5">
            <StatCard label="Total expenses" value={inr(total)} icon={<CircleDollarSign className="h-6 w-6" />} tone="rose" hint={`${rows.length} entries`} />
            <StatCard label="Top category" value={top ? titleCase(top[0]) : '—'} icon={<Receipt className="h-6 w-6" />} tone="amber" hint={top ? inr(top[1]) : undefined} />
            <StatCard label="Average entry" value={inr(rows.length ? total / rows.length : 0)} icon={<CircleDollarSign className="h-6 w-6" />} tone="navy" />
          </div>
        );
      }} />
  );
}
