"use client";

import { createPrivateTransfers } from "@starkware-libs/starknet-privacy-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { constants, Signature } from "starknet";
import { indexerUrl, proverUrl } from "@/config/env";
import { networkConfig } from "@/config/network";
import type { MultisigDetail } from "@/lib/multisig";
import { logApprovalSignatureDiagnostics } from "@/lib/multisig-approval-diagnostics";
import { createMultisigProposalSigner } from "@/lib/multisig-proposal-signer";
import { buildProposal } from "./createProposal";
import { multisigProposalProvider } from "./provider";

export type CreateStrk20RegistrationProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
};

export async function createStrk20RegistrationProposal({
  multisig,
  owner,
  viewingKey,
  signApproval,
}: CreateStrk20RegistrationProposalParams) {
  if (!networkConfig.privacyPoolAddress) {
    throw new Error("No privacy pool is configured for this network.");
  }

  const ownerIndex = multisig.owners.findIndex(
    (entry) => BigInt(entry.address) === BigInt(owner),
  );
  if (ownerIndex === -1)
    throw new Error("Connected wallet is not a multisig owner.");

  const proposalSigner = createMultisigProposalSigner({
    multisigAddress: multisig.address,
    chainId: networkConfig.chainId,
    ownerIndex,
    signApproval,
  });
  const transfers = createPrivateTransfers({
    account: { address: multisig.address, signer: proposalSigner.signer },
    viewingKeyProvider: { getViewingKey: async () => viewingKey },
    provingProvider: {
      url: proverUrl,
      chainId: networkConfig.chainId as constants.StarknetChainId,
    },
    discoveryProvider: { url: indexerUrl },
    poolContractAddress: networkConfig.privacyPoolAddress,
  });

  // This asks the SDK to construct the exact `compile_actions` call. It does not prove or submit
  // anything yet; final proof generation waits until the saved proposal reaches threshold.
  const invocation = await transfers.build().register().createProofInvocation();
  const payload = proposalSigner.getPayload();
  const proposal = buildProposal({
    multisigAddress: multisig.address,
    owners: multisig.owners.map((entry) => entry.address),
    threshold: multisig.threshold,
    calls: payload.calls,
    display: {
      kind: "strk20-registration",
      title: "Activate STRK20",
      description: "Register this multisig's viewing key with the STRK20 pool.",
    },
  });

  if (proposal.hash !== payload.hash) {
    throw new Error("SDK call-set hash did not match the proposal hash.");
  }

  logApprovalSignatureDiagnostics({
    multisig,
    owner,
    callSetHash: BigInt(payload.hash),
    signature: payload.signature,
    calls: payload.calls,
    chainId: networkConfig.chainId,
  });

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

export function useCreateStrk20RegistrationProposal() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createStrk20RegistrationProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
    },
  });

  return {
    createStrk20RegistrationProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
