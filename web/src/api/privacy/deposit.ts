"use client";

import { useStrk20InvokeTransaction } from "@starknetfoundation/starknet-start-react";
import { num } from "starknet";

export type DepositParams = {
  token: string;
  amount: bigint;
};

export function useDeposit() {
  const { invokeAsync, ...result } = useStrk20InvokeTransaction();

  return {
    depositAsync: (params: DepositParams) =>
      invokeAsync([
        {
          type: "deposit",
          token: params.token,
          amount: num.toHex(params.amount),
        },
      ]),
    ...result,
  };
}
