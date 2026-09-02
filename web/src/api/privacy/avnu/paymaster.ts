import type { CallAndProof } from "@starkware-libs/starknet-privacy-sdk";
import axios, { isAxiosError } from "axios";
import { num } from "starknet";

export type AvnuPrivateSwapFeeMode = {
  poolFeeToken: string;
  tip: "slow" | "normal" | "fast";
};

type AvnuPrivateSwapFee = {
  token: string;
  recipient: string;
  amount: bigint;
};

type BuildFeeResponse = {
  fee?: {
    token: string;
    recipient: string;
    amount: string;
  };
};

type SubmitResponse = {
  transactionHash?: string;
};

export async function buildAvnuPrivateSwapFee(
  feeMode: AvnuPrivateSwapFeeMode,
): Promise<AvnuPrivateSwapFee> {
  let data: BuildFeeResponse;
  try {
    ({ data } = await axios.post<BuildFeeResponse>("/api/avnu/private-swap", {
      action: "build-fee",
      feeMode,
    }));
  } catch (error) {
    throw toAvnuPaymasterError(error);
  }

  if (!data.fee) {
    throw new Error("AVNU did not return a private swap fee.");
  }

  return {
    token: data.fee.token,
    recipient: data.fee.recipient,
    amount: BigInt(data.fee.amount),
  };
}

export async function submitAvnuPrivateSwap({
  callAndProof,
  feeMode,
}: {
  callAndProof: CallAndProof;
  feeMode: AvnuPrivateSwapFeeMode;
}) {
  if (!Array.isArray(callAndProof.call.calldata)) {
    throw new Error("SDK returned a STRK20 call with non-array calldata.");
  }
  const calldata = callAndProof.call.calldata as string[];

  let data: SubmitResponse;
  try {
    ({ data } = await axios.post<SubmitResponse>("/api/avnu/private-swap", {
      action: "submit",
      feeMode,
      call: {
        contractAddress: num.toHex(callAndProof.call.contractAddress),
        entrypoint: callAndProof.call.entrypoint,
        calldata: calldata.map(num.toHex),
      },
      proof: {
        data: callAndProof.proof.data,
        proofFacts: callAndProof.proof.proofFacts.map(num.toHex),
      },
    }));
  } catch (error) {
    throw toAvnuPaymasterError(error);
  }

  if (!data.transactionHash) {
    throw new Error("AVNU did not return a transaction hash.");
  }

  return data.transactionHash;
}

function toAvnuPaymasterError(error: unknown): Error {
  if (isAxiosError<{ error?: string }>(error)) {
    return new Error(error.response?.data?.error ?? error.message);
  }

  return error instanceof Error
    ? error
    : new Error("AVNU private swap request failed.");
}
