"use client";

import { GetStarknetProvider } from "@starknet-io/get-starknet-ui";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <GetStarknetProvider>{children}</GetStarknetProvider>;
}
