'use client';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Spinner } from './States';

export function ConfirmationDialog({
  open, title, message, confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-sm text-navy-600">{message}</div>
      </div>
    </Modal>
  );
}
