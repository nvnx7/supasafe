export type Network = "devnet" | "sepolia";

export const network: Network =
  (process.env.NEXT_PUBLIC_STARKNET_NETWORK as Network) || "devnet";

export const isDevnet = network === "devnet";
export const isSepolia = network === "sepolia";

export const rpcUrlDevnet = process.env.NEXT_PUBLIC_RPC_URL_DEVNET as string;
export const rpcUrlSepolia = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA as string;

