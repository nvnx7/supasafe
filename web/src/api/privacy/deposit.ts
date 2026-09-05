"use client";

import { useStrk20InvokeTransaction } from "@starknetfoundation/starknet-start-react";
import { num } from "starknet";

export type DepositParams = {
  token: string;
  amount: bigint;
};

export type PrivateTransferToMultisigParams = DepositParams & {
  multisigAddress: string;
};

export function useTransferPrivateBalanceToMultisig() {
  const { invokeAsync, ...result } = useStrk20InvokeTransaction();

  return {
    transferPrivateBalanceToMultisigAsync: ({
      token,
      amount,
      multisigAddress,
    }: PrivateTransferToMultisigParams) =>
      invokeAsync([
        {
          type: "transfer",
          token,
          amount: num.toHex(amount),
          recipient: multisigAddress,
        },
      ]),
    ...result,
  };
}
