import {
  type BigNumberish,
  num,
  type Signature,
  stark,
  type TypedData,
  typedData,
} from "starknet";

/// Mirrors `MULTISIG_APPROVAL_TYPE_HASH` and the domain in `contracts/src/hashing.cairo`.
/// Any drift here silently produces signatures the contract rejects, and nothing on this side
/// catches it: `test_owner_approval_hash_is_stable` pins the Cairo construction only. Change
/// either and check the result against that vector by hand.
const APPROVAL_DOMAIN_NAME = "SupaSafe";
const APPROVAL_DOMAIN_VERSION = "1";

const APPROVAL_TYPES = {
  StarknetDomain: [
    { name: "name", type: "shortstring" },
    { name: "version", type: "shortstring" },
    { name: "chainId", type: "shortstring" },
    { name: "revision", type: "shortstring" },
  ],
  MultisigApproval: [
    { name: "Multisig", type: "ContractAddress" },
    { name: "Hash", type: "felt" },
  ],
} as const;

/// The typed data an owner's wallet signs to approve `hash` for `multisig`.
export function buildApprovalTypedData(
  multisig: string,
  hash: BigNumberish,
  chainId: string,
): TypedData {
  return {
    types: APPROVAL_TYPES as unknown as TypedData["types"],
    primaryType: "MultisigApproval",
    domain: {
      name: APPROVAL_DOMAIN_NAME,
      version: APPROVAL_DOMAIN_VERSION,
      chainId,
      revision: "1",
    },
    message: { Multisig: multisig, Hash: num.toHex(hash) },
  };
}

/// The message `_verify_threshold` checks a given owner's signature against.
///
/// Bound to the owner's own account address, because a wallet always binds typed data to the
/// account doing the signing — it cannot produce a hash bound to the multisig.
export function ownerApprovalHash(
  multisig: string,
  owner: string,
  hash: BigNumberish,
  chainId: string,
): string {
  return typedData.getMessageHash(
    buildApprovalTypedData(multisig, hash, chainId),
    owner,
  );
}

export interface OwnerSignature {
  ownerIndex: number;
  /// Raw wallet output for `buildApprovalTypedData`.
  signature: Signature;
}

/// Packs collected approvals into the contract's bundle encoding:
/// `[sig_count, owner_index, r, s, ...]`.
///
/// Sorted ascending because `_verify_threshold` rejects out-of-order or repeated indices as
/// malformed rather than merely insufficient.
export function packSignatureBundle(signatures: OwnerSignature[]): string[] {
  const sorted = [...signatures].sort((a, b) => a.ownerIndex - b.ownerIndex);

  const seen = new Set<number>();
  const bundle: string[] = [num.toHex(sorted.length)];

  for (const { ownerIndex, signature } of sorted) {
    if (seen.has(ownerIndex)) {
      throw new Error(`Owner ${ownerIndex} signed twice.`);
    }
    seen.add(ownerIndex);

    // The contract verifies raw ECDSA against a stored key, so anything an account wraps around
    // its signature is unusable. Fail here rather than let it silently miss the threshold.
    const [r, s] = stark.formatSignature(signature);
    if (r === undefined || s === undefined) {
      throw new Error(
        `Owner ${ownerIndex} produced a signature this multisig cannot use; ` +
          "it requires a bare [r, s].",
      );
    }
    bundle.push(num.toHex(ownerIndex), num.toHex(r), num.toHex(s));
  }

  return bundle;
}
