import { ReactNode, useState } from 'react';
import type { FieldDef, Row } from '../types';
import Modal from './Modal';
import EntityForm from './EntityForm';
import { useToast } from '../context/ToastContext';

interface Props {
  label: string;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  fields: FieldDef[];
  initial?: Row;
  submitLabel?: string;
  successMessage: string;
  onSubmit: (payload: Row) => Promise<unknown>;
  onDone: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

/** Button that opens a modal form and runs a custom action (approve, reject, assign, refund, ...). */
export default function ActionButton({ label, icon, title, subtitle, fields, initial, submitLabel, successMessage, onSubmit, onDone, variant = 'secondary' }: Props) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const cls = variant === 'danger' ? 'btn-danger' : variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <>
      <button className={`${cls} btn-sm`} onClick={() => setOpen(true)}>{icon}{label}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} subtitle={subtitle}>
        <EntityForm fields={fields} initial={initial} submitLabel={submitLabel ?? label}
          onCancel={() => setOpen(false)}
          onSubmit={async (p) => { await onSubmit(p); toast.success(successMessage); setOpen(false); onDone(); }} />
      </Modal>
    </>
  );
}
