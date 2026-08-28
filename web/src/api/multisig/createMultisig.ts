"use client";

import {
  useSendTransaction,
  useUniversalDeployerContract,
} from "@starknetfoundation/starknet-start-react";
import { CallData, hash, stark } from "starknet";
import { isDevnet } from "@/config/env";
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

// The UDC deploys from address zero, so this is the address that lands on-chain.
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
    classHash,
    constructorCalldata,
    addressSalt: salt,
    contractAddress: hash.calculateContractAddressFromHash(
      salt,
      classHash,
      constructorCalldata,
      0,
    ),
  };
}

export function useCreateMultisig() {
  const params = isDevnet
    ? { address: networkConfig.udcAddress as `0x${string}` }
    : {};
  const { udc } = useUniversalDeployerContract(params);
  const { sendAsync, ...rest } = useSendTransaction({});

  async function deployMultisigAsync(params: CreateMultisigParams) {
    if (!udc) throw new Error("Universal Deployer unavailable.");

    const salt = params.salt ?? BigInt(stark.randomAddress());
    const deployment = buildMultisigDeployment({ ...params, salt });

    const call = udc.populate("deploy_contract", [
      deployment.classHash,
      deployment.addressSalt,
      false,
      deployment.constructorCalldata,
    ]);
    const { transaction_hash } = await sendAsync([call]);

    return { ...deployment, transactionHash: transaction_hash };
  }

  return { deployMultisigAsync, ...rest };
}
