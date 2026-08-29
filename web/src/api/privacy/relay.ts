import type { CallAndProof } from "@starkware-libs/starknet-privacy-sdk";
import axios, { isAxiosError } from "axios";
import { num } from "starknet";

type RelayResponse = {
  transactionHash?: string;
};

export async function submitStrk20Relay({
  callAndProof,
}: {
  callAndProof: CallAndProof;
}) {
  if (!Array.isArray(callAndProof.call.calldata)) {
    throw new Error("SDK returned a STRK20 call with non-array calldata.");
  }

  const calldata = callAndProof.call.calldata as string[];
  const call = {
    contractAddress: num.toHex(callAndProof.call.contractAddress),
    entrypoint: callAndProof.call.entrypoint,
    calldata: calldata.map(num.toHex),
  };
  const proof = {
    data: callAndProof.proof.data,
    proofFacts: callAndProof.proof.proofFacts.map(num.toHex),
  };

  let data: RelayResponse;
  try {
    ({ data } = await axios.post<RelayResponse>("/api/relay", { call, proof }));
  } catch (error) {
    if (isAxiosError<{ error?: string }>(error)) {
      throw new Error(error.response?.data?.error ?? error.message);
    }
    throw error;
  }
  if (!data.transactionHash) {
    throw new Error("The relay did not return a transaction hash.");
  }

  return data.transactionHash;
}
