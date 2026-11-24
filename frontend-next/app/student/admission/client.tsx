'use client';
import { useState } from 'react';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { api, ApiClientError, type UploadedFile } from '@/lib/client';
import { useApi } from '@/lib/hooks';
import { admissionSchema } from '@/lib/validation';
import { validate, compact, type FieldErrors } from '@/lib/forms';
import { formatDate, formatDateTime, nameOf, titleCase } from '@/lib/format';
import { FormField, SelectField, TextareaField } from '@/components/ui/FormField';
import { FileUpload } from '@/components/ui/FileUpload';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { Async, Spinner, StatusBadge } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const STEPS = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] as const;
const EMPTY = {
  preferredHostel: '', preferredRoomType: '', fullName: '', dob: '', gender: '', phone: '', address: '', course: '', year: '', institution: '', enrollmentNo: '',
  guardianName: '', guardianPhone: '', guardianRelation: '', emergencyName: '', emergencyPhone: '',
};

function Tracker({ a }: { a: any }) {
  const rejected = a.status === 'REJECTED';
  const idx = rejected ? 1 : STEPS.indexOf(a.status);
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {STEPS.map((s, i) => {
        const done = i <= idx && !(rejected && i === 2);
        const last = i === 2;
        const Icon = rejected && last ? XCircle : done ? CheckCircle2 : Circle;
        return (
          <li key={s} className={`flex items-center gap-3 rounded-2xl border p-4 ${rejected && last ? 'border-red-200 bg-red-50' : done ? 'border-brand-200 bg-brand-50' : 'border-navy-100'}`}>
            <Icon className={`h-6 w-6 ${rejected && last ? 'text-red-600' : done ? 'text-brand-600' : 'text-navy-300'}`} />
            <span className="text-sm font-semibold">{rejected && last ? 'Rejected' : titleCase(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function AdmissionClient() {
  const list = useApi<any[]>('/api/admissions', { limit: 10 });
  const hostels = useApi<any[]>('/api/hostels', { limit: 100 });
  const toast = useToast();
  const [v, setV] = useState(EMPTY);
  const [docs, setDocs] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [reapply, setReapply] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  const latest = list.data?.[0];
  const showForm = !latest || (latest.status === 'REJECTED' && reapply);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...compact(v), documents: docs };
    const r = validate(admissionSchema, payload);
    if (!r.ok) {
      setErrors(r.errors);
      return toast.error('Please fix the highlighted fields.');
    }
    setErrors({});
    setBusy(true);
    try {
      await api.post('/api/admissions', payload);
      toast.success('Application submitted. You can track its status here.');
      setReapply(false);
      list.reload();
    } catch (err) {
      if (err instanceof ApiClientError && Object.keys(err.fields).length) setErrors(err.fields);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Hostel admission" subtitle="Apply for a hostel bed and track your application." />
      <Async loading={list.loading && !list.data} error={list.error} onRetry={list.reload} rows={5}>
        {latest && !showForm && (
          <div className="space-y-6">
            <Section title="Application status" actions={<StatusBadge status={latest.status} />}>
              <div className="space-y-5 p-5">
                <Tracker a={latest} />
                {latest.remarks && (
                  <div className={`rounded-xl p-4 text-sm ${latest.status === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-navy-50 text-navy-700'}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide">Remarks from the hostel office</p>
                    <p className="mt-1">{latest.remarks}</p>
                  </div>
                )}
                {latest.status === 'APPROVED' && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Your admission is approved. Once a bed is allocated it will show on the My Room page.</p>}
                {latest.status === 'REJECTED' && <button className="btn-primary" onClick={() => setReapply(true)}>Submit a new application</button>}
              </div>
            </Section>
            <Section title="Submitted details">
              <dl className="grid gap-x-6 gap-y-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Full name', latest.fullName], ['Date of birth', formatDate(latest.dob)], ['Gender', titleCase(latest.gender)], ['Phone', latest.phone],
                  ['Course / year', `${latest.course} / ${latest.year}`], ['Institution', latest.institution || '-'], ['Enrollment no.', latest.enrollmentNo || '-'],
                  ['Preferred hostel', nameOf(latest.preferredHostel)], ['Preferred room', titleCase(latest.preferredRoomType) || '-'], ['Guardian', `${latest.guardianName} (${latest.guardianRelation}) ${latest.guardianPhone}`],
                  ['Emergency contact', `${latest.emergencyName} ${latest.emergencyPhone}`], ['Submitted', formatDateTime(latest.createdAt)],
                ].map(([k, val]) => (
                  <div key={k}><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{k}</dt><dd className="mt-0.5 font-medium">{val}</dd></div>
                ))}
                <div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Address</dt><dd className="mt-0.5 font-medium">{latest.address}</dd></div>
                {Array.isArray(latest.documents) && latest.documents.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">Documents</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">{latest.documents.map((d: any, i: number) => <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:underline">Document {i + 1}</a>)}</dd>
                  </div>
                )}
              </dl>
            </Section>
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} className="space-y-6" noValidate>
            <Section title="Personal information">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <FormField label="Full name" required value={v.fullName} onChange={set('fullName')} error={errors.fullName} />
                <FormField label="Date of birth" type="date" required value={v.dob} onChange={set('dob')} error={errors.dob} />
                <SelectField label="Gender" required value={v.gender} onChange={set('gender')} placeholder="Select" error={errors.gender} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
                <FormField label="Phone" type="tel" required value={v.phone} onChange={set('phone')} error={errors.phone} />
                <TextareaField className="sm:col-span-2" label="Permanent address" rows={2} required value={v.address} onChange={set('address')} error={errors.address} />
              </div>
            </Section>
            <Section title="Academic information">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <FormField label="Course" required value={v.course} onChange={set('course')} error={errors.course} />
                <FormField label="Year of study" type="number" min={1} max={10} required value={v.year} onChange={set('year')} error={errors.year} />
                <FormField label="Institution" value={v.institution} onChange={set('institution')} error={errors.institution} />
                <FormField label="Enrollment number" value={v.enrollmentNo} onChange={set('enrollmentNo')} error={errors.enrollmentNo} />
              </div>
            </Section>
            <Section title="Guardian and emergency contact">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <FormField label="Guardian name" required value={v.guardianName} onChange={set('guardianName')} error={errors.guardianName} />
                <FormField label="Relation" required value={v.guardianRelation} onChange={set('guardianRelation')} error={errors.guardianRelation} />
                <FormField label="Guardian phone" type="tel" required value={v.guardianPhone} onChange={set('guardianPhone')} error={errors.guardianPhone} />
                <span className="hidden sm:block" />
                <FormField label="Emergency contact name" required value={v.emergencyName} onChange={set('emergencyName')} error={errors.emergencyName} />
                <FormField label="Emergency contact phone" type="tel" required value={v.emergencyPhone} onChange={set('emergencyPhone')} error={errors.emergencyPhone} />
              </div>
            </Section>
            <Section title="Preferences and documents">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <SelectField label="Preferred hostel" value={v.preferredHostel} onChange={set('preferredHostel')} placeholder="No preference" error={errors.preferredHostel} options={(hostels.data ?? []).map((h) => ({ value: h._id, label: `${h.name} (${titleCase(h.type)})` }))} />
                <SelectField label="Preferred room type" value={v.preferredRoomType} onChange={set('preferredRoomType')} placeholder="No preference" error={errors.preferredRoomType} options={['SINGLE', 'DOUBLE', 'SHARED'].map((t) => ({ value: t, label: titleCase(t) }))} />
                <div className="sm:col-span-2">
                  <FileUpload label="Supporting documents (ID proof, admission letter)" folder="documents" value={docs} onChange={setDocs} max={6} />
                  {errors.documents && <p className="mt-1 text-xs font-medium text-red-600">{errors.documents}</p>}
                </div>
              </div>
            </Section>
            <div className="flex justify-end gap-2">
              {latest && <button type="button" className="btn-secondary" onClick={() => setReapply(false)}>Cancel</button>}
              <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} {busy ? 'Submitting...' : 'Submit application'}</button>
            </div>
          </form>
        )}
      </Async>
    </>
  );
}
