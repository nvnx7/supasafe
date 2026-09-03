"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { createMultisigStrk20Proposal } from "@/api/privacy";
import type { MultisigDetail } from "@/lib/multisig";
import { proposalQueryKeys } from "./query-keys";

export type CreateStrk20RegistrationProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  provingBlockId: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
};

export async function createStrk20RegistrationProposal({
  multisig,
  owner,
  viewingKey,
  provingBlockId,
  signApproval,
}: CreateStrk20RegistrationProposalParams) {
  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    display: {
      kind: "strk20-registration",
      title: "Activate STRK20",
      description: "Register this multisig's viewing key with the STRK20 pool.",
    },
    buildInvocation: (transfers) =>
      transfers.build({ provingBlockId }).register().createProofInvocation(),
  });
}

export function useCreateStrk20RegistrationProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createStrk20RegistrationProposal,
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
    createStrk20RegistrationProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
