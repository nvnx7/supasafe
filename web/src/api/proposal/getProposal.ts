"use client";

import { useQuery } from "@tanstack/react-query";
import { multisigProposalProvider } from "./provider";

export function useGetProposal(hash: string | undefined) {
  return useQuery({
    queryKey: ["multisigProposal", hash],
    queryFn: () => multisigProposalProvider.getProposal(hash as string),
    enabled: Boolean(hash),
  });
}
