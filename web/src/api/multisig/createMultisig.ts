"use client";

import { useDeployAccount } from "@starknet-start/react";
import { CallData, hash, stark } from "starknet";
import { networkConfig } from "@/config/network";

export type CreateMultisigParams = {
  owners: string[];
  threshold: number;
  salt?: bigint;
};

// DEPLOY_ACCOUNT has no deployer, so the address is known before the account exists.
export function buildMultisigDeployment(
  owners: string[],
  threshold: number,
  salt: bigint,
) {
  const classHash = networkConfig.multisigClassHash;
  const constructorCalldata = CallData.compile({ owners, threshold });

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
  const { deployAccountAsync, ...rest } = useDeployAccount({});

  async function deployMultisigAsync(params: CreateMultisigParams) {
    const salt = params.salt ?? BigInt(stark.randomAddress());
    const deployment = buildMultisigDeployment(
      params.owners,
      params.threshold,
      salt,
    );
    const { transaction_hash } = await deployAccountAsync(deployment);

    return { ...deployment, transactionHash: transaction_hash };
  }

  return { deployMultisigAsync, ...rest };
}
