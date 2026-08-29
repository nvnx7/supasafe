"use client";

import {
  type UseSignTypedDataArgs,
  useAccount,
  useSignTypedData,
} from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { ShieldCheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { Signature } from "starknet";
import {
  useGetEncryptedViewingKey,
  useGetMultisigViewingPublicKey,
} from "@/api/multisig";
import { useCreateStrk20RegistrationProposal } from "@/api/proposal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { networkConfig } from "@/config/network";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";
import type { MultisigDetail } from "@/lib/multisig";
import { buildApprovalTypedData } from "@/lib/signing";
import { decryptViewKey } from "@/utils/encryption";

export function ActivateMultisigButton({
  multisig,
}: {
  multisig: MultisigDetail;
}) {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData({});
  const {
    privateKey: supasafeViewKey,
    error: supasafeViewKeyError,
    isReady: isSupasafeViewKeyReady,
  } = useSupasafeViewKey();
  const encryptedKey = useGetEncryptedViewingKey(multisig.address, address);
  const viewingPublicKey = useGetMultisigViewingPublicKey(multisig.address);
  const { createStrk20RegistrationProposalAsync, isPending } =
    useCreateStrk20RegistrationProposal();
  const [error, setError] = useState<Error | null>(null);

  const multisigViewingKey = useMemo(() => {
    if (!supasafeViewKey || !encryptedKey.data) return null;

    try {
      const key = decryptViewKey({
        ephemeralPubkey: encryptedKey.data.ephemeralPubkey,
        ciphertext: encryptedKey.data.ciphertext,
        recipientPrivateKey: supasafeViewKey,
      });
      if (
        viewingPublicKey.data !== undefined &&
        derivePublicKey(key) !== viewingPublicKey.data
      ) {
        return null;
      }
      return key;
    } catch {
      return null;
    }
  }, [encryptedKey.data, supasafeViewKey, viewingPublicKey.data]);

  const recoveryError =
    isSupasafeViewKeyReady &&
    encryptedKey.data &&
    viewingPublicKey.data !== undefined &&
    !multisigViewingKey
      ? new Error("Could not verify this multisig's recovered view key.")
      : null;

  const disabled =
    !address ||
    !isSupasafeViewKeyReady ||
    !multisigViewingKey ||
    viewingPublicKey.isLoading ||
    isPending;

  async function createProposal() {
    if (!address || !multisigViewingKey) return;

    setError(null);
    try {
      await createStrk20RegistrationProposalAsync({
        multisig,
        owner: address,
        viewingKey: multisigViewingKey,
        signApproval: async (callSetHash) =>
          (await signTypedDataAsync(
            buildApprovalTypedData(
              multisig.address,
              callSetHash,
              networkConfig.chainId,
            ) as unknown as UseSignTypedDataArgs,
          )) as Signature,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason
          : new Error("Could not create activation proposal."),
      );
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        disabled={disabled}
        onClick={() => void createProposal()}
      >
        {isPending ? <Spinner data-icon="inline-start" /> : <ShieldCheckIcon />}
        {isPending ? "Preparing…" : "Propose STRK20 activation"}
      </Button>
      {error || supasafeViewKeyError || recoveryError ? (
        <p className="max-w-56 text-right text-xs text-destructive">
          {(error ?? supasafeViewKeyError ?? recoveryError)?.message}
        </p>
      ) : null}
    </div>
  );
}
