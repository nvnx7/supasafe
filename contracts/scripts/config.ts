import dotenv from "dotenv";

dotenv.config();

const chain = process.argv[2];
if (chain && chain !== "devnet" && chain !== "sepolia") {
  throw new Error(`Unsupported network "${chain}". Use "devnet" or "sepolia".`);
}

const isSepolia = chain === "sepolia";
const rpcDevnet = process.env.RPC_DEVNET as string;
const rpcSepolia = (process.env.RPC_SEPOLIA ?? process.env.RPC_URL) as string;

const addressDevnet = process.env.ADDRESS_DEVNET as string;
const addressSepolia = (process.env.ADDRESS_SEPOLIA ??
  process.env.DEPLOYER_ADDRESS) as string;

const privateKeyDevnet = process.env.PRIVATE_KEY_DEVNET as string;
const privateKeySepolia = (
  process.env.PRIVATE_KEY_SEPOLIA ??
  process.env.PRIVAT_KEY_SEPOLIA ??
  process.env.DEPLOYER_PRIVATE_KEY
) as string;

const devnetConfig = {
  name: "devnet",
  rpcUrl: rpcDevnet,
};

const sepoliaConfig = {
  name: "sepolia",
  rpcUrl: rpcSepolia,
};

export const networkConfig = isSepolia ? sepoliaConfig : devnetConfig;
export const deployerAddress = isSepolia ? addressSepolia : addressDevnet;
export const deployerPrivateKey = isSepolia ? privateKeySepolia : privateKeyDevnet;

if (!networkConfig.rpcUrl || !deployerAddress || !deployerPrivateKey) {
  throw new Error(`Missing deployer config for ${networkConfig.name}. Check contracts/.env.`);
}
