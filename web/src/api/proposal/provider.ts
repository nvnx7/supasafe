import { networkConfig } from "@/config/network";
import { HttpMultisigProposalProvider } from "@/lib/http-multisig-proposal-provider";

export const multisigProposalProvider = new HttpMultisigProposalProvider(
  networkConfig.chainId,
);
