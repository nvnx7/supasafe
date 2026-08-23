"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { truncateAddress } from "@/lib/multisig";

interface OwnerFieldProps {
  index: number;
  value: string;
  error?: string | undefined;
  removable: boolean;
  readOnly?: boolean;
  hint?: string;
  /// Read off the owner's deployed account; the multisig verifies signatures against it.
  publicKey?: string | undefined;
  resolving?: boolean;
  resolveError?: string | undefined;
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
  publicKey,
  resolving,
  resolveError,
  onChange,
  onRemove,
}: OwnerFieldProps) {
  const id = `owner-${index}`;
  const message = error ?? resolveError;
  const invalid = Boolean(message);

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
          readOnly={readOnly}
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

      {resolving ? (
        <FieldDescription>
          <Spinner data-icon="inline-start" />
          Reading signing key from account…
        </FieldDescription>
      ) : publicKey ? (
        <FieldDescription className="font-mono">
          Signing key {truncateAddress(publicKey, 8)}
        </FieldDescription>
      ) : hint ? (
        <FieldDescription>{hint}</FieldDescription>
      ) : null}

      {message ? <FieldError>{message}</FieldError> : null}
    </Field>
  );
}
