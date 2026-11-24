'use client';
import { useRef, useState } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { uploadFile, type UploadedFile } from '@/lib/client';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

type Folder = Parameters<typeof uploadFile>[1];

/** Multi-file signed upload (Cloudinary) with progress state and removal. */
export function FileUpload({
  label, folder, value, onChange, max = 5, hint,
}: {
  label: string;
  folder: Folder;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  max?: number;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    const room = max - value.length;
    if (room <= 0) return toast.error(`You can attach up to ${max} files`);
    setBusy(true);
    const added: UploadedFile[] = [];
    for (const f of Array.from(list).slice(0, room)) {
      try {
        added.push(await uploadFile(f, folder));
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }
    if (added.length) onChange([...value, ...added]);
    setBusy(false);
    if (input.current) input.current.value = '';
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((f, i) => (
          <span key={f.url} className="flex items-center gap-1.5 rounded-xl border border-navy-200 bg-navy-50 px-2.5 py-1.5 text-xs">
            <FileText className="h-3.5 w-3.5 text-brand-600" />
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="max-w-[140px] truncate font-medium text-navy-700 hover:underline">File {i + 1}</a>
            <button type="button" aria-label="Remove file" onClick={() => onChange(value.filter((x) => x.url !== f.url))} className="text-navy-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {value.length < max && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Spinner className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
            {busy ? 'Uploading...' : 'Attach'}
          </button>
        )}
      </div>
      <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pick(e.target.files)} />
      <p className="mt-1 text-xs text-navy-400">{hint ?? `JPG, PNG, WEBP or PDF. Up to ${max} files.`}</p>
    </div>
  );
}
