"use client";

import {
  type UseSignTypedDataArgs,
  useAccount,
  useSignTypedData,
} from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { useState } from "react";
import { type Signature, stark } from "starknet";
import {
  useGetEncryptedViewingKey,
  useGetMultisig,
  useGetMultisigViewingPublicKey,
} from "@/api/multisig";
import {
  useExecuteMultisigStrk20Proposal,
  useGetProposal,
  useSaveProposalSignature,
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
import { networkConfig } from "@/config/network";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";
import { buildApprovalTypedData } from "@/lib/signing";
import { decryptViewKey } from "@/utils/encryption";

export function MultisigProposalDialog({
  hash,
  open,
  onOpenChange,
}: {
  hash: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData({});
  const { data: proposal } = useGetProposal(hash ?? undefined);
  const { data: multisig } = useGetMultisig(proposal?.multisigAddress);
  const { privateKey: supasafeViewKey } = useSupasafeViewKey();
  const encryptedKey = useGetEncryptedViewingKey(
    proposal?.multisigAddress,
    address,
  );
  const viewingPublicKey = useGetMultisigViewingPublicKey(
    proposal?.multisigAddress,
  );
  const { saveProposalSignatureAsync, isPending } = useSaveProposalSignature();
  const { executeMultisigStrk20ProposalAsync, isPending: isExecuting } =
    useExecuteMultisigStrk20Proposal();
  const [error, setError] = useState<Error | null>(null);

  let multisigViewingKey: bigint | null = null;
  if (supasafeViewKey && encryptedKey.data) {
    try {
      const key = decryptViewKey({
        ephemeralPubkey: encryptedKey.data.ephemeralPubkey,
        ciphertext: encryptedKey.data.ciphertext,
        recipientPrivateKey: supasafeViewKey,
      });
      if (
        viewingPublicKey.data === undefined ||
        derivePublicKey(key) === viewingPublicKey.data
      ) {
        multisigViewingKey = key;
      }
    } catch {
      multisigViewingKey = null;
    }
  }

  const hasSigned = Boolean(
    address &&
      proposal?.signatures.some(
        (signature) => BigInt(signature.owner) === BigInt(address),
      ),
  );

  async function signProposal() {
    if (!address || !proposal) return;

    setError(null);
    try {
      const signature = (await signTypedDataAsync(
        buildApprovalTypedData(
          proposal.multisigAddress,
          proposal.hash,
          networkConfig.chainId,
        ) as unknown as UseSignTypedDataArgs,
      )) as Signature;
      await saveProposalSignatureAsync({
        proposalHash: proposal.hash,
        signature: {
          owner: address,
          signature: stark.formatSignature(signature).map(String),
          signedAt: Date.now(),
        },
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason
          : new Error("Could not sign proposal."),
      );
    }
  }

  async function executeProposal() {
    if (!proposal || !multisigViewingKey) return;

    setError(null);
    try {
      await executeMultisigStrk20ProposalAsync({
        proposal,
        viewingKey: multisigViewingKey,
      });
      onOpenChange(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason
          : new Error("Could not execute proposal."),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{proposal?.display.title ?? "Proposal"}</DialogTitle>
          <DialogDescription>
            {proposal?.display.description ?? "Loading proposal details."}
          </DialogDescription>
        </DialogHeader>
        {proposal ? (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Approvals</span>
              <span>
                {proposal.signatures.length} / {proposal.threshold}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span className="capitalize">{proposal.status}</span>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : null}
        <DialogFooter>
          {!hasSigned && proposal?.status === "pending" ? (
            <Button
              type="button"
              onClick={() => void signProposal()}
              disabled={isPending || !multisig}
            >
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? "Signing…" : "Sign proposal"}
            </Button>
          ) : null}
          {proposal?.status === "ready" ? (
            <Button
              type="button"
              onClick={() => void executeProposal()}
              disabled={isExecuting || !multisigViewingKey}
            >
              {isExecuting ? <Spinner data-icon="inline-start" /> : null}
              {isExecuting ? "Executing…" : "Execute proposal"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
