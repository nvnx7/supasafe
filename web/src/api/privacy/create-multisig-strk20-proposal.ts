import type { ProofInvocationResult } from "@starkware-libs/starknet-privacy-sdk";
import type { Signature } from "starknet";
import { buildProposal } from "@/api/proposal/createProposal";
import { multisigProposalProvider } from "@/api/proposal/provider";
import { networkConfig } from "@/config/network";
import type { MultisigDetail } from "@/lib/multisig";
import type {
  MultisigProposal,
  MultisigProposalDisplay,
} from "@/lib/multisig-proposal-provider";
import { createMultisigProposalSigner } from "@/lib/multisig-proposal-signer";
import { createMultisigPrivateTransfers } from "./multisig-private-transfers";

type CreateMultisigStrk20ProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  display: MultisigProposalDisplay;
  buildInvocation: (
    transfers: ReturnType<typeof createMultisigPrivateTransfers>,
  ) => Promise<ProofInvocationResult>;
};

export async function createMultisigStrk20Proposal({
  multisig,
  owner,
  viewingKey,
  signApproval,
  display,
  buildInvocation,
}: CreateMultisigStrk20ProposalParams): Promise<MultisigProposal> {
  const ownerIndex = multisig.owners.findIndex(
    (entry) => BigInt(entry.address) === BigInt(owner),
  );
  if (ownerIndex === -1) {
    throw new Error("Connected wallet is not a multisig owner.");
  }

  const proposalSigner = createMultisigProposalSigner({
    multisigAddress: multisig.address,
    chainId: networkConfig.chainId,
    ownerIndex,
    signApproval,
  });
  const transfers = createMultisigPrivateTransfers({
    multisigAddress: multisig.address,
    viewingKey,
    signer: proposalSigner.signer,
  });
  const invocation = await buildInvocation(transfers);
  const payload = proposalSigner.getPayload();
  const proposal = buildProposal({
    multisigAddress: multisig.address,
    owners: multisig.owners.map((entry) => entry.address),
    threshold: multisig.threshold,
    calls: payload.calls,
    display,
  });

  if (proposal.hash !== payload.hash) {
    throw new Error("SDK call-set hash did not match the proposal hash.");
  }

  proposal.signatures = [
    {
      owner,
      signature: payload.signature,
      signedAt: Date.now(),
    },
  ];
  proposal.proofInvocation = invocation.invocation;
  proposal.status = multisig.threshold === 1 ? "ready" : "pending";
  await multisigProposalProvider.saveProposal(proposal);
  return proposal;
}
