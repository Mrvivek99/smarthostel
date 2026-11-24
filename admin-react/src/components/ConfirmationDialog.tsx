import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { errMsg } from '../lib/api';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function ConfirmationDialog({ open, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setErr(null);
    try { await onConfirm(); onClose(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={title} size="sm"
      footer={<>
        <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={run} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </>}>
      <div className="flex gap-3">
        <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'}`}><AlertTriangle className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-slate-600">{message}</p>
          {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
        </div>
      </div>
    </Modal>
  );
}
