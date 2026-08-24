"use client";

import { useProvider } from "@starknet-start/react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { num, type ProviderInterface } from "starknet";
import { poolContract } from "@/api/contracts";
import { networkConfig } from "@/config/network";
import { isValidAddress } from "@/lib/multisig";

/// The user's registered viewing public key, or null if they have not registered with the pool.
export async function getPublicViewKey(
  provider: ProviderInterface,
  address: string,
) {
  const key = await poolContract(provider).get_public_key(address);
  // The pool returns zero for an address that never called SetViewingKey.
  return BigInt(key) === 0n ? null : num.toHex(key);
}

function viewKeyQuery(provider: ProviderInterface, address: string) {
  return {
    queryKey: [
      "publicViewKey",
      networkConfig.rpcUrl,
      networkConfig.privacyPoolAddress,
      address,
    ],
    queryFn: () => getPublicViewKey(provider, address),
    enabled: isValidAddress(address),
    retry: false,
  };
}

export function useGetPublicViewKey(address: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    ...viewKeyQuery(provider, address as string),
    enabled: Boolean(address) && isValidAddress(address as string),
  });
}

/// Resolves a set of addresses at once, preserving order so results line up with their inputs.
export function useGetPublicViewKeys(addresses: string[]) {
  const { provider } = useProvider();

  return useQueries({
    queries: addresses.map((address) => viewKeyQuery(provider, address)),
  });
}
