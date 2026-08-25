"use client";

import { useProvider } from "@starknet-start/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { networkConfig } from "@/config/network";
import {
  getProvingBlockId,
  type PrivateTransfersParams,
  submitCallAndProof,
} from "./execute";

export function useRegister() {
  const { provider } = useProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["strk20Register"],
    mutationFn: async (params: PrivateTransfersParams) => {
      const provingBlockId = await getProvingBlockId(
        provider,
        params.provingBlockId,
      );
      const { callAndProof } = await params.transfers
        .build()
        .register()
        .execute({ provingBlockId });

      return submitCallAndProof(provider, params.account, callAndProof);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publicViewKey", networkConfig.privacyPoolAddress],
      });
    },
  });
}
