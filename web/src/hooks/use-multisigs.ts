"use client";

import { useConnect } from "@starknet-io/get-starknet-ui";
import type { MultisigSummary } from "@/lib/multisig";

export interface UseMultisigsResult {
  isConnected: boolean;
  multisigs: MultisigSummary[];
  isLoading: boolean;
}

// Returns empty until there's an indexer over OwnersUpdated events (or a local
// registry of deployments) to resolve which multisigs an owner belongs to.
export function useMultisigs(): UseMultisigsResult {
  const { connected } = useConnect();
  const isConnected = Boolean(connected);

  return {
    isConnected,
    multisigs: [],
    isLoading: false,
  };
}
