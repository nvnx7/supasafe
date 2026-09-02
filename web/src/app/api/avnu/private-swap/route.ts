import {
  buildPrivateSwapFee,
  type PrivateFeeMode,
  submitPrivateSwap,
} from "@avnu/avnu-sdk";
import { getAvnuOptions } from "@/api/privacy/avnu/config";
import { networkConfig } from "@/config/network";

export const runtime = "nodejs";

const MAX_PROOF_BYTES = 1_000_000;
const MAX_CALLDATA_LENGTH = 1_000;
const MAX_PROOF_FACTS_LENGTH = 128;

type FeeMode = {
  poolFeeToken: string;
  tip: "slow" | "normal" | "fast";
};

type BuildFeePayload = {
  action: "build-fee";
  feeMode: FeeMode;
};

type SubmitPayload = {
  action: "submit";
  feeMode: FeeMode;
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
    if (isBuildFeePayload(payload)) {
      const fee = await buildPrivateSwapFee(
        {
          poolAddress: networkConfig.privacyPoolAddress,
          feeMode: toPrivateFeeMode(payload.feeMode),
          paymasterApiKey: getPaymasterApiKey(),
        },
        getAvnuOptions(),
      );
      return Response.json({
        fee: { ...fee, amount: fee.amount.toString() },
      });
    }

    if (!isSubmitPayload(payload)) {
      return Response.json(
        { error: "Invalid AVNU private swap payload." },
        { status: 400 },
      );
    }
    if (!isPrivacyPoolCall(payload.call)) {
      return Response.json(
        { error: "Only privacy-pool apply_actions calls can be submitted." },
        { status: 400 },
      );
    }

    const transaction = await submitPrivateSwap(
      {
        callAndProof: {
          call: payload.call,
          proof: {
            data: payload.proof.data,
            proofFacts: payload.proof.proofFacts,
          },
        },
        feeMode: toPrivateFeeMode(payload.feeMode),
        paymasterApiKey: getPaymasterApiKey(),
      },
      getAvnuOptions(),
    );
    return Response.json({ transactionHash: transaction.transactionHash });
  } catch (error) {
    console.error("AVNU private swap submission failed.");
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AVNU private swap request failed.",
      },
      { status: 500 },
    );
  }
}

function getPaymasterApiKey() {
  const apiKey = process.env.AVNU_PAYMASTER_API_KEY;
  if (!apiKey) {
    throw new Error("The AVNU paymaster API key is not configured.");
  }
  return apiKey;
}

function toPrivateFeeMode(feeMode: FeeMode): PrivateFeeMode {
  return {
    poolFeeToken: feeMode.poolFeeToken,
    tip: feeMode.tip,
  };
}

function isBuildFeePayload(value: unknown): value is BuildFeePayload {
  return (
    isRecord(value) && value.action === "build-fee" && isFeeMode(value.feeMode)
  );
}

function isSubmitPayload(value: unknown): value is SubmitPayload {
  return (
    isRecord(value) &&
    value.action === "submit" &&
    isFeeMode(value.feeMode) &&
    isRecord(value.call) &&
    typeof value.call.contractAddress === "string" &&
    typeof value.call.entrypoint === "string" &&
    Array.isArray(value.call.calldata) &&
    value.call.calldata.length <= MAX_CALLDATA_LENGTH &&
    value.call.calldata.every(isFelt) &&
    isRecord(value.proof) &&
    typeof value.proof.data === "string" &&
    value.proof.data.length <= MAX_PROOF_BYTES &&
    Array.isArray(value.proof.proofFacts) &&
    value.proof.proofFacts.length <= MAX_PROOF_FACTS_LENGTH &&
    value.proof.proofFacts.every(isFelt)
  );
}

function isFeeMode(value: unknown): value is FeeMode {
  return (
    isRecord(value) &&
    isFelt(value.poolFeeToken) &&
    (value.tip === "slow" || value.tip === "normal" || value.tip === "fast")
  );
}

function isPrivacyPoolCall(call: SubmitPayload["call"]) {
  try {
    return (
      BigInt(call.contractAddress) ===
        BigInt(networkConfig.privacyPoolAddress) &&
      call.entrypoint === "apply_actions"
    );
  } catch {
    return false;
  }
}

function isFelt(value: unknown): value is string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) {
    return false;
  }

  try {
    return BigInt(value) < 2n ** 251n + 17n * 2n ** 192n + 1n;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
