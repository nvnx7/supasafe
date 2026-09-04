"use client";

import {
  type UseSignTypedDataArgs,
  useAccount,
  useProvider,
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
import {
  useCreateStrk20RegistrationProposal,
  useExecuteMultisigStrk20Proposal,
} from "@/api/proposal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <ShieldCheckIcon />
        Activate Privacy Pool
      </Button>
      <ActivateMultisigDialog
        multisig={multisig}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function ActivateMultisigDialog({
  multisig,
  open,
  onOpenChange,
  onActivated,
}: {
  multisig: MultisigDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated?: () => void;
}) {
  const { address } = useAccount();
  const { provider } = useProvider();
  const { signTypedDataAsync } = useSignTypedData({});
  const {
    privateKey: supasafeViewKey,
    error: supasafeViewKeyError,
    isReady: isSupasafeViewKeyReady,
  } = useSupasafeViewKey();
  const encryptedKey = useGetEncryptedViewingKey(multisig.address, address);
  const viewingPublicKey = useGetMultisigViewingPublicKey(multisig.address);
  const { createStrk20RegistrationProposalAsync, isPending: isCreating } =
    useCreateStrk20RegistrationProposal();
  const { executeMultisigStrk20ProposalAsync, isPending: isExecuting } =
    useExecuteMultisigStrk20Proposal();
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
    isCreating ||
    isExecuting;

  async function activateMultisig() {
    if (!address || !multisigViewingKey) return;

    setError(null);
    try {
      const provingBlockId = Math.max(
        0,
        (await provider.getBlockNumber()) - 10,
      );
      const proposal = await createStrk20RegistrationProposalAsync({
        multisig,
        owner: address,
        viewingKey: multisigViewingKey,
        provingBlockId,
        signApproval: async (callSetHash) =>
          (await signTypedDataAsync(
            buildApprovalTypedData(
              multisig.address,
              callSetHash,
              networkConfig.chainId,
            ) as unknown as UseSignTypedDataArgs,
          )) as Signature,
      });

      if (proposal.status === "ready") {
        await executeMultisigStrk20ProposalAsync({
          proposal,
          viewingKey: multisigViewingKey,
        });
        toast.add({
          type: "success",
          title: "Privacy pool activated",
          description: "This multisig is ready to use private transactions.",
        });
        onActivated?.();
        onOpenChange(false);
        return;
      }

      toast.add({
        type: "success",
        title: "STRK20 activation proposed",
        description: "The remaining owners must approve before activation.",
      });
    } catch (reason) {
      const nextError =
        reason instanceof Error
          ? reason
          : new Error("Could not activate this multisig.");
      setError(nextError);
      toast.add({
        type: "error",
        title: "Could not activate privacy pool",
        description: nextError.message,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate Privacy Pool</DialogTitle>
          <DialogDescription>
            Register this multisig&apos;s view key with the Starknet privacy
            pool to enable private deposits, transfers, swaps, and lending.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5 text-sm text-muted-foreground">
          {multisig.threshold === 1
            ? "This activation can be submitted now."
            : `This action requires ${multisig.threshold} owner approvals. It will be proposed for the other owners after you sign.`}
          {error || supasafeViewKeyError || recoveryError ? (
            <p className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive">
              {(error ?? supasafeViewKeyError ?? recoveryError)?.message}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={disabled}
            onClick={() => void activateMultisig()}
          >
            {isCreating || isExecuting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <ShieldCheckIcon />
            )}
            {isCreating
              ? "Preparing…"
              : isExecuting
                ? "Activating…"
                : multisig.threshold === 1
                  ? "Activate Multisig"
                  : "Create Activation Proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
