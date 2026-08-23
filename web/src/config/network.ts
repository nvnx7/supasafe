import { type Chain, devnet } from "@starknet-start/chains";
import { constants } from "starknet";
import {
  network,
  rpcUrlDevnet,
  rpcUrlSepolia,
} from "./env";

export type NetworkType = "devnet" | "sepolia";

export const DEVNET_CHAIN_ID = "0x4445564e4554"; // "DEVNET" in hex

export type NetworkConfig = {
  rpcUrl: string;
  chainId: string;
  privacyPoolAddress: string;
  multisigClassHash: string;
};

export const devnetChain: Chain = {
  ...devnet,
  id: BigInt(DEVNET_CHAIN_ID),
  rpcUrls: {
    default: { http: [rpcUrlDevnet] },
    public: { http: [rpcUrlDevnet] },
  },
};

const devnetConfig: NetworkConfig = {
  rpcUrl: rpcUrlDevnet,
  chainId: DEVNET_CHAIN_ID,
  privacyPoolAddress: '',
  multisigClassHash: ''
};

const sepoliaConfig: NetworkConfig = {
  rpcUrl: rpcUrlSepolia,
  chainId: constants.StarknetChainId.SN_SEPOLIA,
  privacyPoolAddress: '',
  multisigClassHash: ''
};

export const networkConfigs: Record<NetworkType, NetworkConfig> = {
  devnet: devnetConfig,
  sepolia: sepoliaConfig,
};

export const networkConfig = networkConfigs[network];