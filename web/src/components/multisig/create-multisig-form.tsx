"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { OwnerKeyField } from "@/components/multisig/owner-key-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCreateMultisig } from "@/hooks/use-create-multisig";
import { isDraftValid, validateMultisigDraft } from "@/lib/multisig";

export function CreateMultisigForm() {
  const [owners, setOwners] = useState<string[]>([""]);
  const [threshold, setThreshold] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const { createMultisig, isPending, error } = useCreateMultisig();

  // Shrinking the owner set can strand the threshold above the new maximum.
  const effectiveThreshold = Math.min(threshold, owners.length);
  const draft = { owners, threshold: effectiveThreshold };

  const errors = validateMultisigDraft(draft);
  const valid = isDraftValid(errors);

  const thresholdItems = owners.map((_, index) => ({
    value: String(index + 1),
    label: `${index + 1} of ${owners.length}`,
  }));

  function updateOwner(index: number, value: string) {
    setOwners((current) =>
      current.map((owner, i) => (i === index ? value : owner)),
    );
  }

  function removeOwner(index: number) {
    setOwners((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    await createMultisig({
      owners: owners.map((owner) => owner.trim()),
      threshold: effectiveThreshold,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {owners.map((owner, index) => (
          <OwnerKeyField
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
            key={index}
            index={index}
            value={owner}
            error={submitted ? errors.owners[index] : undefined}
            removable={owners.length > 1}
            onChange={(value) => updateOwner(index, value)}
            onRemove={() => removeOwner(index)}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => setOwners((current) => [...current, ""])}
        >
          <PlusIcon data-icon="inline-start" />
          Add owner
        </Button>

        <Field data-invalid={submitted && errors.threshold ? true : undefined}>
          <FieldLabel htmlFor="threshold">Threshold</FieldLabel>
          <Select
            items={thresholdItems}
            value={String(effectiveThreshold)}
            onValueChange={(value) => {
              if (value !== null) setThreshold(Number(value));
            }}
          >
            <SelectTrigger
              id="threshold"
              aria-invalid={submitted && errors.threshold ? true : undefined}
            >
              <SelectValue placeholder="Select a threshold" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {thresholdItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Signatures required to authorize a transaction.
          </FieldDescription>
          {submitted && errors.threshold ? (
            <FieldError>{errors.threshold}</FieldError>
          ) : null}
        </Field>

        {error ? <FieldError>{error}</FieldError> : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Deploying…" : "Deploy multisig"}
        </Button>
      </FieldGroup>
    </form>
  );
}
