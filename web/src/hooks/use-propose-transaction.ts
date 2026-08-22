"use client";

import { useCallback, useState } from "react";
import type { TransactionKind } from "@/lib/multisig";

/** A transaction being proposed to the multisig's owners for signing. */
export interface TransactionProposal {
  kind: TransactionKind;
  /** Address of the multisig the proposal belongs to. */
  multisigAddress: string;
  /** Token contract address. */
  token: string;
  /** Human-entered amount, not yet scaled by decimals. */
  amount: string;
  /** Destination — required for withdraw and transfer, unused for deposit. */
  recipient?: string;
}

export interface UseProposeTransactionResult {
  propose: (proposal: TransactionProposal) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

/**
 * Submits a transaction proposal for the multisig's owners to sign.
 *
 * Stubbed. A real proposal is a SNIP-9 `OutsideExecution` over the pool calls,
 * hashed and circulated for owners to sign until the threshold is met, then
 * relayed via `execute_from_outside_v2` — which is why the account registers
 * `ISRC9_V2_ID`. Nothing here can produce those signatures yet.
 */
export function useProposeTransaction(): UseProposeTransactionResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const propose = useCallback(async (proposal: TransactionProposal) => {
    setIsPending(true);
    setError(null);
    try {
      // TODO: build the pool calls for `kind`, wrap them in an OutsideExecution,
      // and store the proposal for owners to sign.
      console.info("propose (stub)", proposal);
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proposal failed.");
    } finally {
      setIsPending(false);
    }
  }, []);

  return { propose, isPending, error };
}
