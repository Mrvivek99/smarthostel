import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Palette, UserCircle } from 'lucide-react';
import EntityForm from '../components/EntityForm';
import { PageHeader } from '../components/States';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiPatch, apiPost } from '../lib/api';
import { passwordRule, phoneRule } from '../lib/fields';
import { titleCase } from '../lib/format';
import type { FieldDef } from '../types';

const profileFields: FieldDef[] = [
  { name: 'name', label: 'Full name', required: true, minLength: 2 },
  { name: 'phone', label: 'Phone', type: 'tel', ...phoneRule },
];

const passwordFields: FieldDef[] = [
  { name: 'currentPassword', label: 'Current password', type: 'password', required: true, wide: true },
  { name: 'newPassword', label: 'New password', type: 'password', required: true, ...passwordRule,
    validate: (v, all) => passwordRule.validate?.(v, all) ?? (v === all.currentPassword ? 'New password must be different from the current one' : undefined) },
  { name: 'confirmPassword', label: 'Confirm new password', type: 'password', required: true, validate: (v, all) => (v !== all.newPassword ? 'Passwords do not match' : undefined) },
];

function Card({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">{icon}</div>
        <div><h2 className="font-semibold text-navy-900">{title}</h2>{subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}</div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [pwKey, setPwKey] = useState(0);
  const u = user as any;
  const org = u?.organizationInfo;
  const canEditProfile = user?.role === 'ADMIN';
  const uid = user?._id ?? user?.id;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your profile, password and organization details." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card icon={<UserCircle className="h-5 w-5" />} title="Profile" subtitle={canEditProfile ? 'Update how your name appears across the platform.' : 'Platform owner accounts are managed outside the admin console.'}>
          <dl className="grid grid-cols-2 gap-3 text-sm mb-5">
            <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-800 break-all">{user?.email}</dd></div>
            <div><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-800">{titleCase(user?.role ?? '')}</dd></div>
          </dl>
          {canEditProfile && uid ? (
            <EntityForm key={`${u?.name}-${u?.phone}`} fields={profileFields} mode="edit" initial={{ name: u?.name, phone: u?.phone }} submitLabel="Save profile" onCancel={() => { /* nothing to dismiss */ }}
              onSubmit={async (p) => { await apiPatch(`/api/admin/users/${uid}`, p); await refresh(); toast.success('Profile updated'); }} />
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-800">{user?.name}</dd></div></dl>
          )}
        </Card>

        <Card icon={<KeyRound className="h-5 w-5" />} title="Change password" subtitle="Use at least 8 characters with a letter and a number.">
          <EntityForm key={pwKey} fields={passwordFields} submitLabel="Update password" onCancel={() => setPwKey((k) => k + 1)}
            onSubmit={async (p) => {
              await apiPost('/api/auth/change-password', { currentPassword: p.currentPassword, newPassword: p.newPassword });
              toast.success('Password changed');
              setPwKey((k) => k + 1);
            }} />
        </Card>

        <Card icon={<Palette className="h-5 w-5" />} title="Organization" subtitle={org ? 'Branding and plan for your organization.' : undefined}>
          {org ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {org.logoUrl ? <img src={org.logoUrl} alt={`${org.name} logo`} className="h-14 w-14 rounded-xl object-cover border border-slate-100" /> : <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: org.brandColor || '#6a3ae6' }}>{String(org.name ?? '?').charAt(0).toUpperCase()}</div>}
                <div><p className="font-semibold text-navy-900">{org.name}</p><p className="text-xs text-slate-500">Code: {org.slug}</p></div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-500">Plan</dt><dd className="font-medium">{titleCase(org.plan ?? '')}</dd></div>
                <div><dt className="text-slate-500">Brand colour</dt><dd className="font-medium flex items-center gap-2"><span className="inline-block h-4 w-4 rounded border border-slate-200" style={{ background: org.brandColor || '#6a3ae6' }} />{org.brandColor || '#6a3ae6'}</dd></div>
              </dl>
              <p className="text-xs text-slate-500">Students register with the organization code above. Branding changes are made by the platform owner; <Link to="/admin/subscriptions" className="text-brand-700 hover:underline">manage your plan</Link> from Subscriptions.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">You are signed in as the platform owner, so there is no single organization attached to this account. Edit an organization's name, logo, brand colour and status from <Link to="/admin/organizations" className="text-brand-700 hover:underline">Organizations</Link>.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
