import { createEmptyRegistry } from "@starkware-libs/starknet-privacy-sdk";
import type { SignerInterface } from "starknet";
import type { MultisigProposal } from "@/lib/multisig-proposal-provider";
import { packSignatureBundle } from "@/lib/signing";
import { createMultisigPrivateTransfers } from "./multisig-private-transfers";
import { submitStrk20Relay } from "./relay";

type ExecuteMultisigStrk20ProposalParams = {
  proposal: MultisigProposal;
  viewingKey: bigint;
};

export async function executeMultisigStrk20Proposal({
  proposal,
  viewingKey,
}: ExecuteMultisigStrk20ProposalParams) {
  if (proposal.status !== "ready") {
    throw new Error("Collect the required approvals before executing.");
  }
  if (!proposal.proofInvocation) {
    throw new Error(
      "This proposal was created before Supasafe started storing its SDK invocation. Recreate it.",
    );
  }
  if (proposal.provingBlockId === undefined) {
    throw new Error(
      "This proposal was created before Supasafe pinned its proving block. Recreate it before executing.",
    );
  }

  const signature = packSignatureBundle(
    proposal.signatures.map((entry) => {
      const ownerIndex = proposal.owners.findIndex(
        (owner) => BigInt(owner) === BigInt(entry.owner),
      );
      if (ownerIndex === -1) {
        throw new Error("A proposal signature belongs to an unknown owner.");
      }
      return { ownerIndex, signature: entry.signature };
    }),
  );
  const transfers = createMultisigPrivateTransfers({
    multisigAddress: proposal.multisigAddress,
    viewingKey,
    signer: createStoredInvocationSigner(),
  });
  const { callAndProof } = await transfers.executeWithInvocation(
    {
      invocation: { ...proposal.proofInvocation, signature },
      registry: createEmptyRegistry(),
      warnings: [],
    },
    proposal.provingBlockId,
  );

  return submitStrk20Relay({ callAndProof });
}

function createStoredInvocationSigner(): SignerInterface {
  return {
    async signTransaction() {
      throw new Error("The stored SDK invocation is already signed.");
    },
    async getPubKey() {
      throw new Error("The stored SDK invocation is already signed.");
    },
    async signMessage() {
      throw new Error("The stored SDK invocation is already signed.");
    },
    async signDeclareTransaction() {
      throw new Error("The stored SDK invocation is already signed.");
    },
    async signDeployAccountTransaction() {
      throw new Error("The stored SDK invocation is already signed.");
    },
  };
}
