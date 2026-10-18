import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps =
  | ({ multiline?: false } & { label: string; id: string; hint?: string; errors?: string[] } & InputHTMLAttributes<HTMLInputElement>)
  | ({ multiline: true } & { label: string; id: string; hint?: string; errors?: string[] } & TextareaHTMLAttributes<HTMLTextAreaElement>);

const control =
  "w-full rounded-lg border bg-surface px-3 py-2 text-[16px] placeholder:text-muted/60 aria-[invalid=true]:border-full";

/**
 * Label + input/textarea with hint and per-field errors (from the API's
 * `details`). Pass `autocomplete`, `type`, `required` etc. through as usual.
 */
export function Field(props: FieldProps) {
  const { label, id, hint, errors } = props;
  const describedBy = [hint ? `${id}-hint` : null, errors?.length ? `${id}-error` : null].filter(Boolean).join(" ");

  const controlProps = {
    id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": errors?.length ? true : undefined,
    className: control,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {props.multiline ? (
        <textarea {...props} {...(controlProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...props} {...(controlProps as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-[14px] text-muted">
          {hint}
        </p>
      )}
      {errors?.map((error) => (
        <p key={error} id={`${id}-error`} role="alert" className="text-[14px] text-full">
          {error}
        </p>
      ))}
    </div>
  );
}
