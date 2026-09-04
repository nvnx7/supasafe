"use client";

import {
  useAccount,
  useProvider,
} from "@starknetfoundation/starknet-start-react";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { num } from "starknet";
import {
  useCreateMultisig,
  useGetOwnerPublicKeys,
  useGetSupasafePublicViewKeys,
} from "@/api/multisig";
import { ActivateMultisigDialog } from "@/components/multisig/activate-multisig-button";
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
import {
  isDraftValid,
  type MultisigDetail,
  validateMultisigDraft,
} from "@/lib/multisig";
import { encryptViewKey, generateViewKey } from "@/utils/encryption";

export function CreateMultisigForm() {
  const router = useRouter();
  const { address } = useAccount();
  const { provider } = useProvider();
  const { deployMultisigAsync, isPending, error } = useCreateMultisig();

  // Owner 0 is always the connected wallet, so only the rest are editable.
  const [coOwners, setCoOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [createdMultisig, setCreatedMultisig] = useState<MultisigDetail | null>(
    null,
  );
  const [isConfirmingCreation, setIsConfirmingCreation] = useState(false);
  const [confirmationError, setConfirmationError] = useState<Error | null>(
    null,
  );

  const connectedOwner = address ? num.toHex(address) : "";
  const owners = [connectedOwner, ...coOwners];

  const pubkeyQueries = useGetOwnerPublicKeys(owners);
  const ssViewPubkeyQueries = useGetSupasafePublicViewKeys(owners);

  const ssPublicViewKeys = ssViewPubkeyQueries.map((query) => query.data);
  const ssPubViewKeysReady =
    ssPublicViewKeys.length === owners.length &&
    ssPublicViewKeys.every(Boolean);

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
    ssPubViewKeysReady;

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

    setConfirmationError(null);
    try {
      // Generate one recoverable viewing key for the new multisig.
      const {
        privateKey: privateMultisigViewKey,
        publicKey: publicMultisigViewKey,
      } = generateViewKey();
      const multisigOwners = owners.map((owner, index) => ({
        address: owner.trim(),
        publicKey: pubkeyQueries[index]?.data as string,
      }));

      const encryptedMultisigViewKeys = owners.map((owner, index) => {
        const ssPubVk = ssPublicViewKeys[index];
        if (!ssPubVk) {
          throw new Error(`Missing public viewing key for ${owner}.`);
        }

        const { ephemeralPubkey, ciphertext } = encryptViewKey({
          viewKey: privateMultisigViewKey,
          recipientPublicKey: ssPubVk,
        });

        return { owner, ephemeralPubkey, ciphertext };
      });

      const { contractAddress, transactionHash } = await deployMultisigAsync({
        owners: multisigOwners,
        threshold: effectiveThreshold,
        viewingKey: {
          publicKey: publicMultisigViewKey,
          encrypted: encryptedMultisigViewKeys,
        },
      });

      setIsConfirmingCreation(true);
      await provider.waitForTransaction(transactionHash);
      setCreatedMultisig({
        address: contractAddress,
        owners: multisigOwners,
        threshold: effectiveThreshold,
      });
    } catch (reason) {
      setConfirmationError(
        reason instanceof Error
          ? reason
          : new Error("Could not confirm multisig creation."),
      );
    } finally {
      setIsConfirmingCreation(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup className="gap-0">
          <section>
            <div className="mb-5">
              <h2 className="font-heading text-base font-semibold">Owners</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each owner must have a registered Supasafe view key.
              </p>
            </div>
            <div className="flex flex-col gap-5">
              {owners.map((owner, index) => {
                const query = pubkeyQueries[index];
                const viewKeyQuery = ssViewPubkeyQueries[index];
                const isSupasafeViewKeyRegistered =
                  viewKeyQuery?.data !== null &&
                  viewKeyQuery?.data !== undefined;
                const supasafeViewKeyError =
                  owner && viewKeyQuery?.isFetched && viewKeyQuery.data === null
                    ? "This owner has not registered a Supasafe view key."
                    : undefined;
                return (
                  <OwnerField
                    // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
                    key={index}
                    index={index}
                    value={owner}
                    error={submitted ? errors.owners[index] : undefined}
                    removable={index > 0}
                    readOnly={index === 0}
                    hint={index === 0 ? "Connected Wallet." : undefined}
                    resolveError={
                      query?.error instanceof Error
                        ? query.error.message
                        : undefined
                    }
                    supasafeViewKeyError={supasafeViewKeyError}
                    isSupasafeViewKeyRegistered={isSupasafeViewKeyRegistered}
                    onChange={(value) => updateCoOwner(index - 1, value)}
                    onRemove={() => removeCoOwner(index - 1)}
                  />
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-5 h-10"
              onClick={() => setCoOwners((current) => [...current, ""])}
            >
              <PlusIcon data-icon="inline-start" />
              Add Owner
            </Button>
          </section>

          <section className="mt-7 border-t pt-7">
            <div className="mb-5">
              <h2 className="font-heading text-base font-semibold">
                Signing Policy
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose how many owner approvals are required for each proposal.
              </p>
            </div>
            <Field
              data-invalid={submitted && errors.threshold ? true : undefined}
            >
              <FieldLabel htmlFor="threshold">Required Approvals</FieldLabel>
              <Select
                items={thresholdItems}
                value={String(effectiveThreshold)}
                onValueChange={(value) => {
                  if (value !== null) setThreshold(Number(value));
                }}
              >
                <SelectTrigger
                  id="threshold"
                  className="!h-12 w-full px-4"
                  aria-invalid={
                    submitted && errors.threshold ? true : undefined
                  }
                >
                  <SelectValue placeholder="Select Required Approvals" />
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
          </section>

          <section className="mt-7 border-t pt-7">
            {!address ? (
              <FieldError>Connect a wallet to create a multisig.</FieldError>
            ) : null}
            {error || confirmationError ? (
              <FieldError className="mb-4">
                {(error ?? confirmationError)?.message}
              </FieldError>
            ) : null}
            <Button
              className="h-12 w-full text-base"
              type="submit"
              disabled={isPending || isConfirmingCreation || !isAllReady}
            >
              {isPending || isConfirmingCreation ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              {isPending
                ? "Creating…"
                : isConfirmingCreation
                  ? "Confirming…"
                  : "Create Multisig"}
            </Button>
          </section>
        </FieldGroup>
      </form>
      {createdMultisig ? (
        <ActivateMultisigDialog
          multisig={createdMultisig}
          open
          onOpenChange={(open) => {
            if (!open) router.push(`/${createdMultisig.address}`);
          }}
        />
      ) : null}
    </>
  );
}
