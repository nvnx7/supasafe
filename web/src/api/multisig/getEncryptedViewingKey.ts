"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { useQuery } from "@tanstack/react-query";
import type { ProviderInterface } from "starknet";
import { supasafeFactoryContract } from "@/api/contracts";
import { networkConfig } from "@/config/network";
import type { EncryptedViewingKey } from "@/lib/multisig";

export async function getEncryptedViewingKey(
  provider: ProviderInterface,
  multisig: string,
  owner: string,
): Promise<EncryptedViewingKey | null> {
  const key = await supasafeFactoryContract(provider).get_encrypted_view_key(
    multisig,
    owner,
  );
  if (BigInt(key.ephemeral_pubkey) === 0n) return null;

  return {
    owner,
    ephemeralPubkey: BigInt(key.ephemeral_pubkey),
    ciphertext: BigInt(key.ciphertext),
  };
}

export function useGetEncryptedViewingKey(
  multisig: string | undefined,
  owner: string | undefined,
) {
  const { provider } = useProvider();

  return useQuery({
    queryKey: [
      "encryptedViewingKey",
      networkConfig.supasafeFactoryAddress,
      multisig,
      owner,
    ],
    queryFn: () =>
      getEncryptedViewingKey(provider, multisig as string, owner as string),
    enabled: Boolean(multisig && owner),
  });
}
