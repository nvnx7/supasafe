import { Account, RpcProvider } from "starknet";
import {
  deployerAddress,
  deployerPrivateKey,
  networkConfig,
} from "./config.js";
import { loadClass } from "./utils.js";

const provider = new RpcProvider({ nodeUrl: networkConfig.rpcUrl });
const account = new Account({
  provider,
  address: deployerAddress,
  signer: deployerPrivateKey,
  cairoVersion: "1",
});

async function declareClass(name: string) {
  const { contract, casm } = loadClass(name);
  const declared = await account.declareIfNot({ contract, casm });
  if (declared.transaction_hash) {
    await provider.waitForTransaction(declared.transaction_hash);
  }
  return declared.class_hash;
}

async function main() {
  console.log(`network:   ${networkConfig.name}`);
  console.log(`rpc:       ${networkConfig.rpcUrl}`);
  console.log(`deployer:  ${account.address}`);

  const multisigClassHash = await declareClass("PrivateMultisigAccount");
  const factoryClassHash = await declareClass("SupasafeRegistryFactory");

  const deployed = await account.deployContract({
    classHash: factoryClassHash,
    constructorCalldata: [multisigClassHash],
  });
  await provider.waitForTransaction(deployed.transaction_hash);

  console.log("\nDeployed SupasafeRegistryFactory");
  console.log(`Address:    ${deployed.contract_address}`);
  console.log(`Class hash: ${factoryClassHash}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
