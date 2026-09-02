"use client";

import {
  type UseSignTypedDataArgs,
  useAccount,
  useProvider,
  useSignTypedData,
} from "@starknetfoundation/starknet-start-react";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { useCallback, useMemo } from "react";
import type { Signature } from "starknet";

import {
  useGetEncryptedViewingKey,
  useGetMultisig,
  useGetMultisigViewingPublicKey,
} from "@/api/multisig";
import { networkConfig } from "@/config/network";
import { useSupasafeViewKey } from "@/hooks/use-supasafe-view-key";
import { buildApprovalTypedData } from "@/lib/signing";
import { decryptViewKey } from "@/utils/encryption";

export function useMultisigProposalContext(multisigAddress: string) {
  const { address: owner } = useAccount();
  const { provider } = useProvider();
  const { signTypedDataAsync } = useSignTypedData({});
  const { privateKey: supasafeViewKey, isReady: isSupasafeViewKeyReady } =
    useSupasafeViewKey();
  const { data: multisig } = useGetMultisig(multisigAddress);
  const encryptedViewingKey = useGetEncryptedViewingKey(multisigAddress, owner);
  const viewingPublicKey = useGetMultisigViewingPublicKey(multisigAddress);

  const viewingKey = useMemo(() => {
    if (
      !encryptedViewingKey.data ||
      !supasafeViewKey ||
      viewingPublicKey.data === undefined
    ) {
      return undefined;
    }

    try {
      const key = decryptViewKey({
        ephemeralPubkey: encryptedViewingKey.data.ephemeralPubkey,
        ciphertext: encryptedViewingKey.data.ciphertext,
        recipientPrivateKey: supasafeViewKey,
      });
      return derivePublicKey(key) === viewingPublicKey.data ? key : undefined;
    } catch {
      return undefined;
    }
  }, [encryptedViewingKey.data, supasafeViewKey, viewingPublicKey.data]);

  const createProposalParams = useCallback(async () => {
    if (!multisig || !owner || !viewingKey) {
      throw new Error("Multisig proposal context is not ready.");
    }

    const provingBlockId = Math.max(0, (await provider.getBlockNumber()) - 10);

    return {
      multisig,
      owner,
      viewingKey,
      provingBlockId,
      signApproval: async (callSetHash: bigint) =>
        (await signTypedDataAsync(
          buildApprovalTypedData(
            multisig.address,
            callSetHash,
            networkConfig.chainId,
          ) as unknown as UseSignTypedDataArgs,
        )) as Signature,
    };
  }, [multisig, owner, provider, signTypedDataAsync, viewingKey]);

  return {
    multisig,
    owner,
    viewingKey,
    viewingPublicKey,
    isSupasafeViewKeyReady,
    createProposalParams,
  };
}
