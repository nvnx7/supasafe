"use client";

import { useAccount } from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { useMemo } from "react";
import {
  useGetEncryptedViewingKey,
  useGetMultisigViewingPublicKey,
} from "@/api/multisig";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";
import { decryptViewKey } from "@/utils/encryption";

export function useMultisigViewingKey(multisigAddress: string | undefined) {
  const { address } = useAccount();
  const { privateKey: supasafeViewKey } = useSupasafeViewKey();
  const encryptedKey = useGetEncryptedViewingKey(multisigAddress, address);
  const viewingPublicKey = useGetMultisigViewingPublicKey(multisigAddress);

  return useMemo(() => {
    if (
      !supasafeViewKey ||
      !encryptedKey.data ||
      viewingPublicKey.data === undefined
    ) {
      return undefined;
    }

    try {
      const key = decryptViewKey({
        ephemeralPubkey: encryptedKey.data.ephemeralPubkey,
        ciphertext: encryptedKey.data.ciphertext,
        recipientPrivateKey: supasafeViewKey,
      });
      return derivePublicKey(key) === viewingPublicKey.data ? key : undefined;
    } catch {
      return undefined;
    }
  }, [encryptedKey.data, supasafeViewKey, viewingPublicKey.data]);
}
