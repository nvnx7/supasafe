"use client";

import { useStrk20InvokeTransaction } from "@starknetfoundation/starknet-start-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { num } from "starknet";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "./create-multisig-strk20-proposal";

export type TransferParams = {
  token: string;
  amount: bigint;
  recipient: string;
};

export type CreateMultisigTransferProposalParams = TransferParams & {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  tokenSymbol: string;
};

export function useTransfer() {
  const { invokeAsync, ...result } = useStrk20InvokeTransaction();

  return {
    transferAsync: (params: TransferParams) =>
      invokeAsync([
        {
          type: "transfer",
          token: params.token,
          amount: num.toHex(params.amount),
          recipient: params.recipient,
        },
      ]),
    ...result,
  };
}

export async function createMultisigTransferProposal({
  multisig,
  owner,
  viewingKey,
  signApproval,
  token,
  tokenSymbol,
  amount,
  recipient,
}: CreateMultisigTransferProposalParams) {
  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    signApproval,
    display: {
      kind: "strk20-transfer",
      title: `Transfer ${tokenSymbol}`,
      description: "Send tokens privately from this multisig.",
      token: { symbol: tokenSymbol, address: token },
      amount: amount.toString(),
      recipient,
    },
    buildInvocation: (transfers) =>
      transfers
        .build({
          autoDiscover: { notes: "refresh", channels: "refresh" },
          autoSelectNotes: "naive",
          autoSetup: true,
        })
        .with(token, (operations) => operations.transfer({ recipient, amount }))
        .surplusTo(multisig.address)
        .createProofInvocation(),
  });
}

export function useCreateMultisigTransferProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createMultisigTransferProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
    },
  });

  return {
    createMultisigTransferProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
