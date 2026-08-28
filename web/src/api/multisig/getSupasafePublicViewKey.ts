"use client";

import {
  useProvider,
  useSendTransaction,
} from "@starknetfoundation/starknet-start-react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { num, type ProviderInterface } from "starknet";
import { supasafeFactoryContract } from "@/api/contracts";
import { networkConfig } from "@/config/network";

export async function getSupasafePublicViewKey(
  provider: ProviderInterface,
  owner: string,
): Promise<bigint | null> {
  const registration =
    await supasafeFactoryContract(provider).get_view_key(owner);
  return BigInt(registration.public_key) === 0n
    ? null
    : num.toBigInt(registration.public_key);
}

export function useGetSupasafePublicViewKey(owner: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: [
      "supasafePublicViewKey",
      networkConfig.supasafeFactoryAddress,
      owner,
    ],
    queryFn: () => getSupasafePublicViewKey(provider, owner as string),
    enabled: Boolean(owner),
    retry: false,
  });
}

export function useGetSupasafePublicViewKeys(owners: string[]) {
  const { provider } = useProvider();

  return useQueries({
    queries: owners.map((owner) => ({
      queryKey: [
        "supasafePublicViewKey",
        networkConfig.supasafeFactoryAddress,
        owner,
      ],
      queryFn: () => getSupasafePublicViewKey(provider, owner),
      enabled: Boolean(owner),
      retry: false,
    })),
  });
}

export function useRegisterSupasafeViewKey() {
  const { provider } = useProvider();
  const queryClient = useQueryClient();
  const { sendAsync, ...result } = useSendTransaction({});

  return {
    registerSupasafeViewKeyAsync: async (publicKey: bigint) => {
      const transaction = await sendAsync([
        supasafeFactoryContract(provider).populate("register_view_key", [
          publicKey,
        ]),
      ]);
      await provider.waitForTransaction(transaction.transaction_hash);
      await queryClient.invalidateQueries({
        queryKey: [
          "supasafePublicViewKey",
          networkConfig.supasafeFactoryAddress,
        ],
      });
      return transaction;
    },
    ...result,
  };
}
