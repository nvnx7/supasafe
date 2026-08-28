"use client";

import { useQuery } from "@tanstack/react-query";
import { multisigProposalProvider } from "./provider";

export function useGetOwnerProposals(
  multisigAddress: string | undefined,
  owner: string | undefined,
) {
  return useQuery({
    queryKey: ["multisigProposals", multisigAddress, owner],
    queryFn: () =>
      multisigProposalProvider.getOwnerProposals({
        multisigAddress: multisigAddress as string,
        owner: owner as string,
      }),
    enabled: Boolean(multisigAddress && owner),
  });
}
