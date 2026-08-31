"use client";

import { mainnet, sepolia } from "@starknetfoundation/starknet-start-chains";
import { jsonRpcProvider } from "@starknetfoundation/starknet-start-providers";
import { StarknetConfig } from "@starknetfoundation/starknet-start-react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import { isDevnet, isMainnet } from "@/config/env";
import { devnetChain, networkConfig } from "@/config/network";

const chains = [isDevnet ? devnetChain : isMainnet ? mainnet : sepolia];
const provider = jsonRpcProvider({
  rpc: () => ({ nodeUrl: networkConfig.rpcUrl }),
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StarknetConfig chains={chains} provider={provider}>
      {children}
      <Toaster />
    </StarknetConfig>
  );
}
