"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useQuery } from "@tanstack/react-query";
import type { ProviderInterface } from "starknet";
import { supasafeFactoryContract } from "@/api/contracts";
import { networkConfig } from "@/config/network";

export async function getMultisigViewingPublicKey(
  provider: ProviderInterface,
  multisig: string,
) {
  const metadata =
    await supasafeFactoryContract(provider).get_multisig_metadata(multisig);
  return BigInt(metadata.viewing_public_key);
}

export function useGetMultisigViewingPublicKey(multisig: string | undefined) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: [
      "multisigViewingPublicKey",
      networkConfig.supasafeFactoryAddress,
      multisig,
    ],
    queryFn: () => getMultisigViewingPublicKey(provider, multisig as string),
    enabled: Boolean(multisig),
  });
}
