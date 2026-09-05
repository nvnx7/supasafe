"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { multisigProposalProvider } from "@/api/proposal/provider";
import { proposalQueryKeys } from "@/api/proposal/query-keys";
import type { MultisigProposal } from "@/lib/multisig-proposal-provider";
import { proveMultisigStrk20Proposal } from "../execute-multisig-strk20-proposal";
import { submitAvnuPrivateSwap } from "./paymaster";

export type ExecuteMultisigAvnuPrivateSwapProposalParams = {
  proposal: MultisigProposal;
  viewingKey: bigint;
  provingBlockId: number;
};

export async function executeMultisigAvnuPrivateSwapProposal({
  proposal,
  viewingKey,
  provingBlockId,
}: ExecuteMultisigAvnuPrivateSwapProposalParams) {
  const avnu = proposal.display.avnu;
  if (!avnu) {
    throw new Error("This proposal is not an AVNU private swap.");
  }

  const callAndProof = await proveMultisigStrk20Proposal({
    proposal,
    viewingKey,
    provingBlockId,
  });
  return submitAvnuPrivateSwap({
    callAndProof,
    feeMode: {
      poolFeeToken: avnu.poolFeeToken,
      tip: avnu.tip,
    },
  });
}

export function useExecuteMultisigAvnuPrivateSwapProposal() {
  const { provider } = useProvider();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      proposal,
      viewingKey,
    }: Omit<
      ExecuteMultisigAvnuPrivateSwapProposalParams,
      "provingBlockId"
    >) => {
      const provingBlockId = Math.max(
        0,
        (await provider.getBlockNumber()) - 10,
      );
      const transactionHash = await executeMultisigAvnuPrivateSwapProposal({
        proposal,
        viewingKey,
        provingBlockId,
      });
      await provider.waitForTransaction(transactionHash);
      await multisigProposalProvider.markExecuted(proposal.hash);
      return { transaction_hash: transactionHash };
    },
    onSuccess: async (_transaction, variables) => {
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists,
      });
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(variables.proposal.hash),
      });
    },
  });

  return {
    executeMultisigAvnuPrivateSwapProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
