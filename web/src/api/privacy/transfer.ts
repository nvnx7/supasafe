"use client";

import { useProvider } from "@starknet-start/react";
import { useMutation } from "@tanstack/react-query";
import {
  getProvingBlockId,
  type PrivateTransfersParams,
  submitCallAndProof,
} from "./execute";

export type TransferParams = PrivateTransfersParams & {
  token: string;
  amount: bigint;
  recipient: string;
};

export function useTransfer() {
  const { provider } = useProvider();

  return useMutation({
    mutationKey: ["strk20Transfer"],
    mutationFn: async (params: TransferParams) => {
      const provingBlockId = await getProvingBlockId(
        provider,
        params.provingBlockId,
      );
      const { callAndProof } = await params.transfers
        .build({ autoDiscover: { channels: "missing", notes: "missing" } })
        .with(params.token)
        .transfer({ recipient: params.recipient, amount: params.amount })
        .execute({ provingBlockId });

      return submitCallAndProof(provider, params.account, callAndProof);
    },
  });
}
