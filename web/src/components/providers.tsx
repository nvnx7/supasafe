"use client";

import { GetStarknetProvider } from "@starknet-io/get-starknet-ui";
import type { ReactNode } from "react";

/**
 * Client boundary for app-wide providers.
 *
 * `@starknet-io/get-starknet-ui` ships without a `"use client"` directive, so it
 * cannot be imported from a server component. Everything that needs wallet state
 * must sit below this boundary.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <GetStarknetProvider>{children}</GetStarknetProvider>;
}
