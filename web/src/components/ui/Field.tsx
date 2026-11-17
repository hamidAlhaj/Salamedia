import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  name: string;
  hint?: string;
  /** Arabic error message, shown under the control and linked with aria-describedby. */
  error?: string;
}

type InputProps = BaseProps & { textarea?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;
type TextareaProps = BaseProps & { textarea: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name">;

const CONTROL =
  "w-full rounded-lg border bg-surface-2 px-3 text-text placeholder:text-muted transition-colors " +
  "focus:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

/** Label + input (or textarea) + hint + error, wired for screen readers. */
export function Field(props: InputProps | TextareaProps) {
  const { label, name, hint, error, textarea, id, className = "", ...rest } = props;
  const controlId = id ?? `field-${name}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const classes = `${CONTROL} ${error ? "border-danger" : "border-transparent"} ${className}`;

  const shared = {
    id: controlId,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="text-sm font-semibold text-text">
        {label}
      </label>
      {textarea ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          {...shared}
          className={`${classes} min-h-24 py-2`}
        />
      ) : (
        <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} {...shared} className={`${classes} h-11`} />
      )}
      {hint && (
        <p id={hintId} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm leading-5 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
