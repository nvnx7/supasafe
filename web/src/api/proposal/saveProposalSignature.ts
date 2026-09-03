"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MultisigProposalSignature } from "@/lib/multisig-proposal-provider";
import { multisigProposalProvider } from "./provider";
import { proposalQueryKeys } from "./query-keys";

export type SaveProposalSignatureParams = {
  proposalHash: string;
  signature: MultisigProposalSignature;
};

export function useSaveProposalSignature() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      proposalHash,
      signature,
    }: SaveProposalSignatureParams) => {
      await multisigProposalProvider.saveSignature({ proposalHash, signature });
      return multisigProposalProvider.getProposal(proposalHash);
    },
    onSuccess: async (proposal) => {
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists,
      });
      if (proposal) {
        await queryClient.invalidateQueries({
          queryKey: proposalQueryKeys.detail(proposal.hash),
        });
      }
    },
  });

  return { saveProposalSignatureAsync: mutation.mutateAsync, ...mutation };
}
