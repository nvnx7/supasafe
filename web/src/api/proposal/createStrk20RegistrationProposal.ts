"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { createMultisigStrk20Proposal } from "@/api/privacy";
import type { MultisigDetail } from "@/lib/multisig";

export type CreateStrk20RegistrationProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
};

export async function createStrk20RegistrationProposal({
  multisig,
  owner,
  viewingKey,
  signApproval,
}: CreateStrk20RegistrationProposalParams) {
  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    signApproval,
    display: {
      kind: "strk20-registration",
      title: "Activate STRK20",
      description: "Register this multisig's viewing key with the STRK20 pool.",
    },
    buildInvocation: (transfers) =>
      transfers.build().register().createProofInvocation(),
  });
}

export function useCreateStrk20RegistrationProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createStrk20RegistrationProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
    },
  });

  return {
    createStrk20RegistrationProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
