import type { ProofInvocation } from "@starkware-libs/starknet-privacy-sdk";

export type MultisigProposalStatus = "pending" | "ready" | "executed";

export type MultisigProposalCall = {
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
};

export type MultisigProposalSignature = {
  owner: string;
  signature: string[];
  signedAt: number;
};

export type MultisigProposalDisplay = {
  kind: string;
  title: string;
  description: string;
  token?: { symbol: string; address: string };
  amount?: string;
  recipient?: string;
};

export type MultisigProposal = {
  hash: string;
  multisigAddress: string;
  owners: string[];
  threshold: number;
  calls: MultisigProposalCall[];
  additionalData: string[];
  /// Registration includes SDK-generated randomness, so retain the exact invocation owners approved.
  proofInvocation?: ProofInvocation;
  display: MultisigProposalDisplay;
  signatures: MultisigProposalSignature[];
  status: MultisigProposalStatus;
  createdAt: number;
  updatedAt: number;
};

export type MultisigProposalSummary = Pick<
  MultisigProposal,
  | "hash"
  | "multisigAddress"
  | "threshold"
  | "status"
  | "display"
  | "createdAt"
  | "updatedAt"
> & {
  signatureCount: number;
};

export interface MultisigProposalProvider {
  getOwnerProposals(input: {
    multisigAddress: string;
    owner: string;
  }): Promise<MultisigProposalSummary[]>;
  getProposal(hash: string): Promise<MultisigProposal | null>;
  saveProposal(proposal: MultisigProposal): Promise<void>;
  saveSignature(input: {
    proposalHash: string;
    signature: MultisigProposalSignature;
  }): Promise<void>;
  markExecuted(proposalHash: string): Promise<void>;
}

const STORAGE_KEY = "supasafe:multisig-proposals:v1";

function normalizeAddress(address: string) {
  return `0x${BigInt(address.trim()).toString(16)}`;
}

function normalizeProposal(proposal: MultisigProposal): MultisigProposal {
  if (!proposal.hash) throw new Error("Proposal hash is required.");
  if (!proposal.display?.title || !proposal.display.description) {
    throw new Error("Proposal display details are required.");
  }
  if (!Number.isInteger(proposal.threshold) || proposal.threshold < 1) {
    throw new Error("Proposal threshold must be a positive integer.");
  }

  const owners = proposal.owners.map(normalizeAddress);
  if (proposal.threshold > owners.length) {
    throw new Error("Proposal threshold cannot exceed the owner count.");
  }

  return {
    ...proposal,
    multisigAddress: normalizeAddress(proposal.multisigAddress),
    owners,
    calls: proposal.calls.map((call) => ({
      ...call,
      contractAddress: normalizeAddress(call.contractAddress),
      calldata: [...call.calldata],
    })),
    additionalData: [...proposal.additionalData],
    ...(proposal.proofInvocation
      ? {
          proofInvocation: {
            ...proposal.proofInvocation,
            calldata: [...proposal.proofInvocation.calldata],
            signature: [...proposal.proofInvocation.signature],
          },
        }
      : {}),
    display: {
      ...proposal.display,
      ...(proposal.display.token
        ? {
            token: {
              ...proposal.display.token,
              address: normalizeAddress(proposal.display.token.address),
            },
          }
        : {}),
      ...(proposal.display.recipient
        ? { recipient: normalizeAddress(proposal.display.recipient) }
        : {}),
    },
    signatures: proposal.signatures.map((signature) => ({
      ...signature,
      owner: normalizeAddress(signature.owner),
      signature: [...signature.signature],
    })),
  };
}

function deserializeProposals(value: string | null): MultisigProposal[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed))
      throw new Error("Proposal storage is malformed.");
    return parsed.map((proposal) =>
      normalizeProposal(proposal as MultisigProposal),
    );
  } catch (error) {
    throw new Error("Could not read multisig proposal storage.", {
      cause: error,
    });
  }
}

export class LocalStorageMultisigProposalProvider
  implements MultisigProposalProvider
{
  constructor(
    private readonly storage: Storage | undefined = typeof window ===
    "undefined"
      ? undefined
      : window.localStorage,
  ) {}

  async getOwnerProposals({
    multisigAddress,
    owner,
  }: {
    multisigAddress: string;
    owner: string;
  }): Promise<MultisigProposalSummary[]> {
    const multisig = normalizeAddress(multisigAddress);
    const normalizedOwner = normalizeAddress(owner);

    return this.read()
      .filter(
        (proposal) =>
          proposal.multisigAddress === multisig &&
          proposal.owners.includes(normalizedOwner) &&
          proposal.status !== "executed",
      )
      .map((proposal) => ({
        hash: proposal.hash,
        multisigAddress: proposal.multisigAddress,
        threshold: proposal.threshold,
        status: proposal.status,
        display: proposal.display,
        createdAt: proposal.createdAt,
        updatedAt: proposal.updatedAt,
        signatureCount: proposal.signatures.length,
      }))
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  async getProposal(hash: string): Promise<MultisigProposal | null> {
    return this.read().find((proposal) => proposal.hash === hash) ?? null;
  }

  async saveProposal(proposal: MultisigProposal): Promise<void> {
    const normalized = normalizeProposal(proposal);
    const proposals = this.read();
    const index = proposals.findIndex(
      (entry) => entry.hash === normalized.hash,
    );

    if (index === -1) {
      proposals.push(normalized);
    } else {
      proposals[index] = normalized;
    }

    this.write(proposals);
  }

  async saveSignature({
    proposalHash,
    signature,
  }: {
    proposalHash: string;
    signature: MultisigProposalSignature;
  }): Promise<void> {
    const proposals = this.read();
    const proposal = proposals.find((entry) => entry.hash === proposalHash);
    if (!proposal) throw new Error("Proposal was not found.");

    const normalizedSignature = {
      ...signature,
      owner: normalizeAddress(signature.owner),
      signature: [...signature.signature],
    };
    if (!proposal.owners.includes(normalizedSignature.owner)) {
      throw new Error("Signature owner is not part of this proposal.");
    }

    const index = proposal.signatures.findIndex(
      (entry) => entry.owner === normalizedSignature.owner,
    );
    if (index === -1) {
      proposal.signatures.push(normalizedSignature);
    } else {
      proposal.signatures[index] = normalizedSignature;
    }
    if (proposal.status !== "executed") {
      proposal.status =
        proposal.signatures.length >= proposal.threshold ? "ready" : "pending";
    }
    proposal.updatedAt = Date.now();

    this.write(proposals);
  }

  async markExecuted(proposalHash: string): Promise<void> {
    const proposals = this.read();
    const proposal = proposals.find((entry) => entry.hash === proposalHash);
    if (!proposal) throw new Error("Proposal was not found.");
    if (proposal.signatures.length < proposal.threshold) {
      throw new Error("Proposal does not have enough approvals.");
    }

    proposal.status = "executed";
    proposal.updatedAt = Date.now();
    this.write(proposals);
  }

  private read() {
    return deserializeProposals(this.storage?.getItem(STORAGE_KEY) ?? null);
  }

  private write(proposals: MultisigProposal[]) {
    if (!this.storage) {
      throw new Error("Multisig proposal storage is unavailable.");
    }
    this.storage.setItem(STORAGE_KEY, JSON.stringify(proposals));
  }
}
