"use client";

import { useQuery } from "@tanstack/react-query";
import { multisigProposalProvider } from "./provider";
import { proposalQueryKeys } from "./query-keys";

export function useGetProposal(hash: string | undefined) {
  return useQuery({
    queryKey: proposalQueryKeys.detail(hash),
    queryFn: () => multisigProposalProvider.getProposal(hash as string),
    enabled: Boolean(hash),
  });
}
