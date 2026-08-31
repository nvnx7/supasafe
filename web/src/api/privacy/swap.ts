"use client";

import { Open } from "@starkware-libs/starknet-privacy-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { networkConfig } from "@/config/network";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "./create-multisig-strk20-proposal";

export type CreateMultisigSwapProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  provingBlockId: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  fromToken: string;
  fromTokenSymbol: string;
  toToken: string;
  toTokenSymbol: string;
  amount: bigint;
  minimumReceived: bigint;
};

function getEkuboSwapConfig(fromToken: string, toToken: string) {
  const { executorAddress, routerAddress, ethStrkPool } = networkConfig.ekubo;

  if (!executorAddress || !routerAddress || !ethStrkPool) {
    throw new Error("Ekubo swap is not configured for this network.");
  }

  const poolTokens = [BigInt(ethStrkPool.token0), BigInt(ethStrkPool.token1)];
  const swapTokens = [BigInt(fromToken), BigInt(toToken)];
  if (!poolTokens.every((poolToken) => swapTokens.includes(poolToken))) {
    throw new Error("This token pair is not supported by the Ekubo swap pool.");
  }

  return { executorAddress, routerAddress, ethStrkPool };
}

export async function createMultisigSwapProposal({
  multisig,
  owner,
  viewingKey,
  provingBlockId,
  signApproval,
  fromToken,
  fromTokenSymbol,
  toToken,
  toTokenSymbol,
  amount,
  minimumReceived,
}: CreateMultisigSwapProposalParams) {
  if (BigInt(fromToken) === BigInt(toToken)) {
    throw new Error("Choose two different tokens to swap.");
  }
  const { executorAddress, routerAddress, ethStrkPool } = getEkuboSwapConfig(
    fromToken,
    toToken,
  );

  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    display: {
      kind: "strk20-swap",
      title: `Swap ${fromTokenSymbol} for ${toTokenSymbol}`,
      description: "Swap this multisig's private balance through Ekubo.",
      token: { symbol: fromTokenSymbol, address: fromToken },
      amount: amount.toString(),
      outputToken: { symbol: toTokenSymbol, address: toToken },
      ...(minimumReceived > 0n
        ? { minimumReceived: minimumReceived.toString() }
        : {}),
    },
    buildInvocation: (transfers) =>
      transfers
        .build({
          autoDiscover: { notes: "refresh", channels: "refresh" },
          autoSelectNotes: "naive",
          autoSetup: true,
          provingBlockId,
        })
        .surplusTo(multisig.address)
        .with(fromToken, (operations) =>
          operations.withdraw({
            recipient: executorAddress,
            amount,
          }),
        )
        .surplusTo(multisig.address, false)
        .with(toToken, (operations) =>
          operations.transfer({ recipient: multisig.address, amount: Open }),
        )
        .invoke(({ openNotes }) => {
          const outputNote = openNotes[0];
          if (!outputNote) {
            throw new Error("Ekubo swap did not create an output note.");
          }

          return {
            contractAddress: executorAddress,
            calldata: [
              routerAddress,
              fromToken,
              amount,
              0n,
              ethStrkPool.token0,
              ethStrkPool.token1,
              ethStrkPool.fee,
              ethStrkPool.tickSpacing,
              ethStrkPool.extension,
              minimumReceived & ((1n << 128n) - 1n),
              minimumReceived >> 128n,
              ethStrkPool.skipAhead,
              outputNote.noteId,
            ],
          };
        })
        .createProofInvocation(),
  });
}

export function useCreateMultisigSwapProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createMultisigSwapProposal,
    onSuccess: async (proposal) => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
      await queryClient.invalidateQueries({
        queryKey: ["multisigProposal", proposal.hash],
      });
    },
  });

  return {
    createMultisigSwapProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
