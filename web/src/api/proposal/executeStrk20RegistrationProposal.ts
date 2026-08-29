"use client";

import {
  useProvider,
  useSendTransaction,
} from "@starknetfoundation/starknet-start-react";
import {
  createEmptyRegistry,
  createPrivateTransfers,
} from "@starkware-libs/starknet-privacy-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type constants, num } from "starknet";
import { getMultisig, isMultisigSignatureValid } from "@/api/multisig";
import { indexerUrl, proverUrl } from "@/config/env";
import { networkConfig } from "@/config/network";
import { logApprovalPreflightDiagnostics } from "@/lib/multisig-approval-diagnostics";
import type { MultisigProposal } from "@/lib/multisig-proposal-provider";
import { packSignatureBundle } from "@/lib/signing";
import { multisigProposalProvider } from "./provider";

export type ExecuteStrk20RegistrationProposalParams = {
  proposal: MultisigProposal;
  viewingKey: bigint;
};

export function useExecuteStrk20RegistrationProposal() {
  const { provider } = useProvider();
  const { sendAsync } = useSendTransaction({});
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      proposal,
      viewingKey,
    }: ExecuteStrk20RegistrationProposalParams) => {
      if (!networkConfig.privacyPoolAddress) {
        throw new Error("No privacy pool is configured for this network.");
      }
      if (proposal.display.kind !== "strk20-registration") {
        throw new Error("This proposal type cannot be executed yet.");
      }
      if (proposal.status !== "ready") {
        throw new Error("Collect the required approvals before executing.");
      }
      if (!proposal.proofInvocation) {
        throw new Error(
          "This proposal was created before Supasafe started storing its SDK invocation. Recreate it.",
        );
      }

      const transfers = createPrivateTransfers({
        account: {
          address: proposal.multisigAddress,
          signer: {
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
          },
        },
        viewingKeyProvider: { getViewingKey: async () => viewingKey },
        provingProvider: {
          url: proverUrl,
          chainId: networkConfig.chainId as constants.StarknetChainId,
        },
        discoveryProvider: { url: indexerUrl },
        poolContractAddress: networkConfig.privacyPoolAddress,
      });
      const signature = packSignatureBundle(
        proposal.signatures.map((entry) => {
          const ownerIndex = proposal.owners.findIndex(
            (owner) => BigInt(owner) === BigInt(entry.owner),
          );
          if (ownerIndex === -1) {
            throw new Error(
              "A proposal signature belongs to an unknown owner.",
            );
          }
          return { ownerIndex, signature: entry.signature };
        }),
      );
      const signatureIsValid = await isMultisigSignatureValid(
        provider,
        proposal.multisigAddress,
        proposal.calls,
        signature,
        proposal.additionalData,
      );
      const multisig = await getMultisig(provider, proposal.multisigAddress);
      logApprovalPreflightDiagnostics({
        multisig,
        proposal,
        packedSignature: signature,
        isValid: signatureIsValid,
        chainId: networkConfig.chainId,
      });
      if (!signatureIsValid) {
        console.warn(
          "Supasafe approval preflight did not validate, continuing with the SDK's exact invocation.",
        );
      }
      const { callAndProof } = await transfers.executeWithInvocation(
        {
          invocation: { ...proposal.proofInvocation, signature },
          registry: createEmptyRegistry(),
          warnings: [],
        },
        "latest",
      );
      if (!Array.isArray(callAndProof.call.calldata)) {
        throw new Error("SDK returned a STRK20 call with non-array calldata.");
      }
      const calldata = callAndProof.call.calldata as string[];
      const call = {
        contractAddress: num.toHex(callAndProof.call.contractAddress),
        entrypoint: callAndProof.call.entrypoint,
        calldata: calldata.map(num.toHex),
      };
      const proof = {
        data: callAndProof.proof.data,
        output: callAndProof.proof.output.map(num.toHex),
        proof_facts: callAndProof.proof.proofFacts.map(num.toHex),
      };
      console.info("Supasafe STRK20 submission metadata", {
        call: {
          contractAddress: call.contractAddress,
          entrypoint: call.entrypoint,
          calldataLength: call.calldata.length,
        },
        proofDataLength: proof.data.length,
        proofOutputLength: proof.output.length,
        proofFactsCount: proof.proof_facts.length,
      });
      const transaction = await sendAsync({
        calls: [call],
        proof,
      });

      await provider.waitForTransaction(transaction.transaction_hash);
      await multisigProposalProvider.markExecuted(proposal.hash);
      return transaction;
    },
    onSuccess: async (_transaction, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["multisigProposals"] });
      await queryClient.invalidateQueries({
        queryKey: ["multisigProposal", variables.proposal.hash],
      });
    },
  });

  return {
    executeStrk20RegistrationProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
