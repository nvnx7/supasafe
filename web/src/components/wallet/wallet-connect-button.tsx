"use client";

import { WalletConnectModal } from "@starknet-io/get-starknet-ui";

/**
 * Connect-wallet entry point. The modal handles wallet discovery, icons and
 * recall of the last wallet used with this dapp, so there is nothing to wire up
 * here beyond placing it.
 */
export function WalletConnectButton() {
  return <WalletConnectModal />;
}
