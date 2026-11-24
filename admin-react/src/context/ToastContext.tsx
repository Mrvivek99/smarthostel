import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; message: string }
interface Ctx { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }

const ToastCtx = createContext<Ctx | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((kind: Kind, message: string) => {
    const id = ++seq;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
  }, [dismiss]);
  const value = useMemo<Ctx>(() => ({
    success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m),
  }), [push]);

  const icon = { success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, error: <AlertCircle className="h-5 w-5 text-rose-500" />, info: <Info className="h-5 w-5 text-brand-500" /> };
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:w-96" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="card flex items-start gap-3 p-3 pr-2 animate-[fadeIn_.2s_ease-out]">
            {icon[t.kind]}
            <p className="flex-1 text-sm text-slate-700 pt-0.5">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error('useToast outside ToastProvider');
  return c;
}
