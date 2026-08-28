import {
  type BigNumberish,
  ec,
  hash,
  num,
  type Signature,
  shortString,
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

const poseidon = ec.starkCurve.poseidonHashMany;
const STARKNET_MESSAGE = BigInt(
  shortString.encodeShortString("StarkNet Message"),
);

// These hashes are pinned to the exact structures used by `contracts/src/hashing.cairo` and the
// STRK20 pool. Do not replace this with typedData.getMessageHash: the CallSet domain version is
// a numeric felt on-chain, while standard typed-data encoding treats it as a shortstring.
const STARKNET_DOMAIN_TYPE_HASH =
  0x1ff2f602e42168014d405a94f75e8a93d640751d71d16311266e140d8b0a210n;
const CALL_TYPE_HASH =
  0x3635c7f2a7ba93844c0d064e18e487f35ab90f7c39d00f186a781fc3f0c2ca9n;
const CALL_SET_TYPE_HASH =
  0x308b7462f924efba15fc992e6827eb3a748fcc79f091914156756437fa22909n;
const CALL_SET_DOMAIN_NAME = BigInt(shortString.encodeShortString("CallSet"));

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

export type MultisigCall = {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
};

function toFelt(value: BigNumberish) {
  return num.toBigInt(value);
}

function hashCall(call: MultisigCall) {
  return poseidon([
    CALL_TYPE_HASH,
    toFelt(call.contractAddress),
    toFelt(hash.getSelectorFromName(call.entrypoint)),
    poseidon(call.calldata.map(toFelt)),
  ]);
}

/// Mirrors `compute_call_set_hash` in `contracts/src/hashing.cairo` and the STRK20 pool.
/// This value is the proposal ID and the hash owners approve through `ownerApprovalHash`.
export function computeCallSetHash(
  multisig: BigNumberish,
  calls: MultisigCall[],
  chainId: BigNumberish,
  additionalData: BigNumberish[] = [],
) {
  const domainHash = poseidon([
    STARKNET_DOMAIN_TYPE_HASH,
    CALL_SET_DOMAIN_NAME,
    1n,
    toFelt(chainId),
    1n,
  ]);
  const callSetHash = poseidon([
    CALL_SET_TYPE_HASH,
    poseidon(calls.map(hashCall)),
    poseidon(additionalData.map(toFelt)),
  ]);

  return poseidon([
    STARKNET_MESSAGE,
    domainHash,
    toFelt(multisig),
    callSetHash,
  ]);
}

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
