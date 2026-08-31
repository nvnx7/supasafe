import dotenv from "dotenv";

dotenv.config();

const chain = process.argv[2];
if (chain && chain !== "devnet" && chain !== "sepolia" && chain !== "mainnet") {
  throw new Error(
    `Unsupported network "${chain}". Use "devnet", "sepolia", or "mainnet".`,
  );
}

const isSepolia = chain === "sepolia";
const isMainnet = chain === "mainnet";
const rpcDevnet = process.env.RPC_DEVNET as string;
const rpcSepolia = process.env.RPC_SEPOLIA as string;
const rpcMainnet = process.env.RPC_MAINNET as string;

const addressDevnet = process.env.ADDRESS_DEVNET as string;
const addressSepolia = process.env.ADDRESS_SEPOLIA as string;
const addressMainnet = process.env.ADDRESS_MAINNET as string;

const privateKeyDevnet = process.env.PRIVATE_KEY_DEVNET as string;
const privateKeySepolia = process.env.PRIVATE_KEY_SEPOLIA as string;
const privateKeyMainnet = process.env.PRIVATE_KEY_MAINNET as string;

const devnetConfig = {
  name: "devnet",
  rpcUrl: rpcDevnet,
};

const sepoliaConfig = {
  name: "sepolia",
  rpcUrl: rpcSepolia,
};

const mainnetConfig = {
  name: "mainnet",
  rpcUrl: rpcMainnet,
};

export const networkConfig = isMainnet
  ? mainnetConfig
  : isSepolia
    ? sepoliaConfig
    : devnetConfig;
export const deployerAddress = isMainnet
  ? addressMainnet
  : isSepolia
    ? addressSepolia
    : addressDevnet;
export const deployerPrivateKey = isMainnet
  ? privateKeyMainnet
  : isSepolia
    ? privateKeySepolia
    : privateKeyDevnet;

if (!networkConfig.rpcUrl || !deployerAddress || !deployerPrivateKey) {
  throw new Error(
    `Missing deployer config for ${networkConfig.name}. Check contracts/.env.`,
  );
}
