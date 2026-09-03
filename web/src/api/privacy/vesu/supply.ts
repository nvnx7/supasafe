"use client";

import { Open } from "@starkware-libs/starknet-privacy-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { proposalQueryKeys } from "@/api/proposal/query-keys";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "../create-multisig-strk20-proposal";
import { getVesuAnonymizerAddress, getVesuVaultByUnderlying } from "./config";

export type CreateMultisigVesuSupplyProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  provingBlockId: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  underlyingToken: string;
  underlyingTokenSymbol: string;
  vTokenSymbol: string;
  amount: bigint;
};

export async function createMultisigVesuSupplyProposal({
  multisig,
  owner,
  viewingKey,
  provingBlockId,
  signApproval,
  underlyingToken,
  underlyingTokenSymbol,
  vTokenSymbol,
  amount,
}: CreateMultisigVesuSupplyProposalParams) {
  if (amount <= 0n) {
    throw new Error("Vesu supply needs an amount greater than zero.");
  }

  const anonymizerAddress = getVesuAnonymizerAddress();
  const vault = getVesuVaultByUnderlying(underlyingToken);

  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    display: {
      kind: "vesu-supply",
      title: `Supply ${underlyingTokenSymbol} to Vesu`,
      description: "Supply this multisig's private balance to a Vesu vault.",
      token: { symbol: underlyingTokenSymbol, address: underlyingToken },
      amount: amount.toString(),
      outputToken: { symbol: vTokenSymbol, address: vault.vTokenAddress },
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
        .with(underlyingToken, (operations) =>
          operations.withdraw({ recipient: anonymizerAddress, amount }),
        )
        .surplusTo(multisig.address, false)
        .with(vault.vTokenAddress, (operations) =>
          operations.transfer({ recipient: multisig.address, amount: Open }),
        )
        .invoke(({ openNotes }) => {
          const outputNote = openNotes[0];
          if (!outputNote) {
            throw new Error("Vesu supply did not create a position note.");
          }

          return {
            contractAddress: anonymizerAddress,
            calldata: [
              0n,
              underlyingToken,
              vault.vTokenAddress,
              amount,
              0n,
              outputNote.noteId,
            ],
          };
        })
        .createProofInvocation(),
  });
}

export function useCreateMultisigVesuSupplyProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createMultisigVesuSupplyProposal,
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
    createMultisigVesuSupplyProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
