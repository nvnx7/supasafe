"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useQuery } from "@tanstack/react-query";
import type { ProviderInterface } from "starknet";
import { endurConfig } from "@/config/dapp";
import { networkConfig } from "@/config/network";
import { getEndurConfig } from "./config";

export async function previewEndurDeposit(
  provider: ProviderInterface,
  assets: bigint,
): Promise<bigint> {
  if (assets <= 0n) {
    throw new Error("Endur staking needs an amount greater than zero.");
  }

  const { xStrkTokenAddress } = getEndurConfig();
  const result = await provider.callContract({
    contractAddress: xStrkTokenAddress,
    entrypoint: "preview_deposit",
    calldata: [assets, 0n],
  });
  const [shares] = result;
  if (shares === undefined || BigInt(shares) <= 0n) {
    throw new Error("Endur returned an invalid xSTRK preview.");
  }

  return BigInt(shares);
}

export function useEndurDepositPreview(assets: bigint | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: [
      "endurDepositPreview",
      networkConfig.chainId,
      assets?.toString(),
    ],
    queryFn: () => previewEndurDeposit(provider, assets as bigint),
    enabled: Boolean(
      endurConfig.anonymizerAddress &&
        endurConfig.xStrkTokenAddress &&
        assets &&
        assets > 0n,
    ),
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
