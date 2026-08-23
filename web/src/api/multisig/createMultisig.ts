"use client";

import {
  useSendTransaction,
  useUniversalDeployerContract,
} from "@starknet-start/react";
import { CallData, hash, stark } from "starknet";
import { networkConfig } from "@/config/network";
import type { Owner } from "@/lib/multisig";

export type CreateMultisigParams = {
  owners: Owner[];
  threshold: number;
  salt?: bigint;
};

// The UDC deploys from address zero, so this is the address that lands on-chain.
export function buildMultisigDeployment(
  owners: Owner[],
  threshold: number,
  salt: bigint,
) {
  const classHash = networkConfig.multisigClassHash;
  // `Span<Owner>` serializes as length followed by each struct's fields in declaration order.
  const constructorCalldata = CallData.compile({
    owners: owners.map(({ address, publicKey }) => ({
      address,
      public_key: publicKey,
    })),
    threshold,
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
  const { udc } = useUniversalDeployerContract({
    address: networkConfig.udcAddress as `0x${string}`,
  });
  const { sendAsync, ...rest } = useSendTransaction({});

  async function deployMultisigAsync(params: CreateMultisigParams) {
    if (!udc) throw new Error("Universal Deployer unavailable.");

    const salt = params.salt ?? BigInt(stark.randomAddress());
    const deployment = buildMultisigDeployment(
      params.owners,
      params.threshold,
      salt,
    );

    // The third argument is `not_from_zero` on-chain, so `false` is what keeps the
    // deployer at zero and the address equal to the one computed above. The ABI
    // starknet-react bundles names it `from_zero`, which reads inverted.
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
