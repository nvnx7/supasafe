import dotenv from "dotenv";

dotenv.config();

const chain = process.argv[2];
if (chain && chain !== "devnet" && chain !== "sepolia") {
  throw new Error(`Unsupported network "${chain}". Use "devnet" or "sepolia".`);
}

const rpcDevnet = process.env.RPC_DEVNET as string;
const rpcSepolia = process.env.RPC_SEPOLIA as string;

const addressDevnet = process.env.ADDRESS_DEVNET as string;
const addressSepolia = process.env.ADDRESS_SEPOLIA as string;

const privateKeyDevnet = process.env.PRIVATE_KEY_DEVNET as string;
const privateKeySepolia = process.env.PRIVATE_KEY_SEPOLIA as string;

const devnetConfig = {
  name: "devnet",
  rpcUrl: rpcDevnet,
};

const sepoliaConfig = {
  name: "sepolia",
  rpcUrl: rpcSepolia,
};

export const networkConfig = chain === "sepolia" ? sepoliaConfig : devnetConfig;
export const deployerAddress =
  chain === "sepolia" ? addressSepolia : addressDevnet;
export const deployerPrivateKey =
  chain === "sepolia" ? privateKeySepolia : privateKeyDevnet;
