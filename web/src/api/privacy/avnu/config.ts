import type { AvnuOptions } from "@avnu/avnu-sdk";
import { avnuConfig } from "@/config/dapp";

export function getAvnuOptions(): AvnuOptions {
  if (!avnuConfig.baseUrl || !avnuConfig.paymasterBaseUrl) {
    throw new Error("AVNU private swaps are not configured for this network.");
  }

  return {
    baseUrl: avnuConfig.baseUrl,
    paymasterBaseUrl: avnuConfig.paymasterBaseUrl,
  };
}
