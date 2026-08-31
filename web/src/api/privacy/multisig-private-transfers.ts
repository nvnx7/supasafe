import { createPrivateTransfers } from "@starkware-libs/starknet-privacy-sdk";
import type { SignerInterface } from "starknet";
import { networkConfig } from "@/config/network";
import { createProofProvider } from "./proof-provider";

type CreateMultisigPrivateTransfersParams = {
  multisigAddress: string;
  viewingKey: bigint;
  signer?: SignerInterface;
};

const readOnlySigner: SignerInterface = {
  async signTransaction() {
    throw new Error("This STRK20 client is read-only.");
  },
  async getPubKey() {
    throw new Error("This STRK20 client is read-only.");
  },
  async signMessage() {
    throw new Error("This STRK20 client is read-only.");
  },
  async signDeclareTransaction() {
    throw new Error("This STRK20 client is read-only.");
  },
  async signDeployAccountTransaction() {
    throw new Error("This STRK20 client is read-only.");
  },
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
    account: { address: multisigAddress, signer: signer ?? readOnlySigner },
    viewingKeyProvider: { getViewingKey: async () => viewingKey },
    provingProvider: createProofProvider(networkConfig),
    discoveryProvider: { url: networkConfig.indexerUrl },
    poolContractAddress: networkConfig.privacyPoolAddress,
  });
}
