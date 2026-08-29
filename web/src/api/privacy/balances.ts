"use client";

import { useQuery } from "@tanstack/react-query";
import { TOKENS } from "@/config/constants";
import { networkConfig } from "@/config/network";
import { createMultisigPrivateTransfers } from "./multisig-private-transfers";

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
  const transfers = createMultisigPrivateTransfers({
    multisigAddress,
    viewingKey,
  });
  const { notes } = await transfers.discoverNotes({
    tokens: tokens.map((token) => BigInt(token)),
  });

  return tokens.map((token) => {
    const tokenNotes = notes.get(token) ?? [];
    return {
      token,
      amount: tokenNotes.reduce((total, note) => total + note.amount, 0n),
      noteCount: tokenNotes.length,
    };
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
    retry: 1,
  });
}
