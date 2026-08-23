"use client";

import { useAccount } from "@starknet-start/react";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { num } from "starknet";
import { useCreateMultisig } from "@/api/multisig";
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
import { isDraftValid, validateMultisigDraft } from "@/lib/multisig";

export function CreateMultisigForm() {
  const router = useRouter();
  const { address } = useAccount();
  const { deployMultisigAsync, isPending, error } = useCreateMultisig();

  // Owner 0 is always the connected wallet, so only the rest are editable.
  const [coOwners, setCoOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const connectedOwner = address ? num.toHex(address) : "";
  const owners = [connectedOwner, ...coOwners];

  // Shrinking the owner set can strand the threshold above the new maximum.
  const effectiveThreshold = Math.min(threshold, owners.length);
  const errors = validateMultisigDraft({
    owners,
    threshold: effectiveThreshold,
  });
  const valid = Boolean(address) && isDraftValid(errors);

  const thresholdItems = owners.map((_, index) => ({
    value: String(index + 1),
    label: `${index + 1} of ${owners.length}`,
  }));

  function updateCoOwner(index: number, value: string) {
    setCoOwners((current) =>
      current.map((owner, i) => (i === index ? value : owner)),
    );
  }

  function removeCoOwner(index: number) {
    setCoOwners((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;

    const { contractAddress } = await deployMultisigAsync({
      owners: owners.map((owner) => owner.trim()),
      threshold: effectiveThreshold,
    });
    router.push(`/${contractAddress}`);
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
            removable={index > 0}
            readOnly={index === 0}
            description={index === 0 ? "Connected wallet." : undefined}
            onChange={(value) => updateCoOwner(index - 1, value)}
            onRemove={() => removeCoOwner(index - 1)}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => setCoOwners((current) => [...current, ""])}
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

        {!address ? (
          <FieldError>Connect a wallet to create a multisig.</FieldError>
        ) : null}
        {error ? <FieldError>{error.message}</FieldError> : null}

        <Button type="submit" disabled={isPending || !address}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Creating…" : "Create Multisig"}
        </Button>
      </FieldGroup>
    </form>
  );
}
