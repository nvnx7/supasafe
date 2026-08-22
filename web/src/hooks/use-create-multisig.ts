"use client";

import { useCallback, useState } from "react";
import type { MultisigDraft } from "@/lib/multisig";

export interface UseCreateMultisigResult {
  /** Deploys a multisig from the given draft. */
  createMultisig: (draft: MultisigDraft) => Promise<void>;
  /** Whether a deployment is in flight. */
  isPending: boolean;
  /** Failure message from the last attempt, if any. */
  error: string | null;
}

/**
 * Deploys a new multisig account.
 *
 * The deployment itself is stubbed. Wiring it up needs a signer that emits the
 * account's `[sig_count, owner_index, r, s, ...]` bundle encoding, which does
 * not exist on the client yet; see `contracts/scripts/deploy.ts` for the
 * equivalent declare-then-deploy flow against a node.
 */
export function useCreateMultisig(): UseCreateMultisigResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMultisig = useCallback(async (draft: MultisigDraft) => {
    setIsPending(true);
    setError(null);
    try {
      // TODO: declare `PrivateMultisigAccount` if needed, then deploy it with
      // `CallData.compile({ owners, threshold })` and return the address.
      console.info("createMultisig (stub)", draft);
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Deployment failed.");
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createMultisig, isPending, error };
}
