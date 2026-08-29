"use client";

import { useStrk20InvokeTransaction } from "@starknetfoundation/starknet-start-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { num } from "starknet";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "./create-multisig-strk20-proposal";

export type WithdrawParams = {
  token: string;
  amount: bigint;
  recipient: string;
};

export type CreateMultisigWithdrawProposalParams = WithdrawParams & {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  tokenSymbol: string;
};

export function useWithdraw() {
  const { invokeAsync, ...result } = useStrk20InvokeTransaction();

  return {
    withdrawAsync: (params: WithdrawParams) =>
      invokeAsync([
        {
          type: "withdraw",
          token: params.token,
          amount: num.toHex(params.amount),
          recipient: params.recipient,
        },
      ]),
    ...result,
  };
}

export async function createMultisigWithdrawProposal({
  multisig,
  owner,
  viewingKey,
  signApproval,
  token,
  tokenSymbol,
  amount,
  recipient,
}: CreateMultisigWithdrawProposalParams) {
  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    signApproval,
    display: {
      kind: "strk20-withdraw",
      title: `Withdraw ${tokenSymbol}`,
      description: "Withdraw tokens from this multisig's STRK20 balance.",
      token: { symbol: tokenSymbol, address: token },
      amount: amount.toString(),
      recipient,
    },
    buildInvocation: (transfers) =>
      transfers
        .build({
          autoDiscover: { notes: "refresh", channels: "refresh" },
          autoSelectNotes: "naive",
        })
        .with(token, (operations) => operations.withdraw({ recipient, amount }))
        .surplusTo(multisig.address)
        .createProofInvocation(),
  });
}

export function useCreateMultisigWithdrawProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createMultisigWithdrawProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
    },
  });

  return {
    createMultisigWithdrawProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
