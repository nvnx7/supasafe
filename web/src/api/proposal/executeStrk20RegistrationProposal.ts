"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeMultisigStrk20Proposal } from "@/api/privacy";
import type { MultisigProposal } from "@/lib/multisig-proposal-provider";
import { multisigProposalProvider } from "./provider";
import { proposalQueryKeys } from "./query-keys";

export type ExecuteMultisigStrk20ProposalParams = {
  proposal: MultisigProposal;
  viewingKey: bigint;
};

export function useExecuteMultisigStrk20Proposal() {
  const { provider } = useProvider();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      proposal,
      viewingKey,
    }: ExecuteMultisigStrk20ProposalParams) => {
      const provingBlockId = Math.max(
        0,
        (await provider.getBlockNumber()) - 10,
      );
      const transactionHash = await executeMultisigStrk20Proposal({
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
    executeMultisigStrk20ProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
