"use client";

import { useCallback, useState } from "react";
import { networkConfig } from "@/config/network";
import type { TransactionKind } from "@/lib/multisig";

export interface TransactionProposal {
  kind: TransactionKind;
  multisigAddress: string;
  token: string;
  // Human-entered, not yet scaled by decimals.
  amount: string;
  // Required for withdraw and transfer, unused for deposit.
  recipient?: string;
}

export interface UseProposeTransactionResult {
  propose: (proposal: TransactionProposal) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

// Stubbed: a real proposal is a SNIP-9 OutsideExecution over the pool calls,
// signed by owners until the threshold is met, then relayed via
// execute_from_outside_v2.
export function useProposeTransaction(): UseProposeTransactionResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const propose = useCallback(async (proposal: TransactionProposal) => {
    setIsPending(true);
    setError(null);
    try {
      // TODO: build the pool calls for `kind` against the configured pool,
      // wrap them in an OutsideExecution, and store the proposal for signing.
      console.info("propose (stub)", {
        ...proposal,
        pool: networkConfig.privacyPoolAddress,
      });
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proposal failed.");
    } finally {
      setIsPending(false);
    }
  }, []);

  return { propose, isPending, error };
}
