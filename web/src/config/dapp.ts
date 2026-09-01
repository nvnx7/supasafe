import { type Network, network } from "./env";

export type EkuboPoolConfig = {
  token0: string;
  token1: string;
  fee: string;
  tickSpacing: string;
  extension: string;
  skipAhead: string;
};

export type EkuboConfig = {
  executorAddress: string;
  coreAddress: string;
  routerAddress: string;
  pools: EkuboPoolConfig[];
};

export const ekuboDevnetConfig: EkuboConfig = {
  executorAddress: "",
  coreAddress: "",
  routerAddress: "",
  pools: [],
};

export const ekuboSepoliaConfig: EkuboConfig = {
  executorAddress:
    "0x028edb1e1b658dce072a9aea47b1e75cd82f68a8f15409233ec2e3abb7dbc95b",
  coreAddress:
    "0x0444a09d96389aa7148f1aada508e30b71299ffe650d9c97fdaae38cb9a23384",
  routerAddress:
    "0x0045f933adf0607292468ad1c1dedaa74d5ad166392590e72676a34d01d7b763",
  pools: [
    {
      token0:
        "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      token1:
        "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
      fee: "1020847100762815411640772995208708096",
      tickSpacing: "5982",
      extension: "0x0",
      skipAhead: "1",
    },
  ],
};

export const ekuboMainnetConfig: EkuboConfig = {
  executorAddress: "",
  coreAddress:
    "0x00000005dd3D2F4429AF886cD1a3b08289DBcEa99A294197E9eB43b0e0325b4b",
  routerAddress:
    "0x0199741822c2dc722f6f605204f35e56dbc23bceed54818168c4c49e4fb8737e",
  pools: [],
};

const ekuboConfigs: Record<Network, EkuboConfig> = {
  devnet: ekuboDevnetConfig,
  sepolia: ekuboSepoliaConfig,
  mainnet: ekuboMainnetConfig,
};

export const ekuboConfig = ekuboConfigs[network];
