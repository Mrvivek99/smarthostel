'use client';
import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { FormField, TextareaField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { sendContact, type ContactState } from './actions';

const initial: ContactState = { ok: false, message: '' };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
      {pending && <Spinner className="h-4 w-4" />} {pending ? 'Sending...' : 'Send message'}
    </button>
  );
}

export function ContactForm() {
  const [state, action] = useFormState(sendContact, initial);
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      form.current?.reset();
    } else toast.error(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.ok) {
    return (
      <div className="card flex flex-col items-center p-10 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="mt-3 text-xl font-semibold">Message sent</h2>
        <p className="mt-1 text-sm text-navy-500">{state.message}</p>
      </div>
    );
  }
  return (
    <form ref={form} action={action} className="card space-y-4 p-6 sm:p-8" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Your name" name="name" required autoComplete="name" error={state.errors?.name} />
        <FormField label="Email" name="email" type="email" required autoComplete="email" error={state.errors?.email} />
      </div>
      <FormField label="Subject" name="subject" required error={state.errors?.subject} />
      <TextareaField label="Message" name="message" required rows={6} hint="At least 10 characters" error={state.errors?.message} />
      <Submit />
    </form>
  );
}
