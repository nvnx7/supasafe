import { endurConfig } from "@/config/dapp";

export function getEndurConfig() {
  const { anonymizerAddress, strkTokenAddress, xStrkTokenAddress } =
    endurConfig;

  if (!anonymizerAddress || !strkTokenAddress || !xStrkTokenAddress) {
    throw new Error("Endur is not configured for this network.");
  }

  return { anonymizerAddress, strkTokenAddress, xStrkTokenAddress };
}
