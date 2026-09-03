"use client";

import { type PrivateSwapFee, type Quote, quoteToCalls } from "@avnu/avnu-sdk";
import { Open } from "@starkware-libs/starknet-privacy-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Signature } from "starknet";
import { transaction } from "starknet";
import { proposalQueryKeys } from "@/api/proposal/query-keys";
import { networkConfig } from "@/config/network";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "../create-multisig-strk20-proposal";
import { getAvnuOptions } from "./config";
import {
  type AvnuPrivateSwapFeeMode,
  buildAvnuPrivateSwapFee,
} from "./paymaster";

export type CreateMultisigAvnuPrivateSwapProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  provingBlockId: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  quote: Quote;
  sellTokenSymbol: string;
  buyTokenSymbol: string;
  slippage: number;
  feeMode: AvnuPrivateSwapFeeMode;
};

export async function createMultisigAvnuPrivateSwapProposal({
  multisig,
  owner,
  viewingKey,
  provingBlockId,
  signApproval,
  quote,
  sellTokenSymbol,
  buyTokenSymbol,
  slippage,
  feeMode,
}: CreateMultisigAvnuPrivateSwapProposalParams) {
  if (quote.sellAmount <= 0n || quote.buyAmount <= 0n) {
    throw new Error("AVNU returned an invalid swap quote.");
  }
  if (slippage < 0 || slippage > 1) {
    throw new Error("AVNU slippage must be between 0 and 1.");
  }
  if (quote.chainId !== networkConfig.chainId) {
    throw new Error("The AVNU quote was created for another network.");
  }

  const [fee, calls] = await Promise.all([
    buildAvnuPrivateSwapFee(feeMode),
    quoteToCalls(
      { quoteId: quote.quoteId, slippage, private: true },
      getAvnuOptions(),
    ),
  ]);
  if (!calls.executorAddress) {
    throw new Error("AVNU did not return a private swap executor.");
  }

  return createProposal({
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    quote,
    sellTokenSymbol,
    buyTokenSymbol,
    slippage,
    feeMode,
    fee,
    executorAddress: calls.executorAddress,
    executorCalls: calls.calls,
  });
}

async function createProposal({
  multisig,
  owner,
  viewingKey,
  provingBlockId,
  signApproval,
  quote,
  sellTokenSymbol,
  buyTokenSymbol,
  slippage,
  feeMode,
  fee,
  executorAddress,
  executorCalls,
}: CreateMultisigAvnuPrivateSwapProposalParams & {
  fee: PrivateSwapFee;
  executorAddress: string;
  executorCalls: Awaited<ReturnType<typeof quoteToCalls>>["calls"];
}) {
  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    display: {
      kind: "avnu-private-swap",
      title: `Swap ${sellTokenSymbol} for ${buyTokenSymbol}`,
      description: "Swap this multisig's private balance through AVNU.",
      token: { symbol: sellTokenSymbol, address: quote.sellTokenAddress },
      amount: quote.sellAmount.toString(),
      outputToken: { symbol: buyTokenSymbol, address: quote.buyTokenAddress },
      minimumReceived: quote.buyAmount.toString(),
      avnu: {
        quoteId: quote.quoteId,
        poolFeeToken: feeMode.poolFeeToken,
        tip: feeMode.tip,
        slippage,
      },
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
        .with(quote.sellTokenAddress, (operations) =>
          operations.withdraw({
            recipient: executorAddress,
            amount: quote.sellAmount,
          }),
        )
        .with(fee.token, (operations) =>
          operations.withdraw({ recipient: fee.recipient, amount: fee.amount }),
        )
        .surplusTo(multisig.address, false)
        .with(quote.buyTokenAddress, (operations) =>
          operations.transfer({ recipient: multisig.address, amount: Open }),
        )
        .invoke(({ openNotes }) => {
          const outputNote = openNotes[0];
          if (!outputNote) {
            throw new Error("AVNU private swap did not create an output note.");
          }

          return {
            contractAddress: executorAddress,
            calldata: [
              quote.buyTokenAddress,
              ...transaction.fromCallsToExecuteCalldata_cairo1(executorCalls),
              outputNote.noteId,
            ],
          };
        })
        .createProofInvocation(),
  });
}

export function useCreateMultisigAvnuPrivateSwapProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createMultisigAvnuPrivateSwapProposal,
    onSuccess: async (proposal) => {
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists,
      });
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(proposal.hash),
      });
    },
  });

  return {
    createMultisigAvnuPrivateSwapProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
