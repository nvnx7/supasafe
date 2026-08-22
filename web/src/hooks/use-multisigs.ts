"use client";

import { useConnect } from "@starknet-io/get-starknet-ui";
import type { MultisigSummary } from "@/lib/multisig";

export interface UseMultisigsResult {
  /** Whether a wallet is currently connected. */
  isConnected: boolean;
  /** Multisigs the connected wallet owns. Empty while disconnected. */
  multisigs: MultisigSummary[];
  /** Whether the list is still being resolved. */
  isLoading: boolean;
}

/**
 * Multisigs controlled by the connected wallet.
 *
 * Components read wallet state through this hook rather than receiving it as
 * props, so nothing has to be threaded down from the page.
 *
 * The lookup itself is not implemented yet: resolving which multisigs an owner
 * belongs to needs either an indexer over the account's `OwnersUpdated` events
 * or a locally persisted registry of deployments. Until then this reports an
 * empty set so the UI renders its real empty state.
 */
export function useMultisigs(): UseMultisigsResult {
  const { connected } = useConnect();
  const isConnected = Boolean(connected);

  return {
    isConnected,
    multisigs: [],
    isLoading: false,
  };
}
