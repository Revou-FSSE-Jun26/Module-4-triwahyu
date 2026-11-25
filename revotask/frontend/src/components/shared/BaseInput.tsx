import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type FieldProps = { label: string; error?: string; hint?: string };

const control =
  "w-full rounded-lg border-3 border-ink bg-well px-4 py-3 font-mono text-sm shadow-well placeholder:text-concrete-500 " +
  "disabled:opacity-60 aria-[invalid=true]:border-danger";

function Wrapper({ id, label, error, hint, children }: FieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-concrete-700">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BaseInput({
  label,
  error,
  hint,
  className = "",
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        className={`${control} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Wrapper>
  );
}

export function BaseSelect({
  label,
  error,
  hint,
  className = "",
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        className={`${control} min-h-12 ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  );
}

export function BaseTextarea({
  label,
  error,
  hint,
  className = "",
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        rows={4}
        className={`${control} resize-y ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Wrapper>
  );
}
