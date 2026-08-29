"use client";

import { useStrk20InvokeTransaction } from "@starknetfoundation/starknet-start-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { num } from "starknet";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "./create-multisig-strk20-proposal";

export type DepositParams = {
  token: string;
  amount: bigint;
};

export type CreateMultisigDepositProposalParams = DepositParams & {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  tokenSymbol: string;
};

export function useDeposit() {
  const { invokeAsync, ...result } = useStrk20InvokeTransaction();

  return {
    depositAsync: (params: DepositParams) =>
      invokeAsync([
        {
          type: "deposit",
          token: params.token,
          amount: num.toHex(params.amount),
        },
      ]),
    ...result,
  };
}

export async function createMultisigDepositProposal({
  multisig,
  owner,
  viewingKey,
  signApproval,
  token,
  tokenSymbol,
  amount,
}: CreateMultisigDepositProposalParams) {
  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    signApproval,
    display: {
      kind: "strk20-deposit",
      title: `Deposit ${tokenSymbol}`,
      description: "Deposit public tokens into this multisig's STRK20 balance.",
      token: { symbol: tokenSymbol, address: token },
      amount: amount.toString(),
    },
    buildInvocation: (transfers) =>
      transfers
        .build()
        .with(token, (operations) => operations.deposit({ amount }))
        .surplusTo(multisig.address)
        .createProofInvocation(),
  });
}

export function useCreateMultisigDepositProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createMultisigDepositProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
    },
  });

  return {
    createMultisigDepositProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
