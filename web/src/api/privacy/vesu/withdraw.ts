"use client";

import { useProvider } from "@starknetfoundation/starknet-start-react";
import { Open } from "@starkware-libs/starknet-privacy-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProviderInterface, Signature } from "starknet";
import { proposalQueryKeys } from "@/api/proposal/query-keys";
import type { MultisigDetail } from "@/lib/multisig";
import { createMultisigStrk20Proposal } from "../create-multisig-strk20-proposal";
import { getVesuAnonymizerAddress, getVesuVaultByVToken } from "./config";
import { previewVesuRedeem } from "./preview-redeem";

export type CreateMultisigVesuWithdrawProposalParams = {
  multisig: MultisigDetail;
  owner: string;
  viewingKey: bigint;
  provingBlockId: number;
  signApproval: (callSetHash: bigint) => Promise<Signature>;
  vTokenAddress: string;
  vTokenSymbol: string;
  underlyingTokenSymbol: string;
  shares: bigint;
};

export async function createMultisigVesuWithdrawProposal(
  provider: ProviderInterface,
  {
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    vTokenAddress,
    vTokenSymbol,
    underlyingTokenSymbol,
    shares,
  }: CreateMultisigVesuWithdrawProposalParams,
) {
  if (shares <= 0n) {
    throw new Error("Vesu withdrawal needs a positive share amount.");
  }

  const anonymizerAddress = getVesuAnonymizerAddress();
  const vault = getVesuVaultByVToken(vTokenAddress);
  const assets = await previewVesuRedeem(provider, vTokenAddress, shares);

  return createMultisigStrk20Proposal({
    multisig,
    owner,
    viewingKey,
    provingBlockId,
    signApproval,
    display: {
      kind: "vesu-withdraw",
      title: `Withdraw ${vTokenSymbol} from Vesu`,
      description: "Redeem this multisig's private Vesu position.",
      token: { symbol: vTokenSymbol, address: vTokenAddress },
      amount: shares.toString(),
      outputToken: {
        symbol: underlyingTokenSymbol,
        address: vault.underlyingTokenAddress,
      },
    },
    buildInvocation: (transfers) =>
      transfers
        .build({
          autoDiscover: { notes: "refresh", channels: "refresh" },
          autoSelectNotes: "naive",
          autoSetup: true,
          provingBlockId,
        })
        .surplusTo(multisig.address)
        .with(vTokenAddress, (operations) =>
          operations.withdraw({ recipient: anonymizerAddress, amount: shares }),
        )
        .surplusTo(multisig.address, false)
        .with(vault.underlyingTokenAddress, (operations) =>
          operations.transfer({ recipient: multisig.address, amount: Open }),
        )
        .invoke(({ openNotes }) => {
          const outputNote = openNotes[0];
          if (!outputNote) {
            throw new Error(
              "Vesu withdrawal did not create an underlying note.",
            );
          }

          return {
            contractAddress: anonymizerAddress,
            calldata: [
              1n,
              vTokenAddress,
              vault.underlyingTokenAddress,
              assets,
              0n,
              outputNote.noteId,
            ],
          };
        })
        .createProofInvocation(),
  });
}

export function useCreateMultisigVesuWithdrawProposal() {
  const { provider } = useProvider();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (params: CreateMultisigVesuWithdrawProposalParams) =>
      createMultisigVesuWithdrawProposal(provider, params),
    onSuccess: async (proposal) => {
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.lists,
      });
      await queryClient.invalidateQueries({
        queryKey: proposalQueryKeys.detail(proposal.hash),
      });
    },
  });

  return {
    createMultisigVesuWithdrawProposalAsync: mutation.mutateAsync,
    ...mutation,
  };
}
