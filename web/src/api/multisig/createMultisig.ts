"use client";

import {
  useProvider,
  useSendTransaction,
} from "@starknetfoundation/starknet-start-react";
import { CallData, hash, stark } from "starknet";
import { supasafeFactoryContract } from "@/api/contracts";
import { networkConfig } from "@/config/network";
import type { Owner } from "@/lib/multisig";

type EncryptedViewingKey = {
  owner: string;
  /// x-coordinate of the ephemeral ECDH public key, `(rG).x`.
  ephemeralPubkey: bigint;
  ciphertext: bigint;
};

export type CreateMultisigParams = {
  owners: Owner[];
  threshold: number;
  salt?: bigint;
  viewingKey: {
    publicKey: bigint;
    encrypted: EncryptedViewingKey[];
  };
};

export function buildMultisigDeployment({
  owners,
  threshold,
  salt,
  viewingKey,
}: CreateMultisigParams & { salt: bigint }) {
  if (viewingKey.encrypted.length !== owners.length) {
    throw new Error("Every owner needs exactly one encrypted viewing key.");
  }
  owners.forEach((owner, index) => {
    const entry = viewingKey.encrypted[index];
    if (!entry || BigInt(entry.owner) !== BigInt(owner.address)) {
      throw new Error("Encrypted viewing keys must be in owner order.");
    }
  });

  const classHash = networkConfig.multisigClassHash;
  const constructorCalldata = CallData.compile({
    owners: owners.map(({ address, publicKey }) => ({
      address,
      public_key: publicKey,
    })),
    threshold,
    viewing_public_key: viewingKey.publicKey,
    encrypted: viewingKey.encrypted.map(
      ({ owner, ephemeralPubkey, ciphertext }) => ({
        owner,
        ephemeral_pubkey: ephemeralPubkey,
        ciphertext,
      }),
    ),
  });

  return {
    constructorCalldata,
    salt,
    contractAddress: hash.calculateContractAddressFromHash(
      salt,
      classHash,
      constructorCalldata,
      networkConfig.supasafeFactoryAddress,
    ),
  };
}

export function useCreateMultisig() {
  const { provider } = useProvider();
  const { sendAsync, ...rest } = useSendTransaction({});

  async function deployMultisigAsync(params: CreateMultisigParams) {
    const salt = params.salt ?? BigInt(stark.randomAddress());
    const deployment = buildMultisigDeployment({ ...params, salt });

    const call = supasafeFactoryContract(provider).populate("create_multisig", {
      owners: params.owners.map(({ address, publicKey }) => ({
        address,
        public_key: publicKey,
      })),
      threshold: params.threshold,
      viewing_public_key: params.viewingKey.publicKey,
      encrypted: params.viewingKey.encrypted.map(
        ({ owner, ephemeralPubkey, ciphertext }) => ({
          owner,
          ephemeral_pubkey: ephemeralPubkey,
          ciphertext,
        }),
      ),
      salt,
    });
    const { transaction_hash } = await sendAsync([call]);

    return { ...deployment, transactionHash: transaction_hash };
  }

  return { deployMultisigAsync, ...rest };
}
