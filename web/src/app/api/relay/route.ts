import { Account, constants, RpcProvider } from "starknet";
import { networkConfig } from "@/config/network";

export const runtime = "nodejs";

const MAX_PROOF_BYTES = 1_000_000;
const MAX_CALLDATA_LENGTH = 1_000;
const MAX_PROOF_FACTS_LENGTH = 128;
const STRK_TOKEN_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

type RelayPayload = {
  call: {
    contractAddress: string;
    entrypoint: string;
    calldata: string[];
  };
  proof: {
    data: string;
    proofFacts: string[];
  };
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!isRelayPayload(payload)) {
      return Response.json(
        { error: "Invalid relay payload." },
        { status: 400 },
      );
    }
    if (!isPrivacyPoolCall(payload.call)) {
      return Response.json(
        { error: "Only privacy-pool apply_actions calls can be relayed." },
        { status: 400 },
      );
    }

    const { account: relayAccount, relayAddressEnv } = getRelayAccount();
    const feeAmount = await getPoolFeeAmount(relayAccount.provider);
    await ensureRelayCanPayPoolFee({
      provider: relayAccount.provider,
      relayAddress: relayAccount.address,
      relayAddressEnv,
      feeAmount,
    });
    const transaction = await relayAccount.execute(
      [
        ...(feeAmount > 0n
          ? [
              {
                contractAddress: STRK_TOKEN_ADDRESS,
                entrypoint: "approve",
                calldata: [networkConfig.privacyPoolAddress, feeAmount, 0n],
              },
            ]
          : []),
        {
          contractAddress: payload.call.contractAddress,
          entrypoint: payload.call.entrypoint,
          calldata: payload.call.calldata,
        },
      ],
      {
        tip: 0n,
        proof: payload.proof.data,
        proofFacts: payload.proof.proofFacts,
      },
    );

    return Response.json({ transactionHash: transaction.transaction_hash });
  } catch (error) {
    console.error("STRK20 relay submission failed.");
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Relay submission failed.",
      },
      { status: 500 },
    );
  }
}

async function getPoolFeeAmount(provider: RpcProvider) {
  const result = await provider.callContract({
    contractAddress: networkConfig.privacyPoolAddress,
    entrypoint: "get_fee_amount",
  });

  const [feeAmount] = result;
  if (result.length !== 1 || !feeAmount) {
    throw new Error("The privacy pool returned an invalid fee amount.");
  }

  return BigInt(feeAmount);
}

async function ensureRelayCanPayPoolFee({
  provider,
  relayAddress,
  relayAddressEnv,
  feeAmount,
}: {
  provider: RpcProvider;
  relayAddress: string;
  relayAddressEnv: string;
  feeAmount: bigint;
}) {
  if (feeAmount === 0n) {
    return;
  }

  const balance = await provider.callContract({
    contractAddress: STRK_TOKEN_ADDRESS,
    entrypoint: "balanceOf",
    calldata: [relayAddress],
  });
  const [low, high] = balance;

  if (balance.length !== 2 || !low || !high) {
    throw new Error("Could not read the relayer's STRK balance.");
  }

  const available = BigInt(low) + (BigInt(high) << 128n);
  if (available < feeAmount) {
    throw new Error(
      `The relay account needs at least ${formatStrk(feeAmount)} STRK for the privacy-pool fee, but has ${formatStrk(available)} STRK. Fund ${relayAddressEnv} with STRK and leave extra for network gas.`,
    );
  }
}

function formatStrk(amount: bigint) {
  const decimals = 10n ** 18n;
  const whole = amount / decimals;
  const fraction = (amount % decimals).toString().padStart(18, "0");
  const significantFraction = fraction.slice(0, 6).replace(/0+$/, "");

  return significantFraction
    ? `${whole}.${significantFraction}`
    : whole.toString();
}

function getRelayAccount() {
  const relayCredentials = getRelayCredentials();

  if (!relayCredentials.address || !relayCredentials.privateKey) {
    throw new Error(
      `The relay account is not configured. Set ${relayCredentials.addressEnv} and ${relayCredentials.privateKeyEnv}.`,
    );
  }

  return {
    account: new Account({
      provider: new RpcProvider({ nodeUrl: networkConfig.rpcUrl }),
      address: relayCredentials.address,
      signer: relayCredentials.privateKey,
      cairoVersion: "1",
    }),
    relayAddressEnv: relayCredentials.addressEnv,
  };
}

function getRelayCredentials() {
  switch (networkConfig.chainId) {
    case constants.StarknetChainId.SN_SEPOLIA:
      return {
        address: process.env.RELAYER_ADDRESS_SEPOLIA,
        privateKey: process.env.RELAYER_PRIVATE_KEY_SEPOLIA,
        addressEnv: "RELAYER_ADDRESS_SEPOLIA",
        privateKeyEnv: "RELAYER_PRIVATE_KEY_SEPOLIA",
      };
    case constants.StarknetChainId.SN_MAIN:
      return {
        address: process.env.RELAYER_ADDRESS_MAINNET,
        privateKey: process.env.RELAYER_PRIVATE_KEY_MAINNET,
        addressEnv: "RELAYER_ADDRESS_MAINNET",
        privateKeyEnv: "RELAYER_PRIVATE_KEY_MAINNET",
      };
    default:
      throw new Error(
        "STRK20 relaying is only configured for Sepolia and mainnet.",
      );
  }
}

function isRelayPayload(value: unknown): value is RelayPayload {
  if (!isRecord(value) || !isRecord(value.call) || !isRecord(value.proof)) {
    return false;
  }

  const { call, proof } = value;
  return (
    typeof call.contractAddress === "string" &&
    typeof call.entrypoint === "string" &&
    Array.isArray(call.calldata) &&
    call.calldata.length <= MAX_CALLDATA_LENGTH &&
    call.calldata.every(isFelt) &&
    typeof proof.data === "string" &&
    proof.data.length > 0 &&
    proof.data.length <= MAX_PROOF_BYTES &&
    Array.isArray(proof.proofFacts) &&
    proof.proofFacts.length > 0 &&
    proof.proofFacts.length <= MAX_PROOF_FACTS_LENGTH &&
    proof.proofFacts.every(isFelt)
  );
}

function isPrivacyPoolCall(call: RelayPayload["call"]): boolean {
  return (
    call.entrypoint === "apply_actions" &&
    isFelt(call.contractAddress) &&
    BigInt(call.contractAddress) === BigInt(networkConfig.privacyPoolAddress)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFelt(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    return BigInt(value) >= 0n;
  } catch {
    return false;
  }
}
