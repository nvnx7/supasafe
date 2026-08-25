"use client";

import { useProvider } from "@starknet-start/react";
import { useMutation } from "@tanstack/react-query";
import {
  getProvingBlockId,
  type PrivateTransfersParams,
  submitCallAndProof,
} from "./execute";

export type DepositParams = PrivateTransfersParams & {
  token: string;
  amount: bigint;
};

export function useDeposit() {
  const { provider } = useProvider();

  return useMutation({
    mutationKey: ["strk20Deposit"],
    mutationFn: async (params: DepositParams) => {
      const provingBlockId = await getProvingBlockId(
        provider,
        params.provingBlockId,
      );
      const { callAndProof } = await params.transfers
        .build()
        .with(params.token)
        .deposit({ amount: params.amount })
        .execute({ provingBlockId });

      return submitCallAndProof(provider, params.account, callAndProof);
    },
  });
}
