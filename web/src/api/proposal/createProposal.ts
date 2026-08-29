"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { num } from "starknet";
import { networkConfig } from "@/config/network";
import type {
  MultisigProposal,
  MultisigProposalDisplay,
} from "@/lib/multisig-proposal-provider";
import { computeCallSetHash, type MultisigCall } from "@/lib/signing";
import { multisigProposalProvider } from "./provider";

export type CreateProposalParams = {
  multisigAddress: string;
  owners: string[];
  threshold: number;
  calls: MultisigCall[];
  additionalData?: string[];
  display: MultisigProposalDisplay;
};

export function buildProposal({
  multisigAddress,
  owners,
  threshold,
  calls,
  additionalData = [],
  display,
}: CreateProposalParams): MultisigProposal {
  const now = Date.now();
  const hash = num.toHex(
    computeCallSetHash(
      multisigAddress,
      calls,
      networkConfig.chainId,
      additionalData,
    ),
  );

  return {
    hash,
    multisigAddress,
    owners,
    threshold,
    calls,
    additionalData,
    display,
    signatures: [],
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: CreateProposalParams) => {
      const proposal = buildProposal(params);
      await multisigProposalProvider.saveProposal(proposal);
      return proposal;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
    },
  });

  return { createProposalAsync: mutation.mutateAsync, ...mutation };
}
