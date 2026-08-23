"use client";

import { useProvider } from "@starknet-start/react";
import { useQuery } from "@tanstack/react-query";
import { num, type ProviderInterface } from "starknet";
import { networkConfig } from "@/config/network";
import type { MultisigDetail } from "@/lib/multisig";

export async function getMultisig(
  provider: ProviderInterface,
  address: string,
): Promise<MultisigDetail> {
  const [ownersResult, thresholdResult] = await Promise.all([
    provider.callContract({
      contractAddress: address,
      entrypoint: "get_owners",
      calldata: [],
    }),
    provider.callContract({
      contractAddress: address,
      entrypoint: "get_threshold",
      calldata: [],
    }),
  ]);

  // Span<Owner> flattens to [len, address, public_key, ...].
  const count = Number(ownersResult[0]);
  const owners = Array.from({ length: count }, (_, i) => ({
    address: num.toHex(ownersResult[1 + i * 2] as string),
    publicKey: num.toHex(ownersResult[2 + i * 2] as string),
  }));

  return { address, owners, threshold: Number(thresholdResult[0]) };
}

export function useGetMultisig(address: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: ["multisig", networkConfig.rpcUrl, address],
    queryFn: () => getMultisig(provider, address as string),
    enabled: Boolean(address),
  });
}
