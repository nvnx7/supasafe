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
  udcAddress: string,
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
  udcAddress: '0x2CEED65A4BD731034C01113685C831B01C15D7D432F71AFB1CF1634B53A2125',
  privacyPoolAddress: '',
  multisigClassHash: '0x737a039638b16426950d45af6f6026461d22e0b6a148be6321bffb93fdce538'
};

const sepoliaConfig: NetworkConfig = {
  rpcUrl: rpcUrlSepolia,
  chainId: constants.StarknetChainId.SN_SEPOLIA,
  udcAddress: '',
  privacyPoolAddress: '',
  multisigClassHash: ''
};

export const networkConfigs: Record<NetworkType, NetworkConfig> = {
  devnet: devnetConfig,
  sepolia: sepoliaConfig,
};

export const networkConfig = networkConfigs[network];