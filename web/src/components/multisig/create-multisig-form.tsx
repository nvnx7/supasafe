"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { num } from "starknet";
import { useCreateMultisig, useGetOwnerPublicKeys } from "@/api/multisig";
import { useGetPublicViewKeys } from "@/api/privacy";
import { OwnerField } from "@/components/multisig/owner-field";
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
import { networkConfig } from "@/config/network";
import { isDraftValid, validateMultisigDraft } from "@/lib/multisig";
import { encryptViewKey, generateViewKey } from "@/utils/encryption";

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
  const poolConfigured = Boolean(networkConfig.privacyPoolAddress);

  const pubkeyQueries = useGetOwnerPublicKeys(owners);
  const viewPubkeyQueries = useGetPublicViewKeys(poolConfigured ? owners : []);

  const ownerPublicViewKeys = poolConfigured
    ? viewPubkeyQueries.map((query) => query.data)
    : owners.map(() => undefined);
  const ownerPubViewKeysReady =
    ownerPublicViewKeys.length === owners.length &&
    ownerPublicViewKeys.every(Boolean);

  // Shrinking the owner set can strand the threshold above the new maximum.
  const effectiveThreshold = Math.min(threshold, owners.length);
  const errors = validateMultisigDraft({
    owners,
    threshold: effectiveThreshold,
  });

  const ownerPubKeysReady = pubkeyQueries.every((query) => query.data);
  const isAllReady =
    Boolean(address) &&
    isDraftValid(errors) &&
    ownerPubKeysReady &&
    ownerPubViewKeysReady;

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
    if (!isAllReady) return;

    // Generate multisig view key
    const {
      privateKey: privateMultisigViewKey,
      publicKey: publicMultisigViewKey,
    } = generateViewKey();

    // Encrypt multisig view key for each owner
    const encryptedMultisigViewKeys = owners.map((owner, idx) => {
      const ownerPubVk = ownerPublicViewKeys[idx];
      if (!ownerPubVk) {
        throw new Error(`Missing public viewing key for ${owner}.`);
      }

      const { ephemeralPubkey, ciphertext } = encryptViewKey({
        viewKey: privateMultisigViewKey,
        recipientPublicKey: ownerPubVk,
      });

      return {
        owner,
        ephemeralPubkey,
        ciphertext,
      };
    });

    const { contractAddress } = await deployMultisigAsync({
      owners: owners.map((owner, index) => ({
        address: owner.trim(),
        publicKey: pubkeyQueries[index]?.data as string,
      })),
      threshold: effectiveThreshold,
      viewingKey: {
        publicKey: publicMultisigViewKey,
        encrypted: encryptedMultisigViewKeys,
      },
    });

    router.push(`/${contractAddress}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {owners.map((owner, index) => {
          const query = pubkeyQueries[index];
          return (
            <OwnerField
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
              key={index}
              index={index}
              value={owner}
              error={submitted ? errors.owners[index] : undefined}
              removable={index > 0}
              readOnly={index === 0}
              hint={index === 0 ? "Connected wallet." : undefined}
              publicKey={query?.data}
              resolving={query?.isFetching}
              resolveError={
                query?.error instanceof Error ? query.error.message : undefined
              }
              onChange={(value) => updateCoOwner(index - 1, value)}
              onRemove={() => removeCoOwner(index - 1)}
            />
          );
        })}

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

        {!poolConfigured ? (
          <FieldError>
            No privacy pool is configured for this network — every owner needs a
            registered viewing key before a multisig can be created.
          </FieldError>
        ) : !ownerPubViewKeysReady ? (
          <FieldDescription>
            Every owner must register a viewing key with the privacy pool before
            this multisig can be created.
          </FieldDescription>
        ) : null}

        {!address ? (
          <FieldError>Connect a wallet to create a multisig.</FieldError>
        ) : null}
        {error ? <FieldError>{error.message}</FieldError> : null}

        <Button type="submit" disabled={isPending || !isAllReady}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Creating…" : "Create Multisig"}
        </Button>
      </FieldGroup>
    </form>
  );
}
