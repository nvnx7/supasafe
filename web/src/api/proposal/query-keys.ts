import { networkConfig } from "@/config/network";

export const proposalQueryKeys = {
  lists: ["multisigProposals", networkConfig.chainId] as const,
  list: (multisigAddress: string | undefined, owner: string | undefined) =>
    [
      "multisigProposals",
      networkConfig.chainId,
      multisigAddress,
      owner,
    ] as const,
  detail: (hash: string | undefined) =>
    ["multisigProposal", networkConfig.chainId, hash] as const,
};
