"use client";

import { useStrk20InvokeTransaction } from "@starknetfoundation/starknet-start-react";
import { num } from "starknet";

export type WithdrawParams = {
  token: string;
  amount: bigint;
  recipient: string;
};

export function useWithdraw() {
  const { invokeAsync, ...result } = useStrk20InvokeTransaction();

  return {
    withdrawAsync: (params: WithdrawParams) =>
      invokeAsync([
        {
          type: "withdraw",
          token: params.token,
          amount: num.toHex(params.amount),
          recipient: params.recipient,
        },
      ]),
    ...result,
  };
}
