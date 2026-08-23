"use client";

import { useCallback, useState } from "react";
import { networkConfig } from "@/config/network";
import type { MultisigDraft } from "@/lib/multisig";

export interface UseCreateMultisigResult {
  createMultisig: (draft: MultisigDraft) => Promise<void>;
  isPending: boolean;
  error: string | null;
}

// Stubbed: deploying needs a signer that emits the account's
// [sig_count, owner_index, r, s, ...] bundle, which doesn't exist client-side yet.
export function useCreateMultisig(): UseCreateMultisigResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMultisig = useCallback(async (draft: MultisigDraft) => {
    setIsPending(true);
    setError(null);
    try {
      // TODO: deploy the class via the UDC with
      // `CallData.compile({ owners, threshold })` and return the address.
      console.info("createMultisig (stub)", {
        ...draft,
        classHash: networkConfig.multisigClassHash,
      });
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Deployment failed.");
    } finally {
      setIsPending(false);
    }
  }, []);

  return { createMultisig, isPending, error };
}
