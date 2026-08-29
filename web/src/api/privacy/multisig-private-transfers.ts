import { createPrivateTransfers } from "@starkware-libs/starknet-privacy-sdk";
import type { constants, SignerInterface } from "starknet";
import { indexerUrl, proverUrl } from "@/config/env";
import { networkConfig } from "@/config/network";

type CreateMultisigPrivateTransfersParams = {
  multisigAddress: string;
  viewingKey: bigint;
  signer: SignerInterface;
};

export function createMultisigPrivateTransfers({
  multisigAddress,
  viewingKey,
  signer,
}: CreateMultisigPrivateTransfersParams) {
  if (!networkConfig.privacyPoolAddress) {
    throw new Error("No privacy pool is configured for this network.");
  }

  return createPrivateTransfers({
    account: { address: multisigAddress, signer },
    viewingKeyProvider: { getViewingKey: async () => viewingKey },
    provingProvider: {
      url: proverUrl,
      chainId: networkConfig.chainId as constants.StarknetChainId,
    },
    discoveryProvider: { url: indexerUrl },
    poolContractAddress: networkConfig.privacyPoolAddress,
  });
}
