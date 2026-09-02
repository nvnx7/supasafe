"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useQuery } from "@tanstack/react-query";
import type { ProviderInterface } from "starknet";
import { networkConfig } from "@/config/network";

export async function previewVesuRedeem(
  provider: ProviderInterface,
  vTokenAddress: string,
  shares: bigint,
): Promise<bigint> {
  if (shares <= 0n) {
    throw new Error("Vesu redemption needs a positive share amount.");
  }

  const result = await provider.callContract({
    contractAddress: vTokenAddress,
    entrypoint: "preview_redeem",
    calldata: [shares, 0n],
  });
  const [assets] = result;
  if (assets === undefined) {
    throw new Error("Vesu returned an invalid redemption preview.");
  }

  const amount = BigInt(assets);
  if (amount <= 0n) {
    throw new Error("Vesu returned zero assets for this share amount.");
  }

  return amount;
}

export function useVesuPreviewRedeem({
  vTokenAddress,
  shares,
}: {
  vTokenAddress: string | undefined;
  shares: bigint | undefined;
}) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: [
      "vesuPreviewRedeem",
      networkConfig.chainId,
      vTokenAddress,
      shares?.toString(),
    ],
    queryFn: () =>
      previewVesuRedeem(provider, vTokenAddress as string, shares as bigint),
    enabled: Boolean(vTokenAddress && shares && shares > 0n),
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
