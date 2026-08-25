"use client";

import type {
  CallAndProof,
  PrivateTransfersInterface,
} from "@starkware-libs/starknet-privacy-sdk";
import type {
  AccountInterface,
  BlockIdentifier,
  ProviderInterface,
} from "starknet";

export type PrivateTransfersParams = {
  transfers: PrivateTransfersInterface;
  account: AccountInterface;
  provingBlockId?: BlockIdentifier;
};

export async function getProvingBlockId(
  provider: ProviderInterface,
  provingBlockId?: BlockIdentifier,
) {
  if (provingBlockId !== undefined) return provingBlockId;

  return Math.max(0, (await provider.getBlockNumber()) - 10);
}

export async function submitCallAndProof(
  provider: ProviderInterface,
  account: AccountInterface,
  callAndProof: CallAndProof,
) {
  const proofDetails = callAndProof.proof.proofFacts.length
    ? {
        proof: callAndProof.proof.data,
        proofFacts: callAndProof.proof.proofFacts,
      }
    : {};
  const { transaction_hash: transactionHash } = await account.execute(
    callAndProof.call,
    { tip: 0n, ...proofDetails },
  );

  await provider.waitForTransaction(transactionHash);

  return { transactionHash };
}
