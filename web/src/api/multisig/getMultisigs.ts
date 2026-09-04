"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useQuery } from "@tanstack/react-query";
import { hash, num, type ProviderInterface } from "starknet";
import { networkConfig } from "@/config/network";
import type { MultisigSummary } from "@/lib/multisig";

const MULTISIG_OWNER_UPDATED_KEY = hash.getSelectorFromName(
  "MultisigOwnerUpdated",
);
const CHUNK_SIZE = 100;

export async function getMultisigs(
  provider: ProviderInterface,
  owner: string,
): Promise<MultisigSummary[]> {
  const target = BigInt(owner);

  // The factory emits this only at creation, with the owner as its second key. Filtering by
  // its known address gives us an indexed creation-time list without scanning every multisig.
  const multisigs = new Map<string, MultisigSummary>();
  let continuationToken: string | undefined;
  do {
    const page = await provider.getEvents({
      from_block: {
        block_number: networkConfig.supasafeFactoryDeploymentBlock,
      },
      to_block: "latest",
      address: networkConfig.supasafeFactoryAddress,
      keys: [[MULTISIG_OWNER_UPDATED_KEY], [num.toHex(target)]],
      chunk_size: CHUNK_SIZE,
      continuation_token: continuationToken,
    });

    // MultisigOwnerUpdated data is [public_key, owners_count, threshold]. The address is its
    // third key after the event selector and owner key.
    for (const event of page.events) {
      const address = event.keys[2];
      if (!address) continue;
      const threshold = Number(event.data[2]);
      const ownerCount = Number(event.data[1]);
      if (Number.isInteger(threshold) && Number.isInteger(ownerCount)) {
        multisigs.set(num.toHex(address), {
          address: num.toHex(address),
          threshold,
          ownerCount,
        });
      }
    }

    continuationToken = page.continuation_token;
  } while (continuationToken);

  return [...multisigs.values()];
}

export function useGetMultisigs(owner: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: ["multisigs", networkConfig.supasafeFactoryAddress, owner],
    queryFn: () => getMultisigs(provider, owner as string),
    enabled: Boolean(owner),
  });
}
