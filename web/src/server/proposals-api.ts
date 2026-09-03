import { constants } from "starknet";

import type {
  MultisigProposal,
  MultisigProposalSignature,
} from "@/lib/multisig-proposal-provider";

const SUPPORTED_CHAIN_IDS = new Set<string>([
  constants.StarknetChainId.SN_SEPOLIA,
  constants.StarknetChainId.SN_MAIN,
]);

export function getChainId(value: string | null) {
  if (!value || !SUPPORTED_CHAIN_IDS.has(value)) {
    throw new Error("A supported Starknet chainId is required.");
  }

  return value;
}

export function getRouteError(error: unknown) {
  if (error instanceof Error) {
    const isClientError =
      error.message.includes("required") ||
      error.message.includes("not part of") ||
      error.message.includes("not found") ||
      error.message.includes("enough approvals");
    return {
      error: error.message,
      status: isClientError ? 400 : 500,
    };
  }

  return { error: "Proposal request failed.", status: 500 };
}

export function isProposal(value: unknown): value is MultisigProposal {
  if (!isRecord(value)) return false;

  return (
    typeof value.hash === "string" &&
    typeof value.multisigAddress === "string" &&
    Array.isArray(value.owners) &&
    value.owners.every((owner) => typeof owner === "string") &&
    typeof value.threshold === "number" &&
    Number.isInteger(value.threshold) &&
    value.threshold > 0 &&
    Array.isArray(value.calls) &&
    Array.isArray(value.additionalData) &&
    isRecord(value.display) &&
    Array.isArray(value.signatures) &&
    (value.status === "pending" ||
      value.status === "ready" ||
      value.status === "executed")
  );
}

export function isProposalSignature(
  value: unknown,
): value is MultisigProposalSignature {
  return (
    isRecord(value) &&
    typeof value.owner === "string" &&
    Array.isArray(value.signature) &&
    value.signature.every((part) => typeof part === "string") &&
    Number.isFinite(value.signedAt)
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
