"use client";

import { sepolia } from "@starknetfoundation/starknet-start-chains";
import { jsonRpcProvider } from "@starknetfoundation/starknet-start-providers";
import { StarknetConfig } from "@starknetfoundation/starknet-start-react";
import type { ReactNode } from "react";
import { isDevnet } from "@/config/env";
import { devnetChain, networkConfig } from "@/config/network";

const chains = [isDevnet ? devnetChain : sepolia];
const provider = jsonRpcProvider({
  rpc: () => ({ nodeUrl: networkConfig.rpcUrl }),
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StarknetConfig chains={chains} provider={provider}>
      {children}
    </StarknetConfig>
  );
}
