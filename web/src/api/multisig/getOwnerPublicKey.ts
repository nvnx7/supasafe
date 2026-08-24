"use client";

import { useProvider } from "@starknet-start/react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { num, type ProviderInterface } from "starknet";
import { networkConfig } from "@/config/network";
import { isValidAddress } from "@/lib/multisig";

/// Account implementations expose their signing key under different names: `get_public_key` is
/// OpenZeppelin and Braavos, `get_owner` is Argent. First one that answers wins.
const PUBLIC_KEY_ENTRYPOINTS = ["get_public_key", "getPublicKey", "get_owner"];

export async function getOwnerPublicKey(
  provider: ProviderInterface,
  address: string,
): Promise<string> {
  for (const entrypoint of PUBLIC_KEY_ENTRYPOINTS) {
    try {
      const result = await provider.callContract({
        contractAddress: address,
        entrypoint,
        calldata: [],
      });
      const key = result[0];
      if (key && BigInt(key) !== 0n) return num.toHex(key);
    } catch {
      // Wrong entrypoint for this account implementation; try the next.
    }
  }

  throw new Error(
    "Could not read a public key from this account. It must be deployed, and expose " +
      "get_public_key or get_owner.",
  );
}

export function useGetOwnerPublicKey(address: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: ["ownerPublicKey", networkConfig.rpcUrl, address],
    queryFn: () => getOwnerPublicKey(provider, address as string),
    enabled: Boolean(address),
    retry: false,
  });
}

/// Resolves a whole owner set at once, preserving order so results line up with the addresses
/// they came from — the creation form needs per-row status, not a single aggregate.
export function useGetOwnerPublicKeys(addresses: string[]) {
  const { provider } = useProvider();

  return useQueries({
    queries: addresses.map((address) => ({
      queryKey: ["ownerPublicKey", networkConfig.rpcUrl, address],
      queryFn: () => getOwnerPublicKey(provider, address),
      enabled: isValidAddress(address),
      retry: false,
    })),
  });
}
