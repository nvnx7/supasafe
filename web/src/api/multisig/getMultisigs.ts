"use client";

import { useProvider } from "@starknet-start/react";
import { useQuery } from "@tanstack/react-query";
import { hash, num, type ProviderInterface } from "starknet";
import { networkConfig } from "@/config/network";
import type { MultisigSummary } from "@/lib/multisig";

const OWNER_UPDATED_KEY = hash.getSelectorFromName("OwnerUpdated");
const CHUNK_SIZE = 100;

async function readOwnerAddresses(
  provider: ProviderInterface,
  contractAddress: string,
): Promise<string[] | null> {
  try {
    const result = await provider.callContract({
      contractAddress,
      entrypoint: "get_owners",
      calldata: [],
    });
    // Span<Owner> flattens to [len, address, public_key, ...]; membership is by address.
    const count = Number(result[0]);
    const addresses: string[] = [];
    for (let i = 0; i < count; i += 1) {
      addresses.push(result[1 + i * 2] as string);
    }
    return addresses;
  } catch {
    return null;
  }
}

export async function getMultisigs(
  provider: ProviderInterface,
  owner: string,
): Promise<MultisigSummary[]> {
  const target = BigInt(owner);
  const classHash = BigInt(networkConfig.multisigClassHash);

  // OwnerUpdated is emitted once per owner with the owner as its second key, so the
  // node returns only this owner's multisigs rather than every event on the chain.
  const thresholds = new Map<string, number>();
  let continuationToken: string | undefined;
  do {
    const page = await provider.getEvents({
      from_block: { block_number: 0 },
      to_block: "latest",
      keys: [[OWNER_UPDATED_KEY], [num.toHex(target)]],
      chunk_size: CHUNK_SIZE,
      continuation_token: continuationToken,
    });

    // Oldest first, so a later configuration overwrites an earlier one.
    // OwnerUpdated data is [public_key, owners_count, threshold]; the owner is a key, not data.
    for (const event of page.events) {
      const threshold = Number(event.data[2]);
      if (Number.isInteger(threshold)) {
        thresholds.set(num.toHex(event.from_address), threshold);
      }
    }

    continuationToken = page.continuation_token;
  } while (continuationToken);

  // Events persist after an owner is removed, and any contract can emit a matching key,
  // so membership and authenticity are both confirmed against the chain.
  const checked = await Promise.all(
    [...thresholds].map(async ([address, threshold]) => {
      const [actualClassHash, owners] = await Promise.all([
        provider.getClassHashAt(address).catch(() => null),
        readOwnerAddresses(provider, address),
      ]);
      if (!actualClassHash || BigInt(actualClassHash) !== classHash)
        return null;
      if (!owners?.some((owner) => BigInt(owner) === target)) return null;
      return { address, threshold, ownerCount: owners.length };
    }),
  );

  return checked.filter((multisig) => multisig !== null);
}

export function useGetMultisigs(owner: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: ["multisigs", networkConfig.rpcUrl, owner],
    queryFn: () => getMultisigs(provider, owner as string),
    enabled: Boolean(owner),
  });
}
