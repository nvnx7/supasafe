"use client";

import { useProvider } from "@starknet-start/react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { num, type ProviderInterface } from "starknet";
import { poolContract } from "@/api/contracts";
import { networkConfig } from "@/config/network";

export async function getPublicViewKey(
  provider: ProviderInterface,
  address: string,
) {
  const key = await poolContract(provider).get_public_key(address);
  return BigInt(key) === 0n ? null : num.toBigInt(key);
}

export function useGetPublicViewKey(address: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: ["publicViewKey", networkConfig.privacyPoolAddress, address],
    queryFn: () => getPublicViewKey(provider, address as string),
    retry: false,
    enabled: !!address,
  });
}

export function useGetPublicViewKeys(addresses: string[]) {
  const { provider } = useProvider();

  return useQueries({
    queries: addresses.map((address) => {
      return {
        queryKey: ["publicViewKey", networkConfig.privacyPoolAddress, address],
        queryFn: () => getPublicViewKey(provider, address as string),
        retry: false,
        enabled: !!address,
      };
    }),
  });
}
