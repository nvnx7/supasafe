"use client";

import { Open } from "@starkware-libs/starknet-privacy-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { proposalQueryKeys } from "@/api/proposal/query-keys";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "../create-multisig-strk20-proposal";
import { getEndurConfig } from "./config";

export type CreateMultisigEndurStakeProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  provingBlockId: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  amount: bigint;
};

export async function createMultisigEndurStakeProposal({
  multisig,
  owner,
  viewingKey,
  provingBlockId,
  signApproval,
  amount,
}: CreateMultisigEndurStakeProposalParams) {
  if (amount <= 0n) {
    throw new Error("Endur staking needs an amount greater than zero.");
  }

  const { anonymizerAddress, strkTokenAddress, xStrkTokenAddress } =
    getEndurConfig();

  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    display: {
      kind: "endur-stake",
      title: "Stake STRK with Endur",
      description: "Convert this multisig's private STRK into private xSTRK.",
      token: { symbol: "STRK", address: strkTokenAddress },
      amount: amount.toString(),
      outputToken: { symbol: "xSTRK", address: xStrkTokenAddress },
    },
    buildInvocation: (transfers) =>
      transfers
        .build({
          autoDiscover: { notes: "refresh", channels: "refresh" },
          autoSelectNotes: "naive",
          autoSetup: true,
          provingBlockId,
        })
        .surplusTo(multisig.address)
        .with(strkTokenAddress, (operations) =>
          operations.withdraw({ recipient: anonymizerAddress, amount }),
        )
        .surplusTo(multisig.address, false)
        .with(xStrkTokenAddress, (operations) =>
          operations.transfer({ recipient: multisig.address, amount: Open }),
        )
        .invoke(({ openNotes }) => {
          const outputNote = openNotes[0];
          if (!outputNote) {
            throw new Error("Endur staking did not create an xSTRK note.");
          }

          return {
            contractAddress: anonymizerAddress,
            calldata: [
              strkTokenAddress,
              xStrkTokenAddress,
              amount,
              0n,
              outputNote.noteId,
            ],
          };
        })
        .createProofInvocation(),
  });
}

export function useCreateMultisigEndurStakeProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createMultisigEndurStakeProposal,
    onSuccess: async (proposal) => {
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists,
      });
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(proposal.hash),
      });
    },
  });

  return {
    createMultisigEndurStakeProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
