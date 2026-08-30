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
import { toast } from "@/components/ui/toast";
import { TOKENS } from "@/config/constants";
import { networkConfig } from "@/config/network";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";
import { truncateAddress } from "@/lib/multisig";
import { buildApprovalTypedData } from "@/lib/signing";
import { decryptViewKey } from "@/utils/encryption";

function formatAmount(amount: string, decimals: number) {
  const value = BigInt(amount);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, "0");
  const trimmedFraction = fraction.replace(/0+$/, "");
  return trimmedFraction
    ? `${whole}.${trimmedFraction.slice(0, 6)}`
    : whole.toString();
}

function formatCreatedAt(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(timestamp);
}

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
  const proposalTokenAddress = proposal?.display.token?.address;
  const proposalToken = proposalTokenAddress
    ? TOKENS.find(
        (token) => BigInt(token.address) === BigInt(proposalTokenAddress),
      )
    : undefined;

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
      toast.add({
        type: "success",
        title: "Proposal approved",
        description: "Your owner signature was recorded.",
      });
    } catch (reason) {
      const nextError =
        reason instanceof Error
          ? reason
          : new Error("Could not sign proposal.");
      setError(nextError);
      toast.add({
        type: "error",
        title: "Could not approve proposal",
        description: nextError.message,
      });
    }
  }

  async function executeProposal() {
    if (!proposal || !multisigViewingKey) return;

    setError(null);
    try {
      const transaction = await executeMultisigStrk20ProposalAsync({
        proposal,
        viewingKey: multisigViewingKey,
      });
      toast.add({
        type: "success",
        title: "Proposal executed",
        description: `Transaction ${truncateAddress(transaction.transaction_hash, 10)} confirmed.`,
      });
      onOpenChange(false);
    } catch (reason) {
      const nextError =
        reason instanceof Error
          ? reason
          : new Error("Could not execute proposal.");
      setError(nextError);
      toast.add({
        type: "error",
        title: "Proposal execution failed",
        description: nextError.message,
      });
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
          <dl className="flex flex-col gap-2 text-sm">
            {proposal.display.amount && proposalToken ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-mono">
                  {formatAmount(
                    proposal.display.amount,
                    proposalToken.decimals,
                  )}{" "}
                  {proposalToken.symbol}
                </dd>
              </div>
            ) : null}
            {proposal.display.recipient ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Recipient</dt>
                <dd
                  className="max-w-56 truncate font-mono"
                  title={proposal.display.recipient}
                >
                  {truncateAddress(proposal.display.recipient, 10)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Approvals</dt>
              <dd>
                {proposal.signatures.length} / {proposal.threshold}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{proposal.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Created</dt>
              <dd title={new Date(proposal.createdAt).toISOString()}>
                {formatCreatedAt(proposal.createdAt)} UTC
              </dd>
            </div>
          </dl>
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
