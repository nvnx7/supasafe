import { MAX_VIEWING_KEY } from "@starkware-libs/starknet-privacy-sdk";
import { derivePublicKey } from "@starkware-libs/starknet-privacy-sdk/utils";
import { ec, hash, num, type Signature, stark, type TypedData } from "starknet";

const SUPASAFE_VIEW_KEY_DOMAIN_NAME = "SupaSafe";
const SUPASAFE_VIEW_KEY_DOMAIN_VERSION = "1";
const SUPASAFE_VIEW_KEY_STORAGE_PREFIX = "supasafe:view-key:v1";

const SUPASAFE_VIEW_KEY_TYPES = {
  StarknetDomain: [
    { name: "name", type: "shortstring" },
    { name: "version", type: "shortstring" },
    { name: "chainId", type: "shortstring" },
    { name: "revision", type: "shortstring" },
  ],
  SupasafeViewKey: [
    { name: "Factory", type: "ContractAddress" },
    { name: "Purpose", type: "shortstring" },
  ],
} as const;

export type SupasafeViewKey = {
  privateKey: bigint;
  publicKey: bigint;
};

type SupasafeViewKeyContext = {
  owner: string;
  chainId: string;
  factoryAddress: string;
};

export function buildSupasafeViewKeyTypedData(
  chainId: string,
  factoryAddress: string,
): TypedData {
  return {
    types: SUPASAFE_VIEW_KEY_TYPES as unknown as TypedData["types"],
    primaryType: "SupasafeViewKey",
    domain: {
      name: SUPASAFE_VIEW_KEY_DOMAIN_NAME,
      version: SUPASAFE_VIEW_KEY_DOMAIN_VERSION,
      chainId,
      revision: "1",
    },
    message: {
      Factory: num.toHex(factoryAddress),
      Purpose: "view_key",
    },
  };
}

// Mirrors the privacy demo's signature folding so the resulting private key is valid for
// Stark curve encryption and remains in the canonical x-only public-key range.
export function deriveSupasafeViewKey(signature: Signature): SupasafeViewKey {
  const [r, s] = stark.formatSignature(signature);
  if (r === undefined || s === undefined) {
    throw new Error("Wallet returned an invalid signature.");
  }

  const folded = BigInt(hash.computePoseidonHashOnElements([r, s]));
  const order = ec.starkCurve.CURVE.n;
  const reduced = folded % order;
  const privateKey =
    reduced === 0n ? 1n : reduced > MAX_VIEWING_KEY ? order - reduced : reduced;

  return { privateKey, publicKey: derivePublicKey(privateKey) };
}

function storageKey({
  owner,
  chainId,
  factoryAddress,
}: SupasafeViewKeyContext) {
  return [
    SUPASAFE_VIEW_KEY_STORAGE_PREFIX,
    num.toHex(chainId),
    num.toHex(factoryAddress),
    num.toHex(owner),
  ].join(":");
}

export function loadSupasafeViewKey(
  context: SupasafeViewKeyContext,
): SupasafeViewKey | null {
  if (typeof window === "undefined") return null;

  try {
    const privateKey = BigInt(
      window.localStorage.getItem(storageKey(context)) ?? "0",
    );
    if (privateKey <= 0n || privateKey > MAX_VIEWING_KEY) return null;
    return { privateKey, publicKey: derivePublicKey(privateKey) };
  } catch {
    return null;
  }
}

export function saveSupasafeViewKey(
  context: SupasafeViewKeyContext,
  viewKey: SupasafeViewKey,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey(context),
    num.toHex(viewKey.privateKey),
  );
}
