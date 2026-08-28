"use client";

import { useStrk20InvokeTransaction } from "@starknetfoundation/starknet-start-react";
import { num } from "starknet";

export type TransferParams = {
  token: string;
  amount: bigint;
  recipient: string;
};

export function useTransfer() {
  const { invokeAsync, ...result } = useStrk20InvokeTransaction();

  return {
    transferAsync: (params: TransferParams) =>
      invokeAsync([
        {
          type: "transfer",
          token: params.token,
          amount: num.toHex(params.amount),
          recipient: params.recipient,
        },
      ]),
    ...result,
  };
}
