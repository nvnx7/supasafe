"use client";

import { CircleCheckIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface OwnerFieldProps {
  index: number;
  value: string;
  error?: string | undefined;
  removable: boolean;
  readOnly?: boolean;
  hint?: string;
  resolveError?: string | undefined;
  supasafeViewKeyError?: string | undefined;
  isSupasafeViewKeyRegistered?: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}

export function OwnerField({
  index,
  value,
  error,
  removable,
  readOnly,
  hint,
  resolveError,
  supasafeViewKeyError,
  isSupasafeViewKeyRegistered,
  onChange,
  onRemove,
}: OwnerFieldProps) {
  const id = `owner-${index}`;
  const message = error ?? resolveError;
  const invalid = Boolean(message || supasafeViewKeyError);

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>Owner {index + 1}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          className="h-12 px-4"
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0x…"
          spellCheck={false}
          autoComplete="off"
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={onRemove}
          disabled={!removable}
          aria-label={`Remove owner ${index + 1}`}
        >
          <Trash2Icon />
        </Button>
      </div>

      {isSupasafeViewKeyRegistered ? (
        <FieldDescription className="flex items-center gap-1.5 text-success">
          <CircleCheckIcon className="size-4" aria-hidden="true" />
          Supasafe View Key Registered
        </FieldDescription>
      ) : hint ? (
        <FieldDescription>{hint}</FieldDescription>
      ) : null}

      {message ? <FieldError>{message}</FieldError> : null}
      {supasafeViewKeyError ? (
        <FieldError>{supasafeViewKeyError}</FieldError>
      ) : null}
    </Field>
  );
}
