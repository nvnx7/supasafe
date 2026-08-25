"use client";

import { useProvider } from "@starknet-start/react";
import { useMutation } from "@tanstack/react-query";
import {
  getProvingBlockId,
  type PrivateTransfersParams,
  submitCallAndProof,
} from "./execute";

export type WithdrawParams = PrivateTransfersParams & {
  token: string;
  amount: bigint;
  recipient: string;
};

export function useWithdraw() {
  const { provider } = useProvider();

  return useMutation({
    mutationKey: ["strk20Withdraw"],
    mutationFn: async (params: WithdrawParams) => {
      const provingBlockId = await getProvingBlockId(
        provider,
        params.provingBlockId,
      );
      const { callAndProof } = await params.transfers
        .build({ autoDiscover: { notes: "missing" } })
        .with(params.token)
        .withdraw({ recipient: params.recipient, amount: params.amount })
        .execute({ provingBlockId });

      return submitCallAndProof(provider, params.account, callAndProof);
    },
  });
}
