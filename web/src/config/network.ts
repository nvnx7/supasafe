import { type Chain, devnet } from "@starknetfoundation/starknet-start-chains";
import { constants } from "starknet";
import { network, rpcUrlDevnet, rpcUrlMainnet, rpcUrlSepolia } from "./env";

export type NetworkType = "devnet" | "sepolia" | "mainnet";

export const DEVNET_CHAIN_ID = "0x4445564e4554"; // "DEVNET" in hex

export type NetworkConfig = {
  rpcUrl: string;
  chainId: string;
  multisigClassHash: string;
  privacyPoolAddress: string;
  supasafeFactoryAddress: string;
  ekuboExecutorAddress: string;
  ekuboCoreAddress: string;
  ekuboRouterAddress: string;
  ekuboEthStrkPool?: {
    token0: string;
    token1: string;
    fee: string;
    tickSpacing: string;
    extension: string;
    skipAhead: string;
  };
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
  multisigClassHash:
    "0x5fd9ebaf5712f4f36f8d925e3a8dcac0aafda991cc7f752d9e21f3841faa494",
  privacyPoolAddress: "",
  supasafeFactoryAddress:
    "0x2ee7434e31a72cb405693dd712d6b564ebb9792e3af4a84dda17076d6d3a230",
  ekuboExecutorAddress: "",
  ekuboCoreAddress: " ",
  ekuboRouterAddress: "",
};

const sepoliaConfig: NetworkConfig = {
  rpcUrl: rpcUrlSepolia,
  chainId: constants.StarknetChainId.SN_SEPOLIA,
  privacyPoolAddress:
    "0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91",
  multisigClassHash:
    "0x5fd9ebaf5712f4f36f8d925e3a8dcac0aafda991cc7f752d9e21f3841faa494",
  supasafeFactoryAddress:
    "0x25a2f45ee1b147828cb0d259b3dd7dd3b6a0cb3c8c8b6fcfbdd23230305f26d",
  ekuboExecutorAddress:
    "0x028edb1e1b658dce072a9aea47b1e75cd82f68a8f15409233ec2e3abb7dbc95b",
  ekuboCoreAddress:
    "0x0444a09d96389aa7148f1aada508e30b71299ffe650d9c97fdaae38cb9a23384",
  ekuboRouterAddress:
    "0x0045f933adf0607292468ad1c1dedaa74d5ad166392590e72676a34d01d7b763",
  ekuboEthStrkPool: {
    token0:
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    token1:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    fee: "1020847100762815411640772995208708096",
    tickSpacing: "5982",
    extension: "0x0",
    skipAhead: "1",
  },
};

const mainnetConfig: NetworkConfig = {
  rpcUrl: rpcUrlMainnet,
  chainId: constants.StarknetChainId.SN_MAIN,
  multisigClassHash: "",
  privacyPoolAddress:
    "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a",
  supasafeFactoryAddress: "",
  ekuboExecutorAddress: "",
  ekuboCoreAddress:
    "0x00000005dd3D2F4429AF886cD1a3b08289DBcEa99A294197E9eB43b0e0325b4b",
  ekuboRouterAddress:
    "0x0199741822c2dc722f6f605204f35e56dbc23bceed54818168c4c49e4fb8737e",
};

export const networkConfigs: Record<NetworkType, NetworkConfig> = {
  devnet: devnetConfig,
  sepolia: sepoliaConfig,
  mainnet: mainnetConfig,
};

export const networkConfig = networkConfigs[network];
