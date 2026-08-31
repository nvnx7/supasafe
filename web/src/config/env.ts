export type Network = "devnet" | "sepolia" | "mainnet";

export const network = "sepolia" as Network;

// export const network: Network =
//   (process.env.NEXT_PUBLIC_STARKNET_NETWORK as Network) || "devnet";

export const isDevnet = network === "devnet";
export const isSepolia = network === "sepolia";
export const isMainnet = network === "mainnet";

export const rpcUrlDevnet = process.env.NEXT_PUBLIC_RPC_URL_DEVNET as string;
export const rpcUrlSepolia = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA as string;
export const rpcUrlMainnet = process.env.NEXT_PUBLIC_RPC_URL_MAINNET as string;

export const proverUrlSepolia = process.env
  .NEXT_PUBLIC_PROVER_URL_SEPOLIA as string;
export const indexerUrlSepolia = process.env
  .NEXT_PUBLIC_INDEXER_URL_SEPOLIA as string;
export const apiKeyStarkscan = process.env
  .NEXT_PUBLIC_API_KEY_STARKSCAN as string;
