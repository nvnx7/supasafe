import { type Chain, devnet } from "@starknetfoundation/starknet-start-chains";
import { constants } from "starknet";
import {
  apiKeyStarkscanMainnet,
  indexerUrlMainnet,
  indexerUrlSepolia,
  network,
  proverUrlSepolia,
  rpcUrlDevnet,
  rpcUrlMainnet,
  rpcUrlSepolia,
} from "./env";

export type NetworkType = "devnet" | "sepolia" | "mainnet";

export const DEVNET_CHAIN_ID = "0x4445564e4554"; // "DEVNET" in hex

export type ProvingConfig =
  | {
      kind: "json-rpc";
      url: string;
    }
  | {
      kind: "starkscan";
      apiKey: string;
    };

export type NetworkConfig = {
  rpcUrl: string;
  chainId: string;
  indexerUrl: string;
  proving: ProvingConfig;
  multisigClassHash: string;
  privacyPoolAddress: string;
  supasafeFactoryAddress: string;
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
  indexerUrl: indexerUrlSepolia,
  proving: { kind: "json-rpc", url: proverUrlSepolia },
  multisigClassHash:
    "0x5fd9ebaf5712f4f36f8d925e3a8dcac0aafda991cc7f752d9e21f3841faa494",
  privacyPoolAddress: "",
  supasafeFactoryAddress:
    "0x2ee7434e31a72cb405693dd712d6b564ebb9792e3af4a84dda17076d6d3a230",
};

const sepoliaConfig: NetworkConfig = {
  rpcUrl: rpcUrlSepolia,
  chainId: constants.StarknetChainId.SN_SEPOLIA,
  indexerUrl: indexerUrlSepolia,
  proving: { kind: "json-rpc", url: proverUrlSepolia },
  privacyPoolAddress:
    "0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91",
  multisigClassHash:
    "0x5fd9ebaf5712f4f36f8d925e3a8dcac0aafda991cc7f752d9e21f3841faa494",
  supasafeFactoryAddress:
    "0x25a2f45ee1b147828cb0d259b3dd7dd3b6a0cb3c8c8b6fcfbdd23230305f26d",
};

const mainnetConfig: NetworkConfig = {
  rpcUrl: rpcUrlMainnet,
  chainId: constants.StarknetChainId.SN_MAIN,
  indexerUrl: indexerUrlMainnet,
  proving: { kind: "starkscan", apiKey: apiKeyStarkscanMainnet },
  multisigClassHash:
    "0x5fd9ebaf5712f4f36f8d925e3a8dcac0aafda991cc7f752d9e21f3841faa494",
  privacyPoolAddress:
    "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a",
  supasafeFactoryAddress:
    "0x397ea9acd2bbf727610c3fc6b46c933bee8859e4b02f2ea4fc4e77ce51796de",
};

export const networkConfigs: Record<NetworkType, NetworkConfig> = {
  devnet: devnetConfig,
  sepolia: sepoliaConfig,
  mainnet: mainnetConfig,
};

export const networkConfig = networkConfigs[network];
