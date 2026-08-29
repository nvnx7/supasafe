"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeMultisigStrk20Proposal } from "@/api/privacy";
import type { MultisigProposal } from "@/lib/multisig-proposal-provider";
import { multisigProposalProvider } from "./provider";

export type ExecuteStrk20RegistrationProposalParams = {
  proposal: MultisigProposal;
  viewingKey: bigint;
};

export function useExecuteStrk20RegistrationProposal() {
  const { provider } = useProvider();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      proposal,
      viewingKey,
    }: ExecuteStrk20RegistrationProposalParams) => {
      if (proposal.display.kind !== "strk20-registration") {
        throw new Error("This proposal type cannot be executed yet.");
      }
      const transactionHash = await executeMultisigStrk20Proposal({
        provider,
        proposal,
        viewingKey,
      });
      await provider.waitForTransaction(transactionHash);
      await multisigProposalProvider.markExecuted(proposal.hash);
      return { transaction_hash: transactionHash };
    },
    onSuccess: async (_transaction, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
      await queryClient.invalidateQueries({
        queryKey: ["multisigProposal", variables.proposal.hash],
      });
    },
  });

  return {
    executeStrk20RegistrationProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
