import axios, { isAxiosError } from "axios";

import type {
  MultisigProposal,
  MultisigProposalProvider,
  MultisigProposalSignature,
  MultisigProposalSummary,
} from "./multisig-proposal-provider";

type ProposalsResponse = {
  proposals: MultisigProposal[];
};

type ProposalResponse = {
  proposal: MultisigProposal | null;
};

export class HttpMultisigProposalProvider implements MultisigProposalProvider {
  constructor(private readonly chainId: string) {}

  async getOwnerProposals({
    multisigAddress,
    owner,
  }: {
    multisigAddress: string;
    owner: string;
  }): Promise<MultisigProposalSummary[]> {
    try {
      const { data } = await axios.get<ProposalsResponse>("/api/proposals", {
        params: {
          chainId: this.chainId,
          multisigAddress,
          owner,
        },
      });
      return data.proposals.map(toSummary);
    } catch (error) {
      throw toProposalApiError(error);
    }
  }

  async getProposal(hash: string): Promise<MultisigProposal | null> {
    try {
      const { data } = await axios.get<ProposalResponse>(
        `/api/proposals/${encodeURIComponent(hash)}`,
        { params: { chainId: this.chainId } },
      );
      return data.proposal;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw toProposalApiError(error);
    }
  }

  async saveProposal(proposal: MultisigProposal): Promise<void> {
    try {
      await axios.post<ProposalResponse>("/api/proposals", {
        chainId: this.chainId,
        proposal,
      });
    } catch (error) {
      throw toProposalApiError(error);
    }
  }

  async saveSignature({
    proposalHash,
    signature,
  }: {
    proposalHash: string;
    signature: MultisigProposalSignature;
  }): Promise<void> {
    try {
      await axios.post<ProposalResponse>(
        `/api/proposals/${encodeURIComponent(proposalHash)}/signatures`,
        { chainId: this.chainId, signature },
      );
    } catch (error) {
      throw toProposalApiError(error);
    }
  }

  async markExecuted(proposalHash: string): Promise<void> {
    try {
      await axios.post<ProposalResponse>(
        `/api/proposals/${encodeURIComponent(proposalHash)}/execute`,
        { chainId: this.chainId },
      );
    } catch (error) {
      throw toProposalApiError(error);
    }
  }
}

function toSummary(proposal: MultisigProposal): MultisigProposalSummary {
  return {
    hash: proposal.hash,
    multisigAddress: proposal.multisigAddress,
    threshold: proposal.threshold,
    status: proposal.status,
    display: proposal.display,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    signatureCount: proposal.signatures.length,
  };
}

function toProposalApiError(error: unknown): Error {
  if (isAxiosError<{ error?: string }>(error)) {
    return new Error(error.response?.data?.error ?? error.message);
  }

  return error instanceof Error
    ? error
    : new Error("Proposal API request failed.");
}
