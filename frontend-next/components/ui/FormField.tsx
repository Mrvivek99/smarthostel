import { forwardRef, useId } from 'react';

interface Common {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

function Wrap({ id, label, error, hint, required, className = '', children }: Common & { id: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-navy-400">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>;
export const FormField = forwardRef<HTMLInputElement, InputProps>(function FormField({ label, error, hint, className, ...rest }, ref) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={rest.required} className={className}>
      <input ref={ref} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className={`input ${error ? 'input-error' : ''}`} {...rest} />
    </Wrap>
  );
});

type SelectProps = Common & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> & { options: { value: string; label: string }[]; placeholder?: string };
export function SelectField({ label, error, hint, className, options, placeholder, ...rest }: SelectProps) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={rest.required} className={className}>
      <select id={id} aria-invalid={!!error} className={`input ${error ? 'input-error' : ''}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Wrap>
  );
}

type AreaProps = Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;
export function TextareaField({ label, error, hint, className, ...rest }: AreaProps) {
  const id = useId();
  return (
    <Wrap id={id} label={label} error={error} hint={hint} required={rest.required} className={className}>
      <textarea id={id} rows={4} aria-invalid={!!error} className={`input resize-y ${error ? 'input-error' : ''}`} {...rest} />
    </Wrap>
  );
}
