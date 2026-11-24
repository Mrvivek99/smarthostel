import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BedDouble, Building2, CheckCircle2, CircleDollarSign, DoorOpen, Hotel, Layers, MessageSquareWarning, Plane, TrendingUp, UserCog, Users, Wallet } from 'lucide-react';
import { apiGet, errMsg } from '../lib/api';
import StatCard from '../components/StatCard';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/States';
import { inr, num, titleCase } from '../lib/format';
import type { Row } from '../types';

/*
 * Expected GET /api/admin/dashboard payload (tolerant of aliases):
 * data: {
 *   stats: { totalStudents, totalWardens, totalHostels, totalBuildings, totalRooms, totalBeds, occupiedBeds,
 *            availableBeds, pendingFees, collectedFees, monthlyRevenue, pendingComplaints, activeLeaves },
 *   charts: { monthlyCollection: [{month, amount}], occupancy: [{hostel, occupied, available}],
 *             registrations: [{month, count}], complaints: [{status|category, count}],
 *             revenueComparison: [{month, revenue, expenses}], paymentStatus: [{status, count}] }
 * }
 * Row shape is detected automatically: first string key = label, numeric keys = series.
 */
const COLORS = ['#7c3aed', '#1b2852', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#a78bfa'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pick = (o: Row | undefined, keys: string[]): number => {
  for (const k of keys) if (o && o[k] != null && !isNaN(Number(o[k]))) return Number(o[k]);
  return 0;
};

const CHART_ALIASES: Record<string, string[]> = {
  monthlyCollection: ['monthlyCollection', 'monthlyFeeCollection', 'feeCollection', 'monthlyFees'],
  occupancy: ['occupancy', 'hostelOccupancy'],
  registrations: ['registrations', 'studentRegistrations', 'studentRegistration'],
  complaints: ['complaints', 'complaintStats', 'complaintStatistics'],
  revenueComparison: ['revenueComparison', 'revenue'],
  paymentStatus: ['paymentStatus', 'payments'],
};

function chartRows(data: Row, key: string): Row[] {
  for (const k of CHART_ALIASES[key]) {
    const v = data?.charts?.[k] ?? data?.[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function normalise(rows: Row[]) {
  const flat = rows.map((r) => {
    const out: Row = { ...r };
    if (r._id && typeof r._id === 'object') { Object.assign(out, r._id); delete out._id; }
    const label = out.label ?? out.name ?? out.hostel ?? out.hostelName ?? out.status ?? out.category ?? (out.month != null ? (typeof out.month === 'number' ? `${MONTHS[(out.month - 1) % 12]}${out.year ? ` ${String(out.year).slice(2)}` : ''}` : out.month) : undefined) ?? out.date ?? out._id ?? '';
    out.__label = typeof label === 'string' && /^[A-Z_]+$/.test(label) ? titleCase(label) : String(label);
    return out;
  });
  const skip = new Set(['__label', 'year', 'month', '__v']);
  const series: string[] = [];
  for (const r of flat) for (const [k, v] of Object.entries(r)) if (!skip.has(k) && typeof v === 'number' && !series.includes(k)) series.push(k);
  return { rows: flat, series };
}

function ChartCard({ title, subtitle, children, empty }: { title: string; subtitle?: string; children: ReactNode; empty: boolean }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-navy-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      <div className="h-72 mt-4">{empty ? <EmptyState title="No data yet" description="This chart fills in as activity is recorded." /> : children}</div>
    </div>
  );
}

const tick = { fontSize: 12, fill: '#94a3b8' };
const tipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -8px rgba(19,28,59,.15)', fontSize: 12 };
const money = (v: any) => inr(v);

function Axes({ money: m }: { money?: boolean }) {
  return <><CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} /><XAxis dataKey="__label" tick={tick} tickLine={false} axisLine={false} /><YAxis tick={tick} tickLine={false} axisLine={false} width={m ? 56 : 36} tickFormatter={m ? (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v) : undefined} allowDecimals={false} /></>;
}

function PieBlock({ rows, series, donut }: { rows: Row[]; series: string[]; donut?: boolean }) {
  const key = series.find((s) => /count|total|value|amount/i.test(s)) ?? series[0];
  const data = rows.map((r) => ({ name: r.__label, value: Number(r[key]) || 0 })).filter((d) => d.value > 0);
  if (!data.length) return <EmptyState title="No data yet" />;
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={donut ? 55 : 0} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tipStyle} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await apiGet<Row>('/api/admin/dashboard')); } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState text="Loading dashboard…" />;
  if (error || !data) return <ErrorState message={error ?? 'No data'} onRetry={load} />;

  const s: Row = data.stats ?? data.counts ?? data;
  const totalBeds = pick(s, ['totalBeds', 'beds']);
  const occupied = pick(s, ['occupiedBeds', 'occupied']);
  const available = pick(s, ['availableBeds', 'available']) || Math.max(0, totalBeds - occupied);

  const cards: { label: string; value: string; icon: ReactNode; tone: any }[] = [
    { label: 'Total students', value: num(pick(s, ['totalStudents', 'students'])), icon: <Users className="h-6 w-6" />, tone: 'purple' },
    { label: 'Total wardens', value: num(pick(s, ['totalWardens', 'wardens'])), icon: <UserCog className="h-6 w-6" />, tone: 'navy' },
    { label: 'Total hostels', value: num(pick(s, ['totalHostels', 'hostels'])), icon: <Hotel className="h-6 w-6" />, tone: 'sky' },
    { label: 'Total buildings', value: num(pick(s, ['totalBuildings', 'buildings'])), icon: <Building2 className="h-6 w-6" />, tone: 'navy' },
    { label: 'Total rooms', value: num(pick(s, ['totalRooms', 'rooms'])), icon: <DoorOpen className="h-6 w-6" />, tone: 'purple' },
    { label: 'Total beds', value: num(totalBeds), icon: <Layers className="h-6 w-6" />, tone: 'sky' },
    { label: 'Occupied beds', value: num(occupied), icon: <BedDouble className="h-6 w-6" />, tone: 'rose' },
    { label: 'Available beds', value: num(available), icon: <CheckCircle2 className="h-6 w-6" />, tone: 'green' },
    { label: 'Pending fees', value: inr(pick(s, ['pendingFees', 'totalPendingFees', 'feesPending'])), icon: <Wallet className="h-6 w-6" />, tone: 'amber' },
    { label: 'Collected fees', value: inr(pick(s, ['collectedFees', 'totalCollectedFees', 'feesCollected'])), icon: <CircleDollarSign className="h-6 w-6" />, tone: 'green' },
    { label: 'Monthly revenue', value: inr(pick(s, ['monthlyRevenue', 'revenueThisMonth'])), icon: <TrendingUp className="h-6 w-6" />, tone: 'purple' },
    { label: 'Pending complaints', value: num(pick(s, ['pendingComplaints', 'openComplaints'])), icon: <MessageSquareWarning className="h-6 w-6" />, tone: 'rose' },
    { label: 'Active leave requests', value: num(pick(s, ['activeLeaves', 'activeLeaveRequests', 'pendingLeaves', 'leaveRequests'])), icon: <Plane className="h-6 w-6" />, tone: 'amber' },
  ];

  const collection = normalise(chartRows(data, 'monthlyCollection'));
  let occ = normalise(chartRows(data, 'occupancy'));
  if (!occ.rows.length && totalBeds > 0) occ = normalise([{ name: 'All hostels', occupied, available }]);
  const reg = normalise(chartRows(data, 'registrations'));
  const comp = normalise(chartRows(data, 'complaints'));
  const rev = normalise(chartRows(data, 'revenueComparison'));
  const pay = normalise(chartRows(data, 'paymentStatus'));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of hostel operations, finances and occupancy." actions={<button className="btn-secondary" onClick={load}>Refresh</button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((c) => <StatCard key={c.label} {...c} />)}</div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Monthly fee collection" subtitle="Amount collected per month" empty={!collection.rows.length}>
          <ResponsiveContainer><AreaChart data={collection.rows}>
            <defs><linearGradient id="gFee" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient></defs>
            <Axes money /><Tooltip contentStyle={tipStyle} formatter={money} />
            {collection.series.slice(0, 1).map((k) => <Area key={k} type="monotone" dataKey={k} name={titleCase(k)} stroke="#7c3aed" strokeWidth={2.5} fill="url(#gFee)" />)}
          </AreaChart></ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hostel occupancy" subtitle="Occupied vs available beds" empty={!occ.rows.length}>
          <ResponsiveContainer><BarChart data={occ.rows}>
            <Axes /><Tooltip contentStyle={tipStyle} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {occ.series.slice(0, 3).map((k, i) => <Bar key={k} dataKey={k} name={titleCase(k)} stackId="o" fill={['#1b2852', '#a78bfa', '#10b981'][i]} radius={i === Math.min(occ.series.length, 3) - 1 ? [6, 6, 0, 0] : 0} />)}
          </BarChart></ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Student registrations" subtitle="New students over time" empty={!reg.rows.length}>
          <ResponsiveContainer><LineChart data={reg.rows}>
            <Axes /><Tooltip contentStyle={tipStyle} />
            {reg.series.slice(0, 1).map((k) => <Line key={k} type="monotone" dataKey={k} name={titleCase(k)} stroke="#1b2852" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed' }} />)}
          </LineChart></ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaint statistics" subtitle="Complaints by status or category" empty={!comp.rows.length}>
          <ResponsiveContainer><BarChart data={comp.rows} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
            <XAxis type="number" tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="__label" tick={tick} tickLine={false} axisLine={false} width={90} />
            <Tooltip contentStyle={tipStyle} />
            {comp.series.slice(0, 1).map((k) => <Bar key={k} dataKey={k} name={titleCase(k)} fill="#7c3aed" radius={[0, 6, 6, 0]} />)}
          </BarChart></ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue comparison" subtitle="Revenue against expenses or previous period" empty={!rev.rows.length}>
          <ResponsiveContainer><BarChart data={rev.rows}>
            <Axes money /><Tooltip contentStyle={tipStyle} formatter={money} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {rev.series.slice(0, 3).map((k, i) => <Bar key={k} dataKey={k} name={titleCase(k)} fill={['#7c3aed', '#1b2852', '#0ea5e9'][i]} radius={[6, 6, 0, 0]} />)}
          </BarChart></ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment status" subtitle="Share of payments by status" empty={!pay.rows.length}>
          <PieBlock rows={pay.rows} series={pay.series} donut />
        </ChartCard>
      </div>
      {/* complaints pie is intentionally a bar chart above; PieBlock reused for payments */}
      <span className="hidden">{comp.series.length}</span>
    </div>
  );
}
