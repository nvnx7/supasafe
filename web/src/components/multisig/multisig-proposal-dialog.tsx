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
import { useExecuteMultisigAvnuPrivateSwapProposal } from "@/api/privacy/avnu";
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
import { networkConfig } from "@/config/network";
import { getTokenByAddress } from "@/config/tokens";
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
  const {
    executeMultisigStrk20ProposalAsync,
    isPending: isExecutingStrk20Proposal,
  } = useExecuteMultisigStrk20Proposal();
  const {
    executeMultisigAvnuPrivateSwapProposalAsync,
    isPending: isExecutingAvnuProposal,
  } = useExecuteMultisigAvnuPrivateSwapProposal();
  const [error, setError] = useState<Error | null>(null);
  const isAvnuPrivateSwap = proposal?.display.kind === "avnu-private-swap";
  const isExecuting = isExecutingStrk20Proposal || isExecutingAvnuProposal;

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
  const proposalToken = getTokenByAddress(proposalTokenAddress);
  const proposalOutputTokenAddress = proposal?.display.outputToken?.address;
  const proposalOutputToken = getTokenByAddress(proposalOutputTokenAddress);

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
      const transaction = isAvnuPrivateSwap
        ? await executeMultisigAvnuPrivateSwapProposalAsync({
            proposal,
            viewingKey: multisigViewingKey,
          })
        : await executeMultisigStrk20ProposalAsync({
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
          <dl className="divide-y px-6 py-3 text-sm">
            {proposal.display.amount && proposalToken ? (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">Amount</dt>
                <dd>
                  {formatAmount(
                    proposal.display.amount,
                    proposalToken.decimals,
                  )}{" "}
                  {proposalToken.symbol}
                </dd>
              </div>
            ) : null}
            {proposal.display.recipient ? (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">Recipient</dt>
                <dd
                  className="max-w-56 truncate"
                  title={proposal.display.recipient}
                >
                  {truncateAddress(proposal.display.recipient, 10)}
                </dd>
              </div>
            ) : null}
            {proposal.display.minimumReceived && proposalOutputToken ? (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted-foreground">Minimum received</dt>
                <dd>
                  {formatAmount(
                    proposal.display.minimumReceived,
                    proposalOutputToken.decimals,
                  )}{" "}
                  {proposalOutputToken.symbol}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Approvals</dt>
              <dd>
                {proposal.signatures.length} / {proposal.threshold}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{proposal.status}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Created</dt>
              <dd title={new Date(proposal.createdAt).toISOString()}>
                {formatCreatedAt(proposal.createdAt)} UTC
              </dd>
            </div>
          </dl>
        ) : null}
        {error ? (
          <p className="mx-6 mb-5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error.message}
          </p>
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
