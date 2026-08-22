/**
 * Declares and deploys `PrivateMultisigAccount`.
 *
 *   bun run deploy            # devnet (default)
 *   bun run deploy sepolia
 *
 * On devnet the deployer is pulled from the node's predeployed accounts, so no
 * configuration is needed. On any other network `DEPLOYER_ADDRESS` and
 * `DEPLOYER_PRIVATE_KEY` must be set — see .env.example.
 *
 * This deploys the account through the UDC from a funded deployer. Deploying it
 * counterfactually (a real DEPLOY_ACCOUNT transaction exercising
 * `__validate_deploy__`) needs a signer that emits the multisig's bundle
 * encoding, and is handled separately.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Account, CallData, ec, json, RpcProvider } from "starknet";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(__dirname, "../target/dev");

const network = process.argv[2] ?? "devnet";
const isDevnet = network === "devnet";

function resolveRpcUrl(): string {
  const url =
    process.env.RPC_URL ?? (isDevnet ? "http://127.0.0.1:5050/rpc" : undefined);
  if (!url) {
    throw new Error(`RPC_URL must be set for network "${network}".`);
  }
  return url;
}

const rpcUrl = resolveRpcUrl();

/**
 * Owner public keys for the deployed multisig.
 *
 * Falls back to keys derived from the low integers 1..3 on devnet only — these
 * are the same throwaway keys the Cairo tests use and must never be relied on
 * anywhere else.
 */
function ownerKeys(): string[] {
  const configured = process.env.MULTISIG_OWNERS;
  if (configured) {
    return configured
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }
  if (!isDevnet) {
    throw new Error(`MULTISIG_OWNERS must be set for network "${network}".`);
  }
  console.warn("MULTISIG_OWNERS unset — using insecure devnet test keys 1..3");
  return ["0x1", "0x2", "0x3"].map((sk) => ec.starkCurve.getStarkKey(sk));
}

async function devnetDeployer(provider: RpcProvider): Promise<Account> {
  let payload: { result?: { address: string; private_key: string }[] };
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "devnet_getPredeployedAccounts",
        params: [],
      }),
    });
    payload = await res.json();
  } catch {
    throw new Error(
      `Could not reach devnet at ${rpcUrl}. Is 'just devnet' running?`,
    );
  }
  const first = payload.result?.[0];
  if (!first) throw new Error("Devnet returned no predeployed accounts.");
  return new Account({
    provider,
    address: first.address,
    signer: first.private_key,
  });
}

function configuredDeployer(provider: RpcProvider): Account {
  const address = process.env.DEPLOYER_ADDRESS;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!address || !privateKey) {
    throw new Error(
      "DEPLOYER_ADDRESS and DEPLOYER_PRIVATE_KEY must be set in .env",
    );
  }
  return new Account({ provider, address, signer: privateKey });
}

function loadClass(name: string) {
  const sierraPath = path.join(
    TARGET_DIR,
    `supersafe_${name}.contract_class.json`,
  );
  const casmPath = path.join(
    TARGET_DIR,
    `supersafe_${name}.compiled_contract_class.json`,
  );
  for (const p of [sierraPath, casmPath]) {
    if (!fs.existsSync(p)) {
      throw new Error(
        `Missing artifact ${path.basename(p)}. Run 'just build-contracts' first.`,
      );
    }
  }
  return {
    contract: json.parse(fs.readFileSync(sierraPath).toString("ascii")),
    casm: json.parse(fs.readFileSync(casmPath).toString("ascii")),
  };
}

async function main() {
  const provider = new RpcProvider({ nodeUrl: rpcUrl });
  const account = isDevnet
    ? await devnetDeployer(provider)
    : configuredDeployer(provider);

  const owners = ownerKeys();
  const threshold = Number(process.env.MULTISIG_THRESHOLD ?? 2);
  if (
    !Number.isInteger(threshold) ||
    threshold < 1 ||
    threshold > owners.length
  ) {
    throw new Error(
      `MULTISIG_THRESHOLD must be an integer in 1..${owners.length}, got ${threshold}`,
    );
  }

  console.log(`network:   ${network}`);
  console.log(`rpc:       ${rpcUrl}`);
  console.log(`deployer:  ${account.address}`);
  console.log(`owners:    ${owners.length} (threshold ${threshold})`);
  owners.forEach((k, i) => {
    console.log(`  [${i}] ${k}`);
  });

  const { contract, casm } = loadClass("PrivateMultisigAccount");

  console.log("\n--- Declaring PrivateMultisigAccount ---");
  const declared = await account.declareIfNot({ contract, casm });
  if (declared.transaction_hash) {
    await provider.waitForTransaction(declared.transaction_hash);
  }
  console.log(`class hash: ${declared.class_hash}`);

  console.log("\n--- Deploying PrivateMultisigAccount ---");
  const deployed = await account.deploy({
    classHash: declared.class_hash,
    constructorCalldata: CallData.compile({ owners, threshold }),
  });
  await provider.waitForTransaction(deployed.transaction_hash);

  const address = deployed.contract_address[0];
  console.log(`address:    ${address}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
