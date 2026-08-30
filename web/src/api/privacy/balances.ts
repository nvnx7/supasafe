"use client";

import { IndexerDiscoveryProvider } from "@starkware-libs/starknet-privacy-sdk";
import { useQuery } from "@tanstack/react-query";
import { TOKENS } from "@/config/constants";
import { indexerUrl } from "@/config/env";
import { networkConfig } from "@/config/network";
import { createMultisigPrivateTransfers } from "./multisig-private-transfers";

const DISCOVERY_TIMEOUT_MS = 20_000;

export type Strk20Balance = {
  token: string;
  amount: bigint;
  noteCount: number;
};

type GetMultisigStrk20BalancesParams = {
  multisigAddress: string;
  viewingKey: bigint;
  tokens?: string[];
};

export async function getMultisigStrk20Balances({
  multisigAddress,
  viewingKey,
  tokens = TOKENS.map((token) => token.address),
}: GetMultisigStrk20BalancesParams): Promise<Strk20Balance[]> {
  const indexer = new IndexerDiscoveryProvider(
    indexerUrl,
    networkConfig.privacyPoolAddress,
  );
  try {
    const health = await indexer.getHealth();
    if (health.status !== "OK") {
      throw new Error("The private balance indexer is not ready.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("not ready")) {
      throw error;
    }
    throw new Error(
      "Private balance indexer is unavailable. Check NEXT_PUBLIC_INDEXER_URL.",
      { cause: error },
    );
  }

  const transfers = createMultisigPrivateTransfers({
    multisigAddress,
    viewingKey,
  });
  const { notes } = await withTimeout(
    transfers.discoverNotes({
      tokens: tokens.map((token) => BigInt(token)),
    }),
    DISCOVERY_TIMEOUT_MS,
    "Private balance discovery timed out. The indexer did not respond.",
  );

  return tokens.map((token) => {
    const tokenNotes = notes.get(token) ?? [];
    return {
      token,
      amount: tokenNotes.reduce((total, note) => total + note.amount, 0n),
      noteCount: tokenNotes.length,
    };
  });
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

export function useGetMultisigStrk20Balances({
  multisigAddress,
  viewingKey,
  tokens = TOKENS.map((token) => token.address),
}: {
  multisigAddress: string | undefined;
  viewingKey: bigint | undefined;
  tokens?: string[];
}) {
  return useQuery({
    queryKey: [
      "multisigStrk20Balances",
      networkConfig.privacyPoolAddress,
      multisigAddress,
      tokens,
    ],
    queryFn: () =>
      getMultisigStrk20Balances({
        multisigAddress: multisigAddress as string,
        viewingKey: viewingKey as bigint,
        tokens,
      }),
    enabled: Boolean(multisigAddress && viewingKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
