"use client";

import type { Quote } from "@avnu/avnu-sdk";
import { useMutation } from "@tanstack/react-query";
import type { Signature } from "starknet";
import type { MultisigDetail } from "@/lib/multisig";
import {
  type AvnuPrivateSwapFeeMode,
  createMultisigAvnuPrivateSwapProposal,
} from "../avnu";
import { getEndurConfig } from "./config";

export type CreateMultisigEndurUnstakeProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  provingBlockId: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  quote: Quote;
  slippage: number;
  feeMode: AvnuPrivateSwapFeeMode;
};

export async function createMultisigEndurUnstakeProposal(
  params: CreateMultisigEndurUnstakeProposalParams,
) {
  const { strkTokenAddress, xStrkTokenAddress } = getEndurConfig();
  if (
    BigInt(params.quote.sellTokenAddress) !== BigInt(xStrkTokenAddress) ||
    BigInt(params.quote.buyTokenAddress) !== BigInt(strkTokenAddress)
  ) {
    throw new Error("Endur unstaking requires an xSTRK to STRK quote.");
  }

  return createMultisigAvnuPrivateSwapProposal({
    ...params,
    sellTokenSymbol: "xSTRK",
    buyTokenSymbol: "STRK",
    title: "Unstake xSTRK through Endur",
    description:
      "Instantly convert this multisig's private xSTRK to private STRK through AVNU.",
  });
}

export function useCreateMultisigEndurUnstakeProposal() {
  const mutation = useMutation({
    mutationFn: createMultisigEndurUnstakeProposal,
  });
  return {
    createMultisigEndurUnstakeProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
