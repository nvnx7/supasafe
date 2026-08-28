import { type Chain, devnet } from "@starknetfoundation/starknet-start-chains";
import { constants } from "starknet";
import { network, rpcUrlDevnet, rpcUrlSepolia } from "./env";

export type NetworkType = "devnet" | "sepolia";

export const DEVNET_CHAIN_ID = "0x4445564e4554"; // "DEVNET" in hex

export type NetworkConfig = {
  rpcUrl: string;
  chainId: string;
  udcAddress: string;
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
  udcAddress:
    "0x2CEED65A4BD731034C01113685C831B01C15D7D432F71AFB1CF1634B53A2125",
  privacyPoolAddress: "",
  multisigClassHash:
    "0x5fd9ebaf5712f4f36f8d925e3a8dcac0aafda991cc7f752d9e21f3841faa494",
};

const sepoliaConfig: NetworkConfig = {
  rpcUrl: rpcUrlSepolia,
  chainId: constants.StarknetChainId.SN_SEPOLIA,
  udcAddress: "",
  privacyPoolAddress:
    "0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91",
  multisigClassHash:
    "0x5fd9ebaf5712f4f36f8d925e3a8dcac0aafda991cc7f752d9e21f3841faa494",
};

export const networkConfigs: Record<NetworkType, NetworkConfig> = {
  devnet: devnetConfig,
  sepolia: sepoliaConfig,
};

export const networkConfig = networkConfigs[network];
