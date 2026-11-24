import { ReactNode, useState } from 'react';
import ConfirmationDialog from './ConfirmationDialog';
import { useToast } from '../context/ToastContext';

interface Props {
  label: string;
  icon?: ReactNode;
  title: string;
  message: string;
  confirmLabel?: string;
  successMessage: string;
  danger?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  onConfirm: () => Promise<unknown>;
  onDone: () => void;
}

/** Button that asks for confirmation, then runs an API call (cancel fee, mark exit, ...). */
export default function ConfirmButton({ label, icon, title, message, confirmLabel, successMessage, danger = false, variant = 'secondary', onConfirm, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const cls = variant === 'danger' ? 'btn-danger' : variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <>
      <button className={`${cls} btn-sm`} onClick={() => setOpen(true)}>{icon}{label}</button>
      <ConfirmationDialog open={open} onClose={() => setOpen(false)} title={title} message={message} confirmLabel={confirmLabel ?? label} danger={danger}
        onConfirm={async () => { await onConfirm(); toast.success(successMessage); onDone(); }} />
    </>
  );
}
