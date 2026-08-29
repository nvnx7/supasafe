import { num, type ProviderInterface, shortString } from "starknet";
import { networkConfig } from "@/config/network";
import type { MultisigProposalCall } from "@/lib/multisig-proposal-provider";
import { computeCallSetHash } from "@/lib/signing";

const VALIDATED = BigInt(shortString.encodeShortString("VALIDATED"));

/// Checks the packed approval against the multisig's own signature entrypoint. The browser cannot
/// reliably ABI-serialize the SDK's nested `Span<Call>` for a faithful custom-validator simulation;
/// `is_valid_signature` checks the same owner-approval hash once we derive the CallSet locally.
export async function isMultisigSignatureValid(
  provider: ProviderInterface,
  multisigAddress: string,
  calls: MultisigProposalCall[],
  signature: string[],
  additionalData: string[] = [],
) {
  const callSetHash = computeCallSetHash(
    multisigAddress,
    calls,
    networkConfig.chainId,
    additionalData,
  );

  const result = await provider.callContract({
    contractAddress: multisigAddress,
    entrypoint: "is_valid_signature",
    calldata: [
      num.toHex(callSetHash),
      num.toHex(signature.length),
      ...signature.map(num.toHex),
    ],
  });
  return BigInt(result[0] ?? 0) === VALIDATED;
}
