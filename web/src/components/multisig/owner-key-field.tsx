"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface OwnerKeyFieldProps {
  index: number;
  value: string;
  error?: string | undefined;
  removable: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}

export function OwnerKeyField({
  index,
  value,
  error,
  removable,
  onChange,
  onRemove,
}: OwnerKeyFieldProps) {
  const id = `owner-${index}`;
  const invalid = Boolean(error);

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>Owner {index + 1}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0x…"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          className="font-mono"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!removable}
          aria-label={`Remove owner ${index + 1}`}
        >
          <Trash2Icon />
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
