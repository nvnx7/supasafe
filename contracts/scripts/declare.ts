import { Account, RpcProvider } from "starknet";
import { deployerAddress, deployerPrivateKey, networkConfig } from "./config";
import { loadClass } from "./utils.js";

const rpcUrl = networkConfig.rpcUrl;
const provider = new RpcProvider({ nodeUrl: rpcUrl });
const account = new Account({
  provider,
  address: deployerAddress,
  signer: deployerPrivateKey,
});

async function main() {
  console.log(`network:   ${networkConfig.name}`);
  console.log(`rpc:       ${rpcUrl}`);
  console.log(`declarer:  ${account.address}`);

  const { contract, casm } = loadClass("PrivateMultisigAccount");
  const declared = await account.declareIfNot({ contract, casm });
  if (declared.transaction_hash) {
    await provider.waitForTransaction(declared.transaction_hash);
  }

  const classHash = declared.class_hash;
  const alreadyDeclared = !declared.transaction_hash;

  console.log(alreadyDeclared ? "\nAlready declared" : "\nDeclared");
  console.log(`Class hash: ${classHash}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
