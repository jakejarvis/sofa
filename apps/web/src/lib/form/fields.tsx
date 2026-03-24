import type { ReactNode } from "react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useFieldContext, useFormContext } from "./context";

function normalizeErrors(errors: unknown[]): Array<{ message?: string }> {
  return errors.map((e) => (typeof e === "string" ? { message: e } : (e as { message?: string })));
}

function TextField({
  label,
  description,
  className,
  ...inputProps
}: {
  label: ReactNode;
  description?: ReactNode;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "onBlur">) {
  const field = useFieldContext<string>();
  const id = useId();
  const hasErrors = field.state.meta.errors.length > 0;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Input
        id={id}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={hasErrors || undefined}
        className={className}
        {...inputProps}
      />
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

function TextareaField({
  label,
  description,
  className,
  ...textareaProps
}: {
  label: ReactNode;
  description?: ReactNode;
} & Omit<React.ComponentProps<"textarea">, "value" | "onChange" | "onBlur">) {
  const field = useFieldContext<string>();
  const id = useId();
  const hasErrors = field.state.meta.errors.length > 0;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
      <Textarea
        id={id}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={hasErrors || undefined}
        className={className}
        {...textareaProps}
      />
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

function CheckboxField({ label, description }: { label: ReactNode; description?: ReactNode }) {
  const field = useFieldContext<boolean>();
  const id = useId();

  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={field.state.value} onCheckedChange={field.handleChange} />
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

function SwitchField({
  label,
  description,
  size,
}: {
  label: ReactNode;
  description?: ReactNode;
  size?: "sm" | "default";
}) {
  const field = useFieldContext<boolean>();
  const id = useId();

  return (
    <Field orientation="horizontal">
      <Switch
        id={id}
        checked={field.state.value}
        onCheckedChange={field.handleChange}
        size={size}
      />
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

function SubmitButton({
  children,
  loadingChildren,
  ...buttonProps
}: {
  children: ReactNode;
  loadingChildren?: ReactNode;
} & Omit<React.ComponentProps<typeof Button>, "type" | "disabled">) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
    >
      {({ canSubmit, isSubmitting }) => (
        <Button type="submit" disabled={!canSubmit || isSubmitting} {...buttonProps}>
          {isSubmitting && <Spinner className="size-3.5" />}
          {isSubmitting ? (loadingChildren ?? children) : children}
        </Button>
      )}
    </form.Subscribe>
  );
}

export { CheckboxField, SwitchField, SubmitButton, TextField, TextareaField };
